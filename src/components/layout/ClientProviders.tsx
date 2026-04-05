'use client';
import { I18nProvider } from '@/lib/i18n';
import Navbar from './Navbar';
import Footer from './Footer';
import AccessibilityWidget from '@/components/AccessibilityWidget';

export default function ClientProviders({ children }: { children: React.ReactNode }) {
  return (
    <I18nProvider>
      <a href="#main-content" className="skip-link">
        Skip to content
      </a>
      <Navbar />
      <main id="main-content" className="flex-1 relative z-10">
        {children}
      </main>
      <Footer />
      <AccessibilityWidget />
    </I18nProvider>
  );
}
