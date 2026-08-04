'use client';
import { useState, useRef, useEffect, useCallback } from 'react';
import Script from 'next/script';
import { MessageCircle, X, Send } from 'lucide-react';

type Locale = 'he' | 'en' | 'ru';

interface Message {
  role: 'user' | 'assistant';
  text: string;
}

declare global {
  interface Window {
    turnstile?: {
      render: (
        container: HTMLElement,
        options: {
          sitekey: string;
          callback: (token: string) => void;
          'expired-callback'?: () => void;
          'error-callback'?: () => void;
        }
      ) => string;
      reset: (widgetId?: string) => void;
    };
  }
}

const LABELS = {
  title: { he: 'שוחח איתי', en: 'Chat with me', ru: 'Напишите мне' },
  placeholder: { he: 'שאל אותי משהו...', en: 'Ask me anything...', ru: 'Спросите меня...' },
  greeting: {
    he: 'היי! אני העוזר הוירטואלי של אלעד 👋\nשאל אותי על הפרויקטים, הכישורים, או איך ליצור קשר.',
    en: "Hey! I'm Elad's virtual assistant 👋\nAsk me about his projects, skills, or how to get in touch.",
    ru: 'Привет! Я виртуальный помощник Элада 👋\nСпросите о проектах, навыках или контактах.',
  },
  error: { he: 'משהו השתבש, נסה שוב', en: 'Something went wrong, try again', ru: 'Что-то пошло не так' },
  // Disclosure at the point of use, not only in the privacy policy: whatever is typed
  // here leaves for a third-party model, and someone should be able to know that before
  // they type it rather than by going looking for a legal page.
  aiNotice: {
    he: 'ההודעות מעובדות אצל ספק בינה מלאכותית כדי לייצר תשובה.',
    en: 'Messages are processed by an AI provider to generate replies.',
    ru: 'Сообщения обрабатываются провайдером ИИ для формирования ответа.',
  },
  typing: { he: 'מקליד...', en: 'Typing...', ru: 'Печатает...' },
  // Graceful, specific failure states (R5.5) — a visitor should always know whether to
  // retry, wait, or just email instead.
  errBusy: {
    he: 'יותר מדי הודעות ברצף. נסה שוב בעוד דקה.',
    en: 'Too many messages in a row. Try again in a minute.',
    ru: 'Слишком много сообщений подряд. Попробуйте через минуту.',
  },
  errUpstream: {
    he: 'העוזר לא זמין כרגע. אפשר לנסות שוב, או פשוט לכתוב לאלעד ישירות.',
    en: "The assistant is unavailable right now. Try again, or just email Elad directly.",
    ru: 'Помощник сейчас недоступен. Попробуйте позже или напишите Эладу напрямую.',
  },
  errOffline: {
    he: 'הצ׳אט כבוי כרגע. אפשר ליצור קשר דרך עמוד יצירת הקשר.',
    en: 'Chat is switched off right now. The contact page still works.',
    ru: 'Чат сейчас отключён. Свяжитесь через страницу контактов.',
  },
};

/** Server error code → the message the visitor actually sees. */
const ERROR_LABEL: Record<string, keyof typeof LABELS> = {
  rate_limited: 'errBusy',
  not_configured: 'errOffline',
  upstream_unavailable: 'errUpstream',
  server_error: 'errUpstream',
  captcha_missing: 'errUpstream',
  captcha_failed: 'errUpstream',
  forbidden: 'errUpstream',
  invalid_input: 'error',
};

interface ChatWidgetProps {
  locale: Locale;
}

