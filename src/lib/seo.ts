import type { Metadata } from 'next';

// F3 — English is the default locale and owns the un-prefixed URL space.
export const siteConfig = {
  name: 'Elad Saadon',
  brand: 'Elad Saadon Portfolio',
  url: 'https://www.eladsaadon.dev',
  locale: 'en_US',
  defaultTitle: 'Elad Saadon | Full-Stack Developer and AI Systems Architect',
  description:
    'Elad Saadon is a full-stack developer and AI systems architect from Israel, specializing in Next.js, React, TypeScript, AI integration, and cloud automation.',
  author: {
    name: 'Elad Saadon',
    url: 'https://www.eladsaadon.dev',
  },
  contacts: {
    email: 'eladeladsaa@gmail.com',
    github: 'https://github.com/Bobikobi',
    linkedin: 'https://www.linkedin.com/in/elad-saadon-184809281/',
  },
};

export const defaultMetadata: Metadata = {
  metadataBase: new URL(siteConfig.url),
  title: {
    default: siteConfig.defaultTitle,
    template: '%s | Elad Saadon',
  },
  description: siteConfig.description,
  authors: [siteConfig.author],
  alternates: {
    canonical: siteConfig.url,
    languages: {
      'he-IL': `${siteConfig.url}/he`,
      'en-US': siteConfig.url,
      'ru-RU': `${siteConfig.url}/ru`,
      'x-default': siteConfig.url,
    },
  },
  openGraph: {
    type: 'website',
    locale: siteConfig.locale,
    url: siteConfig.url,
    siteName: siteConfig.brand,
    images: [{ url: '/og/og-en.jpg', width: 1200, height: 630 }],
  },
  twitter: {
    card: 'summary_large_image',
    images: ['/og/og-en.jpg'],
  },
};

type OgLocale = 'he' | 'en' | 'ru';
const OG_LOCALE: Record<OgLocale, string> = { he: 'he_IL', en: 'en_US', ru: 'ru_RU' };
/** Link-preview card per language (WhatsApp, Telegram, X...). */
export const OG_IMAGE: Record<OgLocale, string> = {
  he: '/og/og-he.jpg',
  en: '/og/og-en.jpg',
  ru: '/og/og-ru.jpg',
};

/**
 * openGraph + twitter for one page. Next merges metadata shallowly, so a page that sets
 * openGraph at all replaces the root's whole block - image included. Every page that
 * localizes its preview goes through here so none of them ships without an image.
 */
export function socialMeta(locale: OgLocale, title: string, description: string, url: string): Pick<Metadata, 'openGraph' | 'twitter'> {
  const image = `${siteConfig.url}${OG_IMAGE[locale]}`;
  return {
    openGraph: {
      type: 'website',
      siteName: siteConfig.brand,
      locale: OG_LOCALE[locale],
      alternateLocale: (Object.keys(OG_LOCALE) as OgLocale[]).filter((l) => l !== locale).map((l) => OG_LOCALE[l]),
      url,
      title,
      description,
      images: [{ url: image, width: 1200, height: 630, alt: title }],
    },
    twitter: { card: 'summary_large_image', title, description, images: [image] },
  };
}

/** The name that closes every social title, per language ("About | Elad Saadon"). */
export const OG_NAME: Record<OgLocale, string> = { he: 'אלעד סעדון', en: 'Elad Saadon', ru: 'Элад Саадон' };

/**
 * Full metadata for one page: title, description, canonical and a localized social card.
 * A page that sets only title/description/alternates inherits the ROOT openGraph block
 * whole (Next merges metadata shallowly), so Facebook shows the home card with og:url =
 * home for it. Every page that is not a section page goes through here instead.
 */
export function pageMetadata(opts: {
  locale: OgLocale;
  title: string;
  description: string;
  /** Site-relative path, e.g. '/services/ai-integration'. */
  path: string;
  languages?: Record<string, string>;
  /** Guides and posts: emits og:type=article with the publish date and author. */
  article?: { publishedTime: string; modifiedTime?: string };
}): Metadata {
  const url = `${siteConfig.url}${opts.path}`;
  const social = socialMeta(opts.locale, `${opts.title} | ${OG_NAME[opts.locale]}`, opts.description, url);
  const openGraph: Metadata['openGraph'] = opts.article
    ? {
        ...social.openGraph,
        type: 'article',
        publishedTime: opts.article.publishedTime,
        modifiedTime: opts.article.modifiedTime,
        authors: [siteConfig.author.url],
      }
    : social.openGraph;
  return {
    ...social,
    openGraph,
    title: opts.title,
    description: opts.description,
    alternates: { canonical: url, ...(opts.languages ? { languages: opts.languages } : {}) },
  };
}
