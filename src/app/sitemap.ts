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
      alternates: {
        languages: {
          he: `${base}/services`,
          en: `${base}/en/services`,
          ru: `${base}/ru/services`,
          'x-default': `${base}/services`,
        },
      },
    },
    {
      url: `${base}/en/services`,
      lastModified: new Date(),
      changeFrequency: 'monthly',
      priority: 0.84,
      alternates: {
        languages: {
          he: `${base}/services`,
          en: `${base}/en/services`,
          ru: `${base}/ru/services`,
          'x-default': `${base}/services`,
        },
      },
    },
    {
      url: `${base}/ru/services`,
      lastModified: new Date(),
      changeFrequency: 'monthly',
      priority: 0.82,
      alternates: {
        languages: {
          he: `${base}/services`,
          en: `${base}/en/services`,
          ru: `${base}/ru/services`,
          'x-default': `${base}/services`,
        },
      },
    },
    {
      url: `${base}/services/nextjs-development`,
      lastModified: new Date(),
      changeFrequency: 'monthly',
      priority: 0.8,
      alternates: {
        languages: {
          he: `${base}/services/nextjs-development`,
          en: `${base}/en/services/nextjs-development`,
          ru: `${base}/ru/services/nextjs-development`,
          'x-default': `${base}/services/nextjs-development`,
        },
      },
    },
    {
      url: `${base}/en/services/nextjs-development`,
      lastModified: new Date(),
      changeFrequency: 'monthly',
      priority: 0.79,
      alternates: {
        languages: {
          he: `${base}/services/nextjs-development`,
          en: `${base}/en/services/nextjs-development`,
          ru: `${base}/ru/services/nextjs-development`,
          'x-default': `${base}/services/nextjs-development`,
        },
      },
    },
    {
      url: `${base}/ru/services/nextjs-development`,
      lastModified: new Date(),
      changeFrequency: 'monthly',
      priority: 0.77,
      alternates: {
        languages: {
          he: `${base}/services/nextjs-development`,
          en: `${base}/en/services/nextjs-development`,
          ru: `${base}/ru/services/nextjs-development`,
          'x-default': `${base}/services/nextjs-development`,
        },
      },
    },
    {
      url: `${base}/services/ai-integration`,
      lastModified: new Date(),
      changeFrequency: 'monthly',
      priority: 0.8,
      alternates: {
        languages: {
          he: `${base}/services/ai-integration`,
          en: `${base}/en/services/ai-integration`,
          ru: `${base}/ru/services/ai-integration`,
          'x-default': `${base}/services/ai-integration`,
        },
      },
    },
    {
      url: `${base}/en/services/ai-integration`,
      lastModified: new Date(),
      changeFrequency: 'monthly',
      priority: 0.79,
      alternates: {
        languages: {
          he: `${base}/services/ai-integration`,
          en: `${base}/en/services/ai-integration`,
          ru: `${base}/ru/services/ai-integration`,
          'x-default': `${base}/services/ai-integration`,
        },
      },
    },
    {
      url: `${base}/ru/services/ai-integration`,
      lastModified: new Date(),
      changeFrequency: 'monthly',
      priority: 0.77,
      alternates: {
        languages: {
          he: `${base}/services/ai-integration`,
          en: `${base}/en/services/ai-integration`,
          ru: `${base}/ru/services/ai-integration`,
          'x-default': `${base}/services/ai-integration`,
        },
      },
    },
    {
      url: `${base}/services/automation-workflows`,
      lastModified: new Date(),
      changeFrequency: 'monthly',
      priority: 0.78,
      alternates: {
        languages: {
          he: `${base}/services/automation-workflows`,
          en: `${base}/en/services/automation-workflows`,
          ru: `${base}/ru/services/automation-workflows`,
          'x-default': `${base}/services/automation-workflows`,
        },
      },
    },
    {
      url: `${base}/en/services/automation-workflows`,
      lastModified: new Date(),
      changeFrequency: 'monthly',
      priority: 0.77,
      alternates: {
        languages: {
          he: `${base}/services/automation-workflows`,
          en: `${base}/en/services/automation-workflows`,
          ru: `${base}/ru/services/automation-workflows`,
          'x-default': `${base}/services/automation-workflows`,
        },
      },
    },
    {
      url: `${base}/ru/services/automation-workflows`,
      lastModified: new Date(),
      changeFrequency: 'monthly',
      priority: 0.75,
      alternates: {
        languages: {
          he: `${base}/services/automation-workflows`,
          en: `${base}/en/services/automation-workflows`,
          ru: `${base}/ru/services/automation-workflows`,
          'x-default': `${base}/services/automation-workflows`,
        },
      },
    },
    {
      url: `${base}/services/growth-marketing`,
      lastModified: new Date(),
      changeFrequency: 'monthly',
      priority: 0.78,
      alternates: {
        languages: {
          he: `${base}/services/growth-marketing`,
          en: `${base}/en/services/growth-marketing`,
          ru: `${base}/ru/services/growth-marketing`,
          'x-default': `${base}/services/growth-marketing`,
        },
      },
    },
    {
      url: `${base}/en/services/growth-marketing`,
      lastModified: new Date(),
      changeFrequency: 'monthly',
      priority: 0.77,
      alternates: {
        languages: {
          he: `${base}/services/growth-marketing`,
          en: `${base}/en/services/growth-marketing`,
          ru: `${base}/ru/services/growth-marketing`,
          'x-default': `${base}/services/growth-marketing`,
        },
      },
    },
    {
      url: `${base}/ru/services/growth-marketing`,
      lastModified: new Date(),
      changeFrequency: 'monthly',
      priority: 0.75,
      alternates: {
        languages: {
          he: `${base}/services/growth-marketing`,
          en: `${base}/en/services/growth-marketing`,
          ru: `${base}/ru/services/growth-marketing`,
          'x-default': `${base}/services/growth-marketing`,
        },
      },
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
