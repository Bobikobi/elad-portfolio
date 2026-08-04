/**
 * F3.2 - the visitor's language preference, in a form the SERVER can read.
 *
 * Most routes do not need this: their URL pins the language, and `localeForPath` answers
 * on both sides. The exceptions are the routes that serve every language from a single
 * URL - /privacy, /terms, /accessibility - where the only thing that knows the language
 * is the visitor's own preference.
 *
 * Kept only in localStorage, that preference is invisible to the server, so those pages
 * painted English LTR and the client flipped the whole document to Hebrew RTL after
 * hydration. Measured at CLS 0.279 on /privacy with a cold cache: a POOR Core Web Vital
 * on the one page a visitor is most likely to be reading carefully.
 *
 * So the cookie is the source of truth and localStorage is a mirror - the same shape, and
 * for the same reason, as `viewMode.ts`. This is a functional preference: no identifier,
 * nothing to correlate, and nothing an analytics system would want.
 */
import type { Locale } from './translations';

export const LOCALE_COOKIE = 'locale';

/** A year. A chosen language is a preference, not a session. */
export const LOCALE_MAX_AGE = 60 * 60 * 24 * 365;

const LOCALES: readonly string[] = ['he', 'en', 'ru'];

/** Narrow an untrusted cookie / storage value. `null` means "nothing was chosen". */
export function parseLocale(raw: string | null | undefined): Locale | null {
  return raw && LOCALES.includes(raw) ? (raw as Locale) : null;
}

/** The `document.cookie` string that records a choice. */
export function localeCookie(locale: Locale): string {
  return `${LOCALE_COOKIE}=${locale}; path=/; max-age=${LOCALE_MAX_AGE}; samesite=lax`;
}
