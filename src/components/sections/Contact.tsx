'use client';

import { useMemo, useRef, useState, type FormEvent } from 'react';
import { motion, useInView, AnimatePresence } from 'framer-motion';
import { Send, Mail } from 'lucide-react';
import { GithubIcon, LinkedinIcon } from '@/components/ui/SocialIcons';
import { useI18n, type Locale } from '@/lib/i18n';
import GradientBar from '@/components/ui/GradientBar';

const statusCopy: Record<Locale, { available: string; response: string; sentTitle: string; sentBody: string }> = {
  he: {
    available: 'זמין לפרויקטים חדשים',
    response: 'בד"כ עונה תוך 24 שעות',
    sentTitle: 'ההודעה נשלחה!',
    sentBody: 'אחזור אליך בקרוב.',
  },
  en: {
    available: 'Available for new projects',
    response: 'Usually responds within 24 hours',
    sentTitle: 'Message sent!',
    sentBody: 'I will get back to you shortly.',
  },
  ru: {
    available: 'Открыт для новых проектов',
    response: 'Обычно отвечает в течение 24 часов',
    sentTitle: 'Сообщение отправлено!',
    sentBody: 'Скоро свяжусь с вами.',
  },
};

export default function Contact() {
  const { t, locale } = useI18n();
  const ref = useRef<HTMLElement>(null);
  const inView = useInView(ref, { once: true, margin: '-100px' });
  const [sent, setSent] = useState(false);
  const [loading, setLoading] = useState(false);
  const status = useMemo(() => statusCopy[locale], [locale]);

  const handleSubmit = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setLoading(true);

    await new Promise((resolve) => setTimeout(resolve, 900));
    setSent(true);
    setLoading(false);
    (e.target as HTMLFormElement).reset();
  };

  return (
    <section id="contact" className="relative py-20 px-6" ref={ref}>
      <div className="mx-auto max-w-[1200px]">
        <div className="grid md:grid-cols-2 gap-14">
          <motion.div
            initial={{ opacity: 0, y: 24 }}
            animate={inView ? { opacity: 1, y: 0 } : {}}
            transition={{ duration: 0.55 }}
          >
            <GradientBar />
            <h2 className="text-[clamp(2rem,3.5vw,3rem)] font-semibold text-[var(--color-text-primary)] mb-4">{t('contact.title')}</h2>
            <p className="text-lg text-[var(--color-text-secondary)] mb-10">{t('contact.subtitle')}</p>

            <div className="flex flex-col gap-4">
              <a
                href="mailto:eladeladsaa@gmail.com"
                className="flex items-center gap-3 rounded-xl border border-[var(--color-border-default)] bg-[var(--color-bg-secondary)] p-4 hover:border-[var(--color-accent)] transition-colors"
              >
                <Mail size={18} strokeWidth={1.5} className="text-[var(--color-accent)]" />
                <span className="text-sm text-[var(--color-text-secondary)]">eladeladsaa@gmail.com</span>
              </a>
              <a
                href="https://github.com/Bobikobi"
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-3 rounded-xl border border-[var(--color-border-default)] bg-[var(--color-bg-secondary)] p-4 hover:border-[var(--color-accent)] transition-colors"
              >
                <GithubIcon size={18} className="text-[var(--color-accent)]" />
                <span className="text-sm text-[var(--color-text-secondary)]">github.com/Bobikobi</span>
              </a>
              <a
                href="https://www.linkedin.com/in/elad-saadon-184809281/"
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-3 rounded-xl border border-[var(--color-border-default)] bg-[var(--color-bg-secondary)] p-4 hover:border-[var(--color-accent)] transition-colors"
              >
                <LinkedinIcon size={18} className="text-[var(--color-accent)]" />
                <span className="text-sm text-[var(--color-text-secondary)]">LinkedIn</span>
              </a>
            </div>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 24 }}
            animate={inView ? { opacity: 1, y: 0 } : {}}
            transition={{ duration: 0.55, delay: 0.12 }}
          >
            <div className="mb-5 rounded-xl border border-green-500/20 bg-green-500/5 p-4">
              <div className="flex items-center gap-3">
                <div className="relative flex h-3 w-3">
                  <span className="absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-60 animate-ping" />
                  <span className="relative inline-flex h-3 w-3 rounded-full bg-green-500" />
                </div>
                <div>
                  <p className="text-sm font-medium text-[var(--color-text-primary)]">{status.available}</p>
                  <p className="text-xs text-[var(--color-text-tertiary)]">{status.response}</p>
                </div>
              </div>
            </div>

            <AnimatePresence mode="wait">
              {!sent ? (
                <motion.form
                  key="contact-form"
                  onSubmit={handleSubmit}
                  initial={{ opacity: 0, y: 12 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -12 }}
                  className="rounded-xl border border-[var(--color-border-default)] bg-[var(--color-bg-secondary)] p-6 md:p-8 flex flex-col gap-5"
                >
                  <FloatingField id="name" label={t('contact.name')} type="text" required minLength={2} />
                  <FloatingField id="email" label={t('contact.email')} type="email" required />
                  <FloatingField id="subject" label={t('contact.subject')} type="text" required />
                  <FloatingTextarea id="message" label={t('contact.message')} required minLength={10} />

                  <button
                    type="submit"
                    disabled={loading}
                    className="inline-flex items-center justify-center gap-2 rounded-xl bg-[var(--color-accent)] px-6 py-3 text-sm font-medium text-white transition-all hover:bg-[var(--color-accent-hover)] hover:-translate-y-0.5 disabled:opacity-60"
                  >
                    <Send size={16} strokeWidth={1.5} />
                    {loading ? '...' : t('contact.send')}
                  </button>
                </motion.form>
              ) : (
                <motion.div
                  key="contact-success"
                  initial={{ scale: 0.82, opacity: 0 }}
                  animate={{ scale: 1, opacity: 1 }}
                  exit={{ scale: 0.95, opacity: 0 }}
                  transition={{ duration: 0.35 }}
                  className="rounded-xl border border-[var(--color-border-default)] bg-[var(--color-bg-secondary)] py-14 px-8 text-center"
                >
                  <div className="mb-4 text-5xl text-green-500">✓</div>
                  <h3 className="text-xl font-semibold text-[var(--color-text-primary)] mb-2">{status.sentTitle}</h3>
                  <p className="text-sm text-[var(--color-text-secondary)]">{status.sentBody}</p>
                </motion.div>
              )}
            </AnimatePresence>
          </motion.div>
        </div>
      </div>
    </section>
  );
}

