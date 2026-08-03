import type { MetadataRoute } from 'next';
import { siteConfig } from '@/lib/seo';
import { SECTIONS, homePath, localePath, sectionPath } from '@/lib/sections';
import type { Locale } from '@/lib/translations';

/**
 * F3 — the sitemap is GENERATED from the same helpers the app links with, not written
 * out by hand. The hand-written version had grown to 296 lines of near-identical
 * alternates blocks, and the whole point of this task was that a locale default cannot
 * be changed safely while the URL rule is copy-pasted in thirty places.
 *
 * English is the default locale and owns the un-prefixed space; Hebrew and Russian are
 * prefixed. The one exception is /guides — hand-written Hebrew-only articles with no
 * counterpart in the other two languages, so they carry no alternates at all.
 */
const BASE = siteConfig.url;
const LOCALES: Locale[] = ['en', 'he', 'ru'];

/**
 * S4 — real per-group dates, not `new Date()`.
 *
 * Every entry used to carry the build time, so all 39 URLs claimed to have changed today,
 * on every deploy, including deploys that touched none of them. Google notices a sitemap
 * whose lastmod is always "now" and stops believing the field at all — which costs
 * exactly the pages where it would have helped.
 *
 * These are commit dates from `git log` for the content behind each group, and they are
 * constants so a rebuild does not move them. **Bump the line when you change that
 * content.** The localized routes read 2026-08-03 truthfully: F3 changed which language
 * every one of those URLs serves, which is as substantive as a content edit gets.
 */
const LASTMOD = {
  localized: new Date('2026-08-03'), // home, sections and service detail pages, all locales
  guideSeoGeo: new Date('2026-04-30'),
  guides: new Date('2026-07-29'),
  legal: new Date('2026-04-28'),
} as const;

const abs = (path: string) => (path === '/' ? BASE : `${BASE}${path}`);

/** hreflang block for a path that exists in every locale. */
const alternatesFor = (path: (locale: Locale) => string) => ({
  languages: {
    'he-IL': abs(path('he')),
    'en-US': abs(path('en')),
    'ru-RU': abs(path('ru')),
    'x-default': abs(path('en')),
  },
});

/** Non-default locales rank just below the default; the order is en > he > ru. */
const byLocale = (base: number, locale: Locale) =>
  base - (locale === 'en' ? 0 : locale === 'he' ? 0.01 : 0.03);

const SERVICE_DETAILS = [
  'services/nextjs-development',
  'services/ai-integration',
  'services/automation-workflows',
  'services/growth-marketing',
];

const GUIDES = [
  'nextjs-seo-geo-2026',
  'nextjs-vs-wordpress',
  'website-cost-guide',
  'seo-for-small-business',
  'ai-in-web-development',
  'business-automation-guide',
];

export default function sitemap(): MetadataRoute.Sitemap {
  const entries: MetadataRoute.Sitemap = [];

  for (const locale of LOCALES) {
    entries.push({
      url: abs(homePath(locale)),
      lastModified: LASTMOD.localized,
      changeFrequency: 'monthly',
      priority: byLocale(1, locale),
      alternates: alternatesFor(homePath),
    });
  }

  for (const section of SECTIONS) {
    for (const locale of LOCALES) {
      entries.push({
        url: abs(sectionPath(section.id, locale)),
        lastModified: LASTMOD.localized,
        changeFrequency: 'monthly',
        priority: byLocale(section.id === 'services' ? 0.85 : 0.8, locale),
        alternates: alternatesFor((l) => sectionPath(section.id, l)),
      });
    }
  }

  for (const slug of SERVICE_DETAILS) {
    for (const locale of LOCALES) {
      entries.push({
        url: abs(localePath(slug, locale)),
        lastModified: LASTMOD.localized,
        changeFrequency: 'monthly',
        priority: byLocale(0.78, locale),
        alternates: alternatesFor((l) => localePath(slug, l)),
      });
    }
  }

  for (const slug of GUIDES) {
    entries.push({
      url: `${BASE}/guides/${slug}`,
      lastModified: slug === 'nextjs-seo-geo-2026' ? LASTMOD.guideSeoGeo : LASTMOD.guides,
      changeFrequency: 'monthly',
      priority: 0.7,
    });
  }

  for (const slug of ['privacy', 'terms', 'accessibility']) {
    entries.push({
      url: `${BASE}/${slug}`,
      lastModified: LASTMOD.legal,
      changeFrequency: 'yearly',
      priority: 0.3,
    });
  }

  return entries;
}
