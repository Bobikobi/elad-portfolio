'use client';
import { Send, Mail } from 'lucide-react';
import { useI18n } from '@/lib/i18n';
import Link from 'next/link';
import { GithubIcon, LinkedinIcon } from '@/components/ui/SocialIcons';

const socials = [
  { icon: GithubIcon, href: 'https://github.com/Bobikobi', label: 'GitHub' },
  { icon: LinkedinIcon, href: 'https://linkedin.com', label: 'LinkedIn' },
  { icon: Send, href: 'https://t.me/', label: 'Telegram' },
  { icon: Mail, href: 'mailto:contact@eladsaadon.dev', label: 'Email' },
];

export default function Footer() {
  const { t } = useI18n();
  const year = new Date().getFullYear();

  return (
    <footer className="relative z-10 border-t border-[var(--color-border-default)]">
      <div className="mx-auto max-w-[1200px] px-6 py-12">
        <div className="flex flex-col md:flex-row items-center justify-between gap-6">
          {/* Logo */}
          <div className="text-[var(--color-text-primary)] font-semibold text-lg">
            ES<span className="text-[var(--color-accent)]">.</span>
          </div>

          {/* Links */}
          <div className="flex items-center gap-6 text-sm text-[var(--color-text-tertiary)]">
            <Link href="/accessibility" className="hover:text-[var(--color-text-secondary)] transition-colors">
              {t('footer.accessibility')}
            </Link>
            <Link href="/privacy" className="hover:text-[var(--color-text-secondary)] transition-colors">
              {t('footer.privacy')}
            </Link>
            <Link href="/terms" className="hover:text-[var(--color-text-secondary)] transition-colors">
              {t('footer.terms')}
            </Link>
          </div>

          {/* Socials */}
          <div className="flex items-center gap-4">
            {socials.map((s) => (
              <a
                key={s.label}
                href={s.href}
                target="_blank"
                rel="noopener noreferrer"
                aria-label={s.label}
                className="text-[var(--color-text-tertiary)] hover:text-[var(--color-text-primary)] hover:scale-110 transition-all"
              >
                <s.icon size={18} strokeWidth={1.5} />
              </a>
            ))}
          </div>
        </div>

        <div className="mt-8 text-center text-xs text-[var(--color-text-tertiary)]">
          &copy; {year} Elad Saadon. {t('footer.rights')}
        </div>
      </div>
    </footer>
  );
}