function FloatingField({
  id,
  label,
  type,
  required,
  minLength,
}: {
  id: string;
  label: string;
  type: string;
  required?: boolean;
  minLength?: number;
}) {
  return (
    <motion.label
      whileFocus={{ scale: 1.01 }}
      className="group relative block rounded-lg border border-[var(--color-border-default)] bg-[var(--color-bg-tertiary)] px-3 pt-5 pb-2 transition-colors focus-within:border-[var(--color-accent)]"
    >
      <input
        id={id}
        name={id}
        type={type}
        required={required}
        minLength={minLength}
        placeholder=" "
        className="peer w-full bg-transparent text-sm text-[var(--color-text-primary)] outline-none"
      />
      <span className="pointer-events-none absolute start-3 top-3 text-xs text-[var(--color-text-tertiary)] transition-all peer-placeholder-shown:top-4 peer-placeholder-shown:text-sm peer-focus:top-2 peer-focus:text-xs peer-focus:text-[var(--color-accent)]">
        {label}
      </span>
    </motion.label>
  );
}

function FloatingTextarea({
  id,
  label,
  required,
  minLength,
}: {
  id: string;
  label: string;
  required?: boolean;
  minLength?: number;
}) {
  return (
    <motion.label
      whileFocus={{ scale: 1.01 }}
      className="group relative block rounded-lg border border-[var(--color-border-default)] bg-[var(--color-bg-tertiary)] px-3 pt-5 pb-2 transition-colors focus-within:border-[var(--color-accent)]"
    >
      <textarea
        id={id}
        name={id}
        required={required}
        minLength={minLength}
        rows={4}
        placeholder=" "
        className="peer w-full resize-none bg-transparent text-sm text-[var(--color-text-primary)] outline-none"
      />
      <span className="pointer-events-none absolute start-3 top-3 text-xs text-[var(--color-text-tertiary)] transition-all peer-placeholder-shown:top-4 peer-placeholder-shown:text-sm peer-focus:top-2 peer-focus:text-xs peer-focus:text-[var(--color-accent)]">
        {label}
      </span>
    </motion.label>
  );
}
