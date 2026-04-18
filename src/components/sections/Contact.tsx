'use client';
import { useRef, useState, FormEvent } from 'react';
import { motion, useInView } from 'framer-motion';
import { Send, Mail } from 'lucide-react';
import { GithubIcon, LinkedinIcon, WhatsAppIcon } from '@/components/ui/SocialIcons';
import { useI18n } from '@/lib/i18n';
import GradientBar from '@/components/ui/GradientBar';

export default function Contact() {
  const { t } = useI18n();
  const ref = useRef(null);
  const inView = useInView(ref, { once: true, margin: '-100px' });
  const [sent, setSent] = useState(false);
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setLoading(true);

    // For now, simulate submission. Replace with Supabase integration later.
    await new Promise((resolve) => setTimeout(resolve, 1000));
    setSent(true);
    setLoading(false);
    (e.target as HTMLFormElement).reset();
    setTimeout(() => setSent(false), 4000);
  };

  const inputClass =
    'w-full px-4 py-3 rounded-lg bg-[var(--color-bg-tertiary)] border border-[var(--color-border-default)] text-[var(--color-text-primary)] text-sm placeholder:text-[var(--color-text-tertiary)] focus:outline-none focus:border-[var(--color-accent)] focus:ring-1 focus:ring-[var(--color-accent)] transition-colors';

  return (
    <section id="contact" className="relative py-20 px-6" ref={ref}>
      <div className="mx-auto max-w-[1200px]">
        <div className="grid md:grid-cols-2 gap-16">
          {/* Left: info */}
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            animate={inView ? { opacity: 1, y: 0 } : {}}
            transition={{ duration: 0.6, ease: [0.25, 0.4, 0, 1] }}
          >
            <GradientBar />
            <h2 className="text-[clamp(2rem,3.5vw,3rem)] font-semibold text-[var(--color-text-primary)] mb-4">
              {t('contact.title')}
            </h2>
            <p className="text-lg text-[var(--color-text-secondary)] mb-10">
              {t('contact.subtitle')}
            </p>

            <div className="flex flex-col gap-4">
              <a
                href="mailto:eladeladsaa@gmail.com"
                className="flex items-center gap-3 p-4 rounded-lg bg-[var(--color-bg-secondary)] border border-[var(--color-border-default)] hover:border-[var(--color-border-subtle)] transition-colors"
              >
                <Mail size={18} strokeWidth={1.5} className="text-[var(--color-accent)]" />
                <span className="text-sm text-[var(--color-text-secondary)]">eladeladsaa@gmail.com</span>
              </a>
              <a
                href="https://github.com/Bobikobi"
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-3 p-4 rounded-lg bg-[var(--color-bg-secondary)] border border-[var(--color-border-default)] hover:border-[var(--color-border-subtle)] transition-colors"
              >
                <GithubIcon size={18} className="text-[var(--color-accent)]" />
                <span className="text-sm text-[var(--color-text-secondary)]">github.com/Bobikobi</span>
              </a>
              <a
                href="https://www.linkedin.com/in/elad-saadon-184809281/"
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-3 p-4 rounded-lg bg-[var(--color-bg-secondary)] border border-[var(--color-border-default)] hover:border-[var(--color-border-subtle)] transition-colors"
              >
                <LinkedinIcon size={18} className="text-[var(--color-accent)]" />
                <span className="text-sm text-[var(--color-text-secondary)]">LinkedIn</span>
              </a>
              <a
                href="https://wa.me/972545423380"
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-3 p-4 rounded-lg bg-[var(--color-bg-secondary)] border border-[var(--color-border-default)] hover:border-[var(--color-border-subtle)] transition-colors"
              >
                <WhatsAppIcon size={18} className="text-[var(--color-accent)]" />
                <span className="text-sm text-[var(--color-text-secondary)]">WhatsApp</span>
              </a>
            </div>
          </motion.div>

          {/* Right: form */}
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            animate={inView ? { opacity: 1, y: 0 } : {}}
            transition={{ duration: 0.6, ease: [0.25, 0.4, 0, 1], delay: 0.15 }}
          >
            <form
              onSubmit={handleSubmit}
              className="p-6 md:p-8 rounded-xl bg-[var(--color-bg-secondary)] border border-[var(--color-border-default)] flex flex-col gap-5"
            >
              {/* Honeypot */}
              <input type="text" name="website" className="hidden" tabIndex={-1} autoComplete="off" />

              <div>
                <label htmlFor="name" className="block text-sm text-[var(--color-text-tertiary)] mb-1.5">
                  {t('contact.name')}
                </label>
                <input id="name" name="name" type="text" required minLength={2} className={inputClass} />
              </div>

              <div>
                <label htmlFor="email" className="block text-sm text-[var(--color-text-tertiary)] mb-1.5">
                  {t('contact.email')}
                </label>
                <input id="email" name="email" type="email" required className={inputClass} />
              </div>

              <div>
                <label htmlFor="subject" className="block text-sm text-[var(--color-text-tertiary)] mb-1.5">
                  {t('contact.subject')}
                </label>
                <select id="subject" name="subject" required className={inputClass}>
                  <option value="general">{t('contact.subject.general')}</option>
                  <option value="project">{t('contact.subject.project')}</option>
                  <option value="collaboration">{t('contact.subject.collab')}</option>
                  <option value="other">{t('contact.subject.other')}</option>
                </select>
              </div>

              <div>
                <label htmlFor="message" className="block text-sm text-[var(--color-text-tertiary)] mb-1.5">
                  {t('contact.message')}
                </label>
                <textarea
                  id="message"
                  name="message"
                  required
                  minLength={10}
                  rows={4}
                  className={`${inputClass} resize-none`}
                />
              </div>

              <button
                type="submit"
                disabled={loading}
                className="flex items-center justify-center gap-2 px-6 py-3 rounded-lg bg-[var(--color-accent)] text-white font-medium text-sm hover:bg-[var(--color-accent-hover)] hover:shadow-[0_0_20px_var(--color-accent-glow)] hover:-translate-y-0.5 active:scale-[0.97] transition-all disabled:opacity-60 disabled:cursor-not-allowed"
              >
                <Send size={16} strokeWidth={1.5} />
                {loading ? '...' : t('contact.send')}
              </button>

              {sent && (
                <motion.p
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="text-sm text-[var(--color-success)] text-center"
                >
                  {t('contact.sent')}
                </motion.p>
              )}
            </form>
          </motion.div>
        </div>
      </div>
    </section>
  );
}
