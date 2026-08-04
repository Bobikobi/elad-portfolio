'use client';
import { useActionState } from 'react';
import { usePathname } from 'next/navigation';
import { useI18n } from '@/lib/i18n';
import { submitContact, type ContactState } from '@/app/actions/contact';

const initial: ContactState = { status: 'idle' };

const field =
  'w-full border-0 border-b border-white/15 bg-transparent px-1 py-2 text-sm text-[var(--color-star-white)] outline-none transition-colors placeholder:text-white/35 focus:border-[var(--color-core-gold)]';

/** Contact form — real server action (validation + honeypot + rate-limit). Fields
 *  are underline-only; the underline turns core-gold on focus (spec). */
export default function ContactForm() {
  const { t, locale } = useI18n();
  const pathname = usePathname();
  const [state, action, pending] = useActionState(submitContact, initial);

  if (state.status === 'success') {
    return (
      <div className="rounded-xl border border-[var(--color-core-gold)]/30 bg-[var(--color-core-gold)]/[0.06] px-4 py-6 text-center">
        <p className="text-sm text-[var(--color-core-gold)]">{t('contact.sent')}</p>
      </div>
    );
  }

  return (
    <form action={action} className="space-y-4">
      {/* Context for the enquiry, disclosed in section 1 of the privacy policy: the page it
          was sent from and the language it was written in. Nothing about the visitor. */}
      <input type="hidden" name="locale" value={locale} />
      <input type="hidden" name="sourcePath" value={pathname} />
      {/* honeypot */}
      <input type="text" name="company" tabIndex={-1} autoComplete="off" aria-hidden="true" className="absolute h-0 w-0 opacity-0" style={{ left: '-9999px' }} />
      <input name="name" required minLength={2} maxLength={80} placeholder={t('contact.name')} className={field} />
      <input name="email" type="email" required maxLength={120} placeholder={t('contact.email')} className={field} />
      <textarea name="message" required minLength={10} maxLength={2000} rows={4} placeholder={t('contact.message')} className={`${field} resize-none`} />
      {state.status === 'error' && <p className="text-xs text-red-400/90">{t('contact.error')}</p>}
      <button
        type="submit"
        disabled={pending}
        className="group relative inline-flex items-center text-sm text-[var(--color-core-gold)] disabled:opacity-60"
      >
        {pending ? t('contact.sending') : t('contact.send')}
        <span className="mt-1 block h-px w-full" />
        <span className="absolute -bottom-0.5 inset-x-0 h-px origin-center scale-x-100 bg-[var(--color-core-gold)]/50 transition-transform group-hover:scale-x-110" style={{ borderRadius: '50%' }} />
      </button>
    </form>
  );
}
