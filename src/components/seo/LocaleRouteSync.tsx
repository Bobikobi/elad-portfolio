'use client';

import { useEffect, useRef } from 'react';
import { usePathname } from 'next/navigation';
import { useI18n } from '@/lib/i18n';
import { localeForPath } from '@/lib/sections';

/**
 * Keeps the UI language aligned with the locale the ROUTE declares, so the rendered
 * content, <html lang> and dir always agree with the URL a crawler indexed.
 *
 * `localeForPath` returns null for the routes that serve every language from a single
 * URL (/guides, /privacy, /terms, /accessibility) — those must keep whatever the visitor
 * chose rather than being forced to the default.
 *
 * It syncs on a PATHNAME change, not on every locale change, and that distinction is
 * load-bearing rather than an optimisation. The language switcher sets the locale and
 * then navigates; `usePathname` still reports the OLD route for the couple of hundred
 * milliseconds the navigation takes. Reacting to the locale change in that window makes
 * this component read the route the user is leaving and shove the locale straight back —
 * the choice then only survives because the committed pathname re-corrects it a moment
 * later. Measured as a visible ltr/rtl flip on every switch into or out of Hebrew.
 */
export default function LocaleRouteSync() {
  const pathname = usePathname();
  const { locale, setLocale } = useI18n();
  const syncedPath = useRef<string | null>(null);

  useEffect(() => {
    if (syncedPath.current === pathname) return;
    syncedPath.current = pathname;
    const routeLocale = localeForPath(pathname);
    if (routeLocale && routeLocale !== locale) setLocale(routeLocale);
  }, [pathname, locale, setLocale]);

  return null;
}
