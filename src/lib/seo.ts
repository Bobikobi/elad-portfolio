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
    images: [{ url: '/og-image.png', width: 1200, height: 630 }],
  },
  twitter: {
    card: 'summary_large_image',
    images: ['/og-image.png'],
  },
};

type OgLocale = 'he' | 'en' | 'ru';
const OG_LOCALE: Record<OgLocale, string> = { he: 'he_IL', en: 'en_US', ru: 'ru_RU' };
/** Link-preview card per language (WhatsApp, Telegram, X...). */
export const OG_IMAGE: Record<OgLocale, string> = {
  he: '/og-image.png',
  en: '/og-image.png',
  ru: '/og-image.png',
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
