'use client';
import { useState, useRef, useEffect, useCallback } from 'react';
import { MessageCircle, X, Send } from 'lucide-react';

type Locale = 'he' | 'en' | 'ru';

interface Message {
  role: 'user' | 'assistant';
  text: string;
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
  typing: { he: 'מקליד...', en: 'Typing...', ru: 'Печатает...' },
};

interface ChatWidgetProps {
  locale: Locale;
}

export default function ChatWidget({ locale }: ChatWidgetProps) {
  const isRTL = locale === 'he';
  const sideClass = isRTL ? 'left-6' : 'right-6';
  const panelAlignClass = isRTL ? 'left-0' : 'right-0';

  const [open, setOpen] = useState(false);
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [initialized, setInitialized] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const t = (key: keyof typeof LABELS) => LABELS[key][locale];

  useEffect(() => {
    if (open && !initialized) {
      setMessages([{ role: 'assistant', text: t('greeting') }]);
      setInitialized(true);
    }
  }, [open, initialized, locale]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, loading]);

  useEffect(() => {
    if (open) setTimeout(() => inputRef.current?.focus(), 100);
  }, [open]);

  const sendMessage = useCallback(async () => {
    const text = input.trim();
    if (!text || loading) return;

    const userMsg: Message = { role: 'user', text };
    const next = [...messages, userMsg];
    setMessages(next);
    setInput('');
    setLoading(true);

    try {
      const res = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ messages: next }),
      });
      const data = await res.json();
      setMessages((prev) => [
        ...prev,
        { role: 'assistant', text: data.text || t('error') },
      ]);
    } catch {
      setMessages((prev) => [...prev, { role: 'assistant', text: t('error') }]);
    } finally {
      setLoading(false);
    }
  }, [input, loading, messages, locale]);

  const handleKey = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  };

  return (
    <div className={`fixed bottom-20 ${sideClass} z-[9998]`} dir={isRTL ? 'rtl' : 'ltr'}>
      {/* Panel */}
      {open && (
        <div
          className={`absolute bottom-full mb-3 ${panelAlignClass} w-80 flex flex-col rounded-2xl border border-[var(--color-border-default)] bg-[var(--color-bg-secondary)] shadow-2xl overflow-hidden`}
          style={{ height: '420px' }}
        >
          {/* Header */}
          <div className="flex items-center justify-between px-4 py-3 bg-[var(--color-accent)] shrink-0">
            <div className="flex items-center gap-2">
              <MessageCircle size={16} className="text-white" aria-hidden="true" />
              <span className="text-sm font-semibold text-white">{t('title')}</span>
            </div>
            <button
              onClick={() => setOpen(false)}
              aria-label="Close chat"
              className="p-1 rounded-lg text-white/80 hover:text-white hover:bg-white/10 transition-colors"
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
                      ? 'bg-[var(--color-accent)] text-white rounded-br-sm'
                      : 'bg-[var(--color-bg-tertiary)] text-[var(--color-text-secondary)] border border-[var(--color-border-default)] rounded-bl-sm'
                  }`}
                >
                  {msg.text}
                </div>
              </div>
            ))}
            {loading && (
              <div className={`flex ${isRTL ? 'justify-end' : 'justify-start'}`}>
                <div className="bg-[var(--color-bg-tertiary)] border border-[var(--color-border-default)] px-3 py-2 rounded-2xl rounded-bl-sm">
                  <span className="flex gap-1 items-center h-4">
                    <span className="w-1.5 h-1.5 rounded-full bg-[var(--color-text-tertiary)] animate-bounce" style={{ animationDelay: '0ms' }} />
                    <span className="w-1.5 h-1.5 rounded-full bg-[var(--color-text-tertiary)] animate-bounce" style={{ animationDelay: '150ms' }} />
                    <span className="w-1.5 h-1.5 rounded-full bg-[var(--color-text-tertiary)] animate-bounce" style={{ animationDelay: '300ms' }} />
                  </span>
                </div>
              </div>
            )}
            <div ref={messagesEndRef} />
          </div>

          {/* Input */}
          <div className="shrink-0 flex gap-2 p-3 border-t border-[var(--color-border-default)]">
            <input
              ref={inputRef}
              type="text"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={handleKey}
              placeholder={t('placeholder')}
              disabled={loading}
              className="flex-1 bg-[var(--color-bg-tertiary)] border border-[var(--color-border-default)] rounded-xl px-3 py-2 text-sm text-[var(--color-text-primary)] placeholder:text-[var(--color-text-tertiary)] focus:outline-none focus:border-[var(--color-accent)] transition-colors disabled:opacity-50"
            />
            <button
              onClick={sendMessage}
              disabled={loading || !input.trim()}
              aria-label="Send"
              className="p-2 rounded-xl bg-[var(--color-accent)] text-white hover:bg-[var(--color-accent-hover)] transition-colors disabled:opacity-40 disabled:cursor-not-allowed shrink-0"
            >
              <Send size={16} />
            </button>
          </div>
        </div>
      )}

      {/* Toggle button */}
      <button
        onClick={() => setOpen((prev) => !prev)}
        aria-label={open ? 'Close chat' : t('title')}
        className={`relative flex items-center gap-2 rounded-full shadow-lg px-4 py-3 text-white font-bold text-sm transition-all duration-300 hover:scale-105 focus-visible:ring-4 focus-visible:ring-blue-300 bg-[var(--color-accent)] hover:bg-[var(--color-accent-hover)] ${open ? 'opacity-90' : ''}`}
      >
        {open ? <X size={20} aria-hidden="true" /> : <MessageCircle size={20} aria-hidden="true" />}
        <span className="hidden sm:inline">{open ? '' : t('title')}</span>
        {!open && messages.length <= 1 && (
          <span className="absolute -top-1 -right-1 w-3 h-3 bg-green-400 rounded-full border-2 border-[var(--color-bg-primary)]" />
        )}
      </button>
    </div>
  );
}
