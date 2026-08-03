'use client';
import React, { createContext, useContext, useEffect, useCallback, useSyncExternalStore } from 'react';
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

const LOCALES: Locale[] = ['he', 'en', 'ru'];
const isLocale = (v: unknown): v is Locale => typeof v === 'string' && (LOCALES as string[]).includes(v);

/**
 * The active locale is not component state — it is a value that lives OUTSIDE React, in the
 * URL and in localStorage, and React is only reading it. Modelling it as `useState` plus a
 * `setState` in an effect is what produced the `set-state-in-effect` error, and the error was
 * describing a real cost: every visitor rendered the whole tree once in `initialLocale`, then
 * the effect fired and rendered it all again, even when the answer was identical.
 *
 * As an external store the read is explicit and happens in one place. The server snapshot is
 * whatever the route said; the client snapshot resolves the same precedence the effect used
 * (path wins over the saved preference), so behaviour is unchanged — it simply arrives on the
 * first client render instead of the second.
 */
let overrideLocale: Locale | null = null; // set by setLocale, wins over path + storage
const listeners = new Set<() => void>();

function subscribeLocale(cb: () => void) {
  listeners.add(cb);
  return () => listeners.delete(cb);
}

function resolveLocale(fallback: Locale): Locale {
  if (overrideLocale) return overrideLocale;
  const pathLocale = window.location.pathname.split('/')[1];
  if (isLocale(pathLocale)) return pathLocale;
  try {
    const saved = localStorage.getItem('locale');
    if (isLocale(saved)) return saved;
  } catch {
    /* storage blocked (private mode) — the route's answer stands */
  }
  return fallback;
}

export function I18nProvider({
  children,
  initialLocale = 'en',
}: {
  children: React.ReactNode;
  initialLocale?: Locale;
}) {
  // getSnapshot must return a stable value for an unchanged store, so the result is cached and
  // only recomputed when something actually notifies. Returning a freshly-resolved value on
  // every call would make React re-render forever.
  const snapshot = React.useRef<Locale | null>(null);
  const getSnapshot = useCallback(() => {
    if (snapshot.current === null) snapshot.current = resolveLocale(initialLocale);
    return snapshot.current;
  }, [initialLocale]);
  const getServerSnapshot = useCallback(() => initialLocale, [initialLocale]);
  const locale = useSyncExternalStore(
    useCallback((cb: () => void) => subscribeLocale(() => { snapshot.current = null; cb(); }), []),
    getSnapshot,
    getServerSnapshot
  );

  // The path is authoritative, so visiting /en persists that choice — same as before, but as a
  // side effect of navigation rather than as part of deciding what to render.
  useEffect(() => {
    const pathLocale = window.location.pathname.split('/')[1];
    if (isLocale(pathLocale)) {
      try { localStorage.setItem('locale', pathLocale); } catch { /* private mode */ }
    }
  }, []);

  const setLocale = useCallback((l: Locale) => {
    overrideLocale = l;
    try { localStorage.setItem('locale', l); } catch { /* private mode */ }
    document.documentElement.lang = l;
    document.documentElement.dir = l === 'he' ? 'rtl' : 'ltr';
    listeners.forEach((cb) => cb());
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
