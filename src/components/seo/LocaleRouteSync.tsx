'use client';

import { useEffect } from 'react';
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
 */
export default function LocaleRouteSync() {
  const pathname = usePathname();
  const { locale, setLocale } = useI18n();

  useEffect(() => {
    const routeLocale = localeForPath(pathname);
    if (routeLocale && routeLocale !== locale) setLocale(routeLocale);
  }, [pathname, locale, setLocale]);

  return null;
}
