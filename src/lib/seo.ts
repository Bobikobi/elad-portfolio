import type { Metadata } from 'next';

export const siteConfig = {
  name: 'Elad Saadon',
  brand: 'Elad Saadon Portfolio',
  url: 'https://www.eladsaadon.dev',
  locale: 'he_IL',
  defaultTitle: 'אלעד סעדון | מפתח Full-Stack וארכיטקט מערכות AI',
  description:
    'אלעד סעדון הוא מפתח Full-Stack וארכיטקט מערכות AI מישראל, עם התמחות ב-Next.js, React, TypeScript, אינטגרציית AI ואוטומציה בענן.',
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
      'he-IL': siteConfig.url,
      'en-US': `${siteConfig.url}/en`,
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
