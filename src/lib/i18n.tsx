'use client';
import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { translations, type Locale } from './translations';

export { translations };
export type { Locale };

interface I18nContextType {
  locale: Locale;
  setLocale: (l: Locale) => void;
  t: (key: string) => string;
  dir: 'rtl' | 'ltr';
}

const I18nContext = createContext<I18nContextType | null>(null);

export function useI18n() {
  const ctx = useContext(I18nContext);
  if (!ctx) throw new Error('useI18n must be used within I18nProvider');
  return ctx;
}

export function I18nProvider({
  children,
  initialLocale = 'he',
}: {
  children: React.ReactNode;
  initialLocale?: Locale;
}) {
  const [locale, setLocaleState] = useState<Locale>(initialLocale);

  useEffect(() => {
    const pathLocale = window.location.pathname.split('/')[1] as Locale | undefined;
    const saved = localStorage.getItem('locale') as Locale | null;

    if (pathLocale && ['he', 'en', 'ru'].includes(pathLocale)) {
      setLocaleState(pathLocale);
      localStorage.setItem('locale', pathLocale);
      return;
    }

    if (saved && ['he', 'en', 'ru'].includes(saved)) {
      setLocaleState(saved);
    }
  }, []);

  const setLocale = useCallback((l: Locale) => {
    setLocaleState(l);
    localStorage.setItem('locale', l);
    document.documentElement.lang = l;
    document.documentElement.dir = l === 'he' ? 'rtl' : 'ltr';
  }, []);

  useEffect(() => {
    document.documentElement.lang = locale;
    document.documentElement.dir = locale === 'he' ? 'rtl' : 'ltr';
  }, [locale]);

  const dir = locale === 'he' ? 'rtl' : 'ltr';

  const t = useCallback((key: string): string => {
    return translations[key]?.[locale] ?? key;
  }, [locale]);

  return (
    <I18nContext.Provider value={{ locale, setLocale, t, dir }}>
      {children}
    </I18nContext.Provider>
  );
}
