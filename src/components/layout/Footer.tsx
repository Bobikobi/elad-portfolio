'use client';
import { Mail } from 'lucide-react';
import { useI18n } from '@/lib/i18n';
import Link from 'next/link';
import { GithubIcon, LinkedinIcon } from '@/components/ui/SocialIcons';

const socials = [
  { icon: GithubIcon, href: 'https://github.com/Bobikobi', label: 'GitHub' },
  { icon: LinkedinIcon, href: 'https://www.linkedin.com/in/elad-saadon-184809281/', label: 'LinkedIn' },
  { icon: Mail, href: 'mailto:eladeladsaa@gmail.com', label: 'Email' },
];

export default function Footer() {
  const { t } = useI18n();
  const year = new Date().getFullYear();

  return (
    <footer className="relative z-10" style={{ borderTop: '1px solid transparent', borderImage: 'linear-gradient(90deg, transparent, rgba(139,92,246,0.4) 30%, rgba(6,182,212,0.4) 70%, transparent) 1' }}>
      <div className="mx-auto max-w-[1200px] px-6 py-12">
        <div className="flex flex-col md:flex-row items-center justify-between gap-6">
          {/* Logo */}
          <span
            className="text-3xl font-bold tracking-wide text-[var(--color-text-primary)]"
            style={{ fontFamily: "'Glamora', serif" }}
          >
            E.S
          </span>

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
