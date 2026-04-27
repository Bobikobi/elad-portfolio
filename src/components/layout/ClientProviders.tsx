'use client';
import { I18nProvider, useI18n } from '@/lib/i18n';
import Navbar from './Navbar';
import Footer from './Footer';
import AccessibilityWidget from '@/components/AccessibilityWidget';
import ChatWidget from '@/components/ui/ChatWidget';
import LocaleRouteSync from '@/components/seo/LocaleRouteSync';

function InnerLayout({ children }: { children: React.ReactNode }) {
  const { locale } = useI18n();
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
