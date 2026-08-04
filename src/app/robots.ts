import type { MetadataRoute } from 'next';
import { siteConfig } from '@/lib/seo';

export default function robots(): MetadataRoute.Robots {
  return {
    rules: [
      // S3 — /llms.txt and /llms-full.txt used to be listed here, which was a
      // contradiction: they exist so that crawlers and LLMs read them, and then they
      // were the only content forbidden to crawlers. /admin takes their place; it is
      // also `noindex` on the page itself, because robots.txt is a request and a
      // disallowed URL can still be indexed if something links to it.
      { userAgent: '*', allow: '/', disallow: ['/api/', '/_next/', '/admin'] },
    ],
    host: siteConfig.url,
    sitemap: `${siteConfig.url}/sitemap.xml`,
  };
}
