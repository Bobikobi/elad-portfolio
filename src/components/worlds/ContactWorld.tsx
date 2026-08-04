import { Mail } from 'lucide-react';
import type { Locale } from '@/lib/translations';
import { translations as tr } from '@/lib/translations';
import { GithubIcon, LinkedinIcon } from '@/components/ui/SocialIcons';
import ContactForm from './ContactForm';

const t = (k: string, l: Locale) => tr[k]?.[l] ?? k;

const CHIPS = [
  { icon: Mail, label: 'eladeladsaa@gmail.com', href: 'mailto:eladeladsaa@gmail.com' },
  { icon: GithubIcon, label: 'github.com/Bobikobi', href: 'https://github.com/Bobikobi' },
  { icon: LinkedinIcon, label: 'LinkedIn', href: 'https://www.linkedin.com/in/elad-saadon-184809281/' },
];

/** Contact = Mars. A single glass form + three satellite contact chips. */
export default function ContactWorld({ locale }: { locale: Locale }) {
  return (
    <div className="text-start">
      <p className="mb-5 text-sm text-[var(--color-star-white)]/70">{t('contact.subtitle', locale)}</p>
      <ContactForm />
      <div className="mt-6 flex flex-wrap gap-2">
        {CHIPS.map((c) => (
          <a
            key={c.label}
            href={c.href}
            target={c.href.startsWith('http') ? '_blank' : undefined}
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1.5 rounded-full border border-white/10 px-3 py-1.5 text-xs text-[var(--color-star-white)]/75 transition-colors hover:border-[var(--color-core-gold)]/40 hover:text-[var(--color-core-gold)]"
          >
            <c.icon size={13} />
            {c.label}
          </a>
        ))}
      </div>
    </div>
  );
}
