import type { MetadataRoute } from 'next';

export default function robots(): MetadataRoute.Robots {
  return {
    rules: [
      // All search engines + AI crawlers
      { userAgent: '*', allow: '/' },
      // Explicitly allow AI crawlers for GEO (Generative Engine Optimization)
      { userAgent: 'GPTBot', allow: '/' },
      { userAgent: 'OAI-SearchBot', allow: '/' },
      { userAgent: 'Google-Extended', allow: '/' },
      { userAgent: 'GoogleOther', allow: '/' },
      { userAgent: 'ChatGPT-User', allow: '/' },
      { userAgent: 'PerplexityBot', allow: '/' },
      { userAgent: 'ClaudeBot', allow: '/' },
      { userAgent: 'anthropic-ai', allow: '/' },
      { userAgent: 'Applebot-Extended', allow: '/' },
      { userAgent: 'Amazonbot', allow: '/' },
      { userAgent: 'FacebookBot', allow: '/' },
      { userAgent: 'cohere-ai', allow: '/' },
    ],
    host: 'https://www.eladsaadon.dev',
    sitemap: 'https://www.eladsaadon.dev/sitemap.xml',
  };
}
