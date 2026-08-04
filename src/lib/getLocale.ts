import { headers } from 'next/headers';
import type { Locale } from './i18n';

/** Server-side current locale, resolved from the x-locale header set by proxy.ts. */
export async function getLocale(): Promise<Locale> {
  const l = (await headers()).get('x-locale');
  return l === 'he' || l === 'ru' ? l : 'en';
}
