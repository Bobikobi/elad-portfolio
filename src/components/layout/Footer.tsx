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
    <footer className="relative z-10 border-t border-[rgba(238,241,255,0.1)] bg-[var(--color-space-void)]">
      {/* Compact single-band footer: logo · links · socials on one row (stacks tight on
          mobile), with a small copyright + texture credit beneath. */}
      <div className="mx-auto max-w-[1200px] px-6 py-4">
        <div className="flex flex-col sm:flex-row items-center justify-between gap-3">
          <span
            className="text-xl font-bold tracking-wide text-[var(--color-text-primary)]"
            style={{ fontFamily: "'Glamora', serif" }}
          >
            E.S
          </span>

          <div className="flex items-center gap-5 text-[13px] text-[var(--color-text-tertiary)]">
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
                <s.icon size={17} strokeWidth={1.5} />
              </a>
            ))}
          </div>
        </div>

        <div className="mt-3 text-center text-[11px] leading-relaxed text-[var(--color-text-tertiary)]/80">
          &copy; {year} Elad Saadon. {t('footer.rights')}
          <span className="mx-1.5 opacity-40">·</span>
          <a
            href="https://www.solarsystemscope.com/textures/"
            target="_blank"
            rel="noopener noreferrer"
            className="hover:text-[var(--color-text-secondary)] transition-colors"
          >
            Planet textures: Solar System Scope (CC BY 4.0)
          </a>
        </div>
      </div>
    </footer>
  );
}
