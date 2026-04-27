'use client';

import { useEffect } from 'react';
import { usePathname } from 'next/navigation';
import { useI18n, type Locale } from '@/lib/i18n';

const routeLocales: Locale[] = ['he', 'en', 'ru'];

export default function LocaleRouteSync() {
  const pathname = usePathname();
  const { locale, setLocale } = useI18n();

  useEffect(() => {
    const segment = pathname.split('/')[1] as Locale | undefined;
    if (segment && routeLocales.includes(segment) && segment !== locale) {
      // Keep UI language aligned with locale route for SEO-consistent rendering.
      setLocale(segment);
    }
  }, [pathname, locale, setLocale]);

  return null;
}