export default function ChatWidget({ locale }: ChatWidgetProps) {
  const isRTL = locale === 'he';
  // Opposite corner from the accessibility widget (start-6) so the two floating
  // buttons don't stack on one side and cover content on mobile.
  const sideClass = 'end-6';
  const panelAlignClass = 'end-0';
  const turnstileSiteKey = process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY;

  const [open, setOpen] = useState(false);
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [initialized, setInitialized] = useState(false);
  const [turnstileToken, setTurnstileToken] = useState('');
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const turnstileRef = useRef<HTMLDivElement>(null);
  const turnstileWidgetIdRef = useRef<string | null>(null);

  const t = useCallback((key: keyof typeof LABELS) => LABELS[key][locale], [locale]);

  useEffect(() => {
    if (open && !initialized) {
      setMessages([{ role: 'assistant', text: t('greeting') }]);
      setInitialized(true);
    }
  }, [open, initialized, locale, t]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, loading]);

  useEffect(() => {
    if (open) setTimeout(() => inputRef.current?.focus(), 100);
  }, [open]);

  const mountTurnstile = useCallback(() => {
    if (!open || !turnstileSiteKey || !turnstileRef.current || !window.turnstile) return;
    if (turnstileWidgetIdRef.current) return;

    turnstileWidgetIdRef.current = window.turnstile.render(turnstileRef.current, {
      sitekey: turnstileSiteKey,
      callback: (token: string) => setTurnstileToken(token),
      'expired-callback': () => setTurnstileToken(''),
      'error-callback': () => setTurnstileToken(''),
    });
  }, [open, turnstileSiteKey]);

  useEffect(() => {
    mountTurnstile();
  }, [mountTurnstile]);

  const sendMessage = useCallback(async () => {
    const text = input.trim();
    if (!text || loading) return;
    // The captcha is only a gate where it exists. Without a site key there is no widget to
    // solve and no token to wait for, and the server carries the abuse load on its rate
    // limits — blocking here would just make the chat unusable, which is what it did.
    if (turnstileSiteKey && !turnstileToken) {
      setMessages((prev) => [...prev, { role: 'assistant', text: t('error') }]);
      return;
    }

    const userMsg: Message = { role: 'user', text };
    const next = [...messages, userMsg];
    setMessages(next);
    setInput('');
    setLoading(true);

    try {
      const res = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(turnstileSiteKey ? { messages: next, turnstileToken } : { messages: next }),
      });

      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        // The route answers with a stable code, never a raw upstream message — map it to
        // a localized line so the failure is informative instead of a dead end.
        const key = ERROR_LABEL[String(data?.error ?? '')] ?? 'errUpstream';
        setMessages((prev) => [...prev, { role: 'assistant', text: t(key) }]);
        return;
      }

      setMessages((prev) => [
        ...prev,
        { role: 'assistant', text: data.text || t('errUpstream') },
      ]);
    } catch {
      setMessages((prev) => [...prev, { role: 'assistant', text: t('errUpstream') }]);
    } finally {
      // The Turnstile token is single-use whatever the outcome — always mint a fresh one,
      // otherwise a failed send left the widget permanently un-sendable.
      setTurnstileToken('');
      window.turnstile?.reset(turnstileWidgetIdRef.current || undefined);
      setLoading(false);
    }
  }, [input, loading, messages, turnstileToken, turnstileSiteKey, t]);

  const handleKey = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  };

  return (
    <div className={`fixed bottom-6 ${sideClass} z-[9998]`} dir={isRTL ? 'rtl' : 'ltr'}>
      {turnstileSiteKey && (
        <Script
          src="https://challenges.cloudflare.com/turnstile/v0/api.js?render=explicit"
          strategy="afterInteractive"
          onLoad={mountTurnstile}
        />
      )}

      {/* Panel */}
      {open && (
        <div
          className={`chrome-surface absolute bottom-full mb-3 ${panelAlignClass} w-80 max-w-[90vw] flex flex-col rounded-2xl overflow-hidden`}
          style={{ height: 'min(420px, calc(100vh - 5rem))' }}
        >
          {/* Header */}
          <div className="flex items-center justify-between px-4 py-3 shrink-0 border-b border-[rgba(255,201,120,0.28)]">
            <div className="flex items-center gap-2">
              <MessageCircle size={16} className="text-[var(--color-core-gold)]" aria-hidden="true" />
              <span className="text-sm font-semibold text-[var(--color-star-white)]">{t('title')}</span>
            </div>
            <button
              onClick={() => setOpen(false)}
              aria-label="Close chat"
              className="chrome-btn p-1 rounded-lg"
            >
              <X size={16} />
            </button>
          </div>

          {/* Messages */}
          <div className="flex-1 overflow-y-auto p-4 flex flex-col gap-3">
            {messages.map((msg, i) => (
              <div
                key={i}
                className={`flex ${msg.role === 'user' ? (isRTL ? 'justify-start' : 'justify-end') : (isRTL ? 'justify-end' : 'justify-start')}`}
              >
                <div
                  className={`max-w-[85%] px-3 py-2 rounded-2xl text-sm leading-relaxed whitespace-pre-wrap ${
                    msg.role === 'user'
                      ? 'bg-[rgba(255,201,120,0.16)] border border-[rgba(255,201,120,0.4)] text-[var(--color-star-white)] rounded-br-sm'
                      : 'bg-[rgba(238,241,255,0.05)] text-[var(--color-star-white)]/80 border border-white/10 rounded-bl-sm'
                  }`}
                >
                  {msg.text}
                </div>
              </div>
            ))}
            {loading && (
              <div className={`flex ${isRTL ? 'justify-end' : 'justify-start'}`}>
                <div className="bg-[rgba(238,241,255,0.05)] border border-white/10 px-3 py-2 rounded-2xl rounded-bl-sm">
                  <span className="flex gap-1 items-center h-4">
                    <span className="w-1.5 h-1.5 rounded-full bg-[var(--color-core-gold)]/70 animate-bounce" style={{ animationDelay: '0ms' }} />
                    <span className="w-1.5 h-1.5 rounded-full bg-[var(--color-core-gold)]/70 animate-bounce" style={{ animationDelay: '150ms' }} />
                    <span className="w-1.5 h-1.5 rounded-full bg-[var(--color-core-gold)]/70 animate-bounce" style={{ animationDelay: '300ms' }} />
                  </span>
                </div>
              </div>
            )}
            <div ref={messagesEndRef} />
          </div>

          {/* Input */}
          <div className="shrink-0 flex gap-2 p-3 border-t border-white/10">
            <input
              ref={inputRef}
              type="text"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={handleKey}
              placeholder={t('placeholder')}
              disabled={loading}
              className="flex-1 bg-[rgba(238,241,255,0.05)] border border-white/12 rounded-xl px-3 py-2 text-sm text-[var(--color-star-white)] placeholder:text-[var(--color-star-white)]/40 focus:outline-none focus:border-[var(--color-core-gold)]/60 transition-colors disabled:opacity-50"
            />
            <button
              onClick={sendMessage}
              disabled={loading || !input.trim() || (Boolean(turnstileSiteKey) && !turnstileToken)}
              aria-label="Send"
              className="chrome-btn p-2 rounded-xl border-[rgba(255,201,120,0.4)] bg-[rgba(255,201,120,0.14)] text-[var(--color-core-gold)] disabled:opacity-40 disabled:cursor-not-allowed shrink-0"
            >
              <Send size={16} />
            </button>
          </div>

          <div className="px-3 pb-3">
            <p className="mb-2 text-[11px] leading-snug text-[var(--color-star-white)]/45">
              {t('aiNotice')}
            </p>
            {/* No site key, no captcha slot and no "switched off" line: the widget works,
                the server just rate limits instead. errOffline stays reachable through
                ERROR_LABEL for the case where the chat really is unconfigured. */}
            {turnstileSiteKey && <div ref={turnstileRef} className="min-h-[65px]" />}
          </div>
        </div>
      )}

      {/* Toggle button */}
      <button
        onClick={() => setOpen((prev) => !prev)}
        aria-label={open ? 'Close chat' : t('title')}
        data-active={open ? 'true' : 'false'}
        className="chrome-launcher relative flex items-center gap-2 rounded-full px-4 py-3 font-medium text-sm hover:scale-[1.04]"
      >
        {open ? <X size={20} aria-hidden="true" /> : <MessageCircle size={20} aria-hidden="true" />}
        <span className="hidden sm:inline">{open ? '' : t('title')}</span>
        {!open && messages.length <= 1 && (
          <span className="absolute -top-1 -right-1 w-2.5 h-2.5 rounded-full bg-[var(--color-core-gold)] border-2 border-[var(--color-space-void)]" />
        )}
      </button>
    </div>
  );
}
