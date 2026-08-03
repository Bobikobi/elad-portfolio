'use client';
import { useEffect } from 'react';
import { usePathname } from 'next/navigation';
import { I18nProvider, useI18n, type Locale } from '@/lib/i18n';
import { ViewModeProvider, useViewMode } from '@/lib/viewModeContext';
import { DEFAULT_VIEW_MODE, type ViewMode } from '@/lib/viewMode';
import { sectionForPath } from '@/lib/sections';
import Navbar from './Navbar';
import Footer from './Footer';
import AccessibilityWidget from '@/components/AccessibilityWidget';
import ChatWidget from '@/components/ui/ChatWidget';
import LocaleRouteSync from '@/components/seo/LocaleRouteSync';
import CosmicStage from '@/components/scene/CosmicStage';

function InnerLayout({ children }: { children: React.ReactNode }) {
  const { locale } = useI18n();
  const pathname = usePathname();
  const { mode } = useViewMode();

  useEffect(() => {
    const dir = locale === 'he' ? 'rtl' : 'ltr';
    document.documentElement.lang = locale;
    document.documentElement.dir = dir;
  }, [locale]);

  // Immersive routes = the live WebGL cosmos owns the frame: home (galaxy dive /
  // solar overview) and the 5 planet-world section routes. There the DOM is a sparse
  // overlay, so `main` is click-through (planets receive the raycast; interactive
  // islands opt back in with pointer-events-auto) and the opaque footer is hidden so
  // it never letterboxes the scene. Classic content pages keep `main` interactive.
  // F2: the mode gates everything else. `cosmic` is only a request - the provider has
  // already demoted it to classic if the browser cannot honour it - so asking the two
  // capability hooks again here would just be a second, drifting copy of that decision.
  const isHome = pathname === '/' || pathname === '/he' || pathname === '/ru';
  const immersive = mode === 'cosmic' && (isHome || !!sectionForPath(pathname));

  return (
    <>
      <LocaleRouteSync />
      {/* Persistent WebGL cosmos — one canvas for the whole site, behind the DOM. */}
      <CosmicStage />
      <a href="#main-content" className="skip-link">
        Skip to content
      </a>
      <Navbar />
      {/* min-h floor = one full viewport before the footer (classic pages). On immersive
          routes `main` is pointer-events-none so planet clicks reach the canvas. */}
      <main
        id="main-content"
        className={`flex-1 relative z-10 min-h-[100dvh] ${immersive ? 'pointer-events-none' : ''}`}
      >
        {children}
      </main>
      {/* Footer never renders over the live cosmos (no letterbox in any world/overview
          default state); its links live on the classic content pages. */}
      {!immersive && <Footer />}
      <ChatWidget locale={locale} />
      <AccessibilityWidget locale={locale} />
    </>
  );
}

export default function ClientProviders({
  children,
  initialLocale = 'en',
  initialViewMode = DEFAULT_VIEW_MODE,
  viewModeChosen = false,
}: {
  children: React.ReactNode;
  initialLocale?: Locale;
  initialViewMode?: ViewMode;
  viewModeChosen?: boolean;
}) {
  return (
    <I18nProvider initialLocale={initialLocale}>
      <ViewModeProvider initialMode={initialViewMode} initiallyChosen={viewModeChosen}>
        <InnerLayout>{children}</InnerLayout>
      </ViewModeProvider>
    </I18nProvider>
  );
}
