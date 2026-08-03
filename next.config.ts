import type { NextConfig } from "next";

// React's dev build uses eval() for debugging (callstack reconstruction); prod never does.
// Allow it in dev only so the console isn't spammed, without weakening the production CSP.
const isDev = process.env.NODE_ENV !== 'production';
// No googletagmanager here: Google Analytics is not wired into the app at all. The
// allowance was left over from a GA integration that never landed (`NEXT_PUBLIC_GA_ID`
// is referenced by nothing in src/), so it bought no functionality and only widened what
// a successful injection could reach.
const scriptSrc = `script-src 'self' 'unsafe-inline'${isDev ? " 'unsafe-eval'" : ''}`;

const securityHeaders = [
  { key: 'X-DNS-Prefetch-Control', value: 'on' },
  { key: 'X-Frame-Options', value: 'SAMEORIGIN' },
  { key: 'X-Content-Type-Options', value: 'nosniff' },
  { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
  { key: 'Permissions-Policy', value: 'camera=(), microphone=(), geolocation=(), browsing-topics=()' },
  { key: 'Strict-Transport-Security', value: 'max-age=63072000; includeSubDomains; preload' },
  {
    key: 'Content-Security-Policy',
    value: [
      "default-src 'self'",
      scriptSrc,
      "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com",
      "font-src 'self' https://fonts.gstatic.com",
      "img-src 'self' data: blob: https: https://image.thum.io",
      "connect-src 'self' https:",
      "frame-src 'self' https://netanya-civil.vercel.app https://political-compass-il.vercel.app https://honey-site-seven.vercel.app https://www.shaperz.co.il",
      "object-src 'none'",
      "base-uri 'self'",
      "form-action 'self'",
    ].join('; '),
  },
];

const nextConfig: NextConfig = {
  trailingSlash: false,
  // This machine has 7.8 GB of RAM. The dev server's default behaviour — keep
  // every compiled page resident and preload all entries on boot — is what
  // pushed the system into OOM on 2026-07-27. Both settings are documented in
  // next/dist/docs/01-app/02-guides/memory-usage.md and onDemandEntries.md.
  onDemandEntries: {
    maxInactiveAge: 25 * 1000,
    pagesBufferLength: 2,
  },
  experimental: {
    preloadEntriesOnStart: false,
  },
  async redirects() {
    return [
      // Redirect non-www to www (canonical domain)
      {
        source: '/:path*',
        has: [{ type: 'host', value: 'eladsaadon.dev' }],
        destination: 'https://www.eladsaadon.dev/:path*',
        permanent: true, // 308 redirect — preserves SEO juice
      },
      // F3 — English moved from /en to the un-prefixed root, so every previously
      // indexed /en URL folds onto its new home instead of 404-ing. Two rules, not
      // one: `/en/:path*` does not match the bare `/en`.
      { source: '/en', destination: '/', permanent: true },
      { source: '/en/:path*', destination: '/:path*', permanent: true },
    ];
  },
  async headers() {
    return [
      {
        source: '/(.*)',
        headers: securityHeaders,
      },
      // Cache static assets aggressively for Core Web Vitals
      {
        source: '/fonts/(.*)',
        headers: [
          { key: 'Cache-Control', value: 'public, max-age=31536000, immutable' },
        ],
      },
      {
        source: '/images/(.*)',
        headers: [
          { key: 'Cache-Control', value: 'public, max-age=31536000, immutable' },
        ],
      },
      {
        source: '/textures/(.*)',
        headers: [
          { key: 'Cache-Control', value: 'public, max-age=31536000, immutable' },
        ],
      },
      {
        source: '/llms.txt',
        headers: [
          { key: 'Content-Type', value: 'text/plain; charset=utf-8' },
        ],
      },
      {
        source: '/llms-full.txt',
        headers: [
          { key: 'Content-Type', value: 'text/plain; charset=utf-8' },
        ],
      },
    ];
  },
};

export default nextConfig;

