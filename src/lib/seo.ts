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
