import type { MetadataRoute } from 'next';
import { siteConfig } from '@/lib/seo';

export default function sitemap(): MetadataRoute.Sitemap {
  const base = siteConfig.url;
  const languages = { he: `${base}`, en: `${base}/en`, ru: `${base}/ru` };

  return [
    {
      url: base,
      lastModified: new Date(),
      changeFrequency: 'monthly',
      priority: 1,
      alternates: { languages },
    },
    {
      url: `${base}/en`,
      lastModified: new Date(),
      changeFrequency: 'monthly',
      priority: 0.9,
      alternates: { languages },
    },
    {
      url: `${base}/ru`,
      lastModified: new Date(),
      changeFrequency: 'monthly',
      priority: 0.8,
      alternates: { languages },
    },
    {
      url: `${base}/accessibility`,
      lastModified: new Date(),
      changeFrequency: 'yearly',
      priority: 0.3,
      alternates: { languages: { he: `${base}/accessibility`, en: `${base}/accessibility`, ru: `${base}/accessibility` } },
    },
    {
      url: `${base}/services`,
      lastModified: new Date(),
      changeFrequency: 'monthly',
      priority: 0.85,
      alternates: { languages: { he: `${base}/services`, en: `${base}/en`, ru: `${base}/ru` } },
    },
    {
      url: `${base}/services/nextjs-development`,
      lastModified: new Date(),
      changeFrequency: 'monthly',
      priority: 0.8,
    },
    {
      url: `${base}/services/ai-integration`,
      lastModified: new Date(),
      changeFrequency: 'monthly',
      priority: 0.8,
    },
    {
      url: `${base}/services/automation-workflows`,
      lastModified: new Date(),
      changeFrequency: 'monthly',
      priority: 0.78,
    },
    {
      url: `${base}/services/growth-marketing`,
      lastModified: new Date(),
      changeFrequency: 'monthly',
      priority: 0.78,
    },
    {
      url: `${base}/guides/nextjs-seo-geo-2026`,
      lastModified: new Date(),
      changeFrequency: 'monthly',
      priority: 0.7,
    },
    {
      url: `${base}/privacy`,
      lastModified: new Date(),
      changeFrequency: 'yearly',
      priority: 0.3,
    },
    {
      url: `${base}/terms`,
      lastModified: new Date(),
      changeFrequency: 'yearly',
      priority: 0.3,
    },
  ];
}
