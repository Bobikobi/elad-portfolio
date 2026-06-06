'use client';
import { useEffect } from 'react';
import { I18nProvider, useI18n } from '@/lib/i18n';
import Navbar from './Navbar';
import Footer from './Footer';
import AccessibilityWidget from '@/components/AccessibilityWidget';
import ChatWidget from '@/components/ui/ChatWidget';
import LocaleRouteSync from '@/components/seo/LocaleRouteSync';

function InnerLayout({ children }: { children: React.ReactNode }) {
  const { locale } = useI18n();

  useEffect(() => {
    const dir = locale === 'he' ? 'rtl' : 'ltr';
    document.documentElement.lang = locale;
    document.documentElement.dir = dir;
  }, [locale]);
  return (
    <>
      <LocaleRouteSync />
      <a href="#main-content" className="skip-link">
        Skip to content
      </a>
      <Navbar />
      <main id="main-content" className="flex-1 relative z-10">
        {children}
      </main>
      <Footer />
      <ChatWidget locale={locale} />
      <AccessibilityWidget locale={locale} />
    </>
  );
}

export default function ClientProviders({ children }: { children: React.ReactNode }) {
  return (
    <I18nProvider>
      <InnerLayout>{children}</InnerLayout>
    </I18nProvider>
  );
}
