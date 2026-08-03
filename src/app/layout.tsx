import type { Metadata } from "next";
import { cookies, headers } from "next/headers";
import { Heebo, Frank_Ruhl_Libre, Playfair_Display, Inter } from "next/font/google";
import "./globals.css";
import ClientProviders from "@/components/layout/ClientProviders";
import type { Locale } from "@/lib/i18n";
import { DEFAULT_VIEW_MODE, VIEW_MODE_COOKIE, parseViewMode } from "@/lib/viewMode";
import { Analytics } from "@vercel/analytics/next";
import { SpeedInsights } from "@vercel/speed-insights/next";

// B9 — Geist and Geist Mono are gone. They were `create-next-app` debris: declared,
// preloaded on every route, wired to --font-sans/--font-mono, and used by nothing. The
// only cost of template leftovers is that they are invisible until someone measures.

// S6 — `preload: false` on ALL FOUR families, so each locale fetches only the files its
// own glyphs need.
//
// Per-locale PRELOAD cannot be expressed here, and it is worth writing down why rather
// than leaving the next person to rediscover it. next/font emits its preload links from
// the static module graph of a route, but the locale on this site is not static for the
// whole route space: the un-prefixed tree serves English AND the Hebrew-only guides, and
// since F3.2 the legal pages resolve their language from a COOKIE at request time. A
// build-time decision cannot follow a request-time value, so no arrangement of per-locale
// layouts can scope the preloads for those routes.
//
// Dropping preload gets the same end result by a different route: with no link forcing
// the fetch, the browser applies unicode-range and only downloads a file some rendered
// glyph actually needs. Measured before this change, a Russian page pulled 102.6 KB of
// Heebo and Frank Ruhl that `html[lang='ru']` never asks for - a preload link overrides
// exactly the judgement that would have skipped them.
//
// The cost is the head start on the fonts a page DOES use, which is why /he LCP is
// measured either side of this in docs/briefs/s6-fonts-verify.md.
const heebo = Heebo({
  variable: "--font-heebo",
  subsets: ["hebrew", "latin"],
  weight: ["400", "500", "600", "700"],
  preload: false,
});

// Display serif + body for he/en (Hebrew + Latin coverage).
const frankRuhl = Frank_Ruhl_Libre({
  variable: "--font-frank",
  subsets: ["hebrew", "latin"],
  weight: ["300", "500"],
  preload: false,
});
// Russian (Cyrillic) pair — matched roles: elegant serif display + clean body. These two
// have carried `preload: false` since B9, which is why they were already correctly scoped
// out of English and Hebrew pages; the two above have now joined them.
const playfair = Playfair_Display({
  variable: "--font-playfair",
  subsets: ["latin", "cyrillic"],
  weight: ["400"],
  preload: false,
});
const inter = Inter({
  variable: "--font-inter",
  subsets: ["latin", "cyrillic"],
  weight: ["300", "400", "500"],
  preload: false,
});

// F3 — English is the default locale, so the ROOT metadata (which every un-prefixed
// route inherits) is English. The Hebrew strings that used to live here were not
// rewritten, they moved intact to app/he/page.tsx, which is now Hebrew's own URL.
export const metadata: Metadata = {
  metadataBase: new URL("https://www.eladsaadon.dev"),
  title: {
    default: "Elad Saadon | Full-Stack Developer and AI Systems Architect",
    template: "%s | Elad Saadon",
  },
  description:
    "Elad Saadon is a full-stack developer and AI systems architect from Israel, specializing in Next.js, React, TypeScript, AI integration, and cloud automation.",
  keywords: [
    "Elad Saadon",
    "אלעד סעדון",
    "Full-Stack Developer",
    "מפתח פולסטאק",
    "AI Developer",
    "Next.js Developer",
    "React Developer",
    "TypeScript Developer",
    "AI Integration",
    "Google Gemini Developer",
    "Cloud Automation",
    "Civic-Tech",
    "פיתוח אתרים",
    "בינה מלאכותית",
    "מפתח ווב ישראל",
    "freelance developer Israel",
  ],
  authors: [{ name: "Elad Saadon", url: "https://www.eladsaadon.dev" }],
  creator: "Elad Saadon",
  publisher: "Elad Saadon",
  category: "Technology",
  alternates: {
    canonical: "https://www.eladsaadon.dev",
    languages: {
      "he-IL": "https://www.eladsaadon.dev/he",
      "en-US": "https://www.eladsaadon.dev",
      "ru-RU": "https://www.eladsaadon.dev/ru",
      "x-default": "https://www.eladsaadon.dev",
    },
  },
  icons: {
    icon: [
      { url: "/favicon.ico", type: "image/x-icon" },
      { url: "/favicon-48.png", sizes: "48x48", type: "image/png" },
      { url: "/favicon-192.png", sizes: "192x192", type: "image/png" },
      { url: "/favicon.png", sizes: "512x512", type: "image/png" },
    ],
    shortcut: [{ url: "/favicon.ico", type: "image/x-icon" }],
    apple: [{ url: "/favicon.png", sizes: "512x512", type: "image/png" }],
  },
  openGraph: {
    title: "Elad Saadon | Full-Stack Developer and AI Systems Architect",
    description:
      "Elad Saadon is a full-stack developer and AI systems architect from Israel, specializing in Next.js, React, TypeScript, AI integration, and cloud automation.",
    type: "website",
    locale: "en_US",
    alternateLocale: ["he_IL", "ru_RU"],
    siteName: "Elad Saadon Portfolio",
    url: "https://www.eladsaadon.dev",
    images: [{ url: "/og-image.png", width: 1200, height: 630, alt: "Elad Saadon - Full-Stack Developer and AI Systems Architect" }],
  },
  twitter: {
    card: "summary_large_image",
    title: "Elad Saadon | Full-Stack Developer and AI Systems Architect",
    description:
      "Elad Saadon is a full-stack developer and AI systems architect from Israel, specializing in Next.js, React, TypeScript, AI integration, and cloud automation.",
    images: ["/og-image.png"],
  },
  robots: {
    index: process.env.VERCEL_ENV === 'production',
    follow: process.env.VERCEL_ENV === 'production',
    googleBot: {
      index: process.env.VERCEL_ENV === 'production',
      follow: process.env.VERCEL_ENV === 'production',
      "max-video-preview": -1,
      "max-image-preview": "large",
      "max-snippet": -1,
    },
  },

};

const jsonLd = {
  "@context": "https://schema.org",
  "@graph": [
    {
      "@type": "WebSite",
      "@id": "https://www.eladsaadon.dev/#website",
      name: "Elad Saadon Portfolio | פורטפוליו אלעד סעדון",
      alternateName: ["Elad Saadon", "אלעד סעדון"],
      url: "https://www.eladsaadon.dev",
      description:
        "Hebrew and English portfolio of Elad Saadon: full-stack web development, AI integration, cloud automation, and civic-tech solutions.",
      inLanguage: ["he", "en", "ru"],
      publisher: { "@id": "https://www.eladsaadon.dev/#organization" },
    },
    {
      "@type": "ProfilePage",
      "@id": "https://www.eladsaadon.dev/#profilepage",
      url: "https://www.eladsaadon.dev",
      name: "אלעד סעדון | Elad Saadon - Full-Stack Developer and AI Systems Architect",
      isPartOf: { "@id": "https://www.eladsaadon.dev/#website" },
      mainEntity: { "@id": "https://www.eladsaadon.dev/#person" },
      dateCreated: "2026-04-05T00:00:00Z",
      dateModified: new Date().toISOString(),
      inLanguage: ["he", "en", "ru"],
    },
    {
      "@type": "Organization",
      "@id": "https://www.eladsaadon.dev/#organization",
      name: "Elad Saadon",
      url: "https://www.eladsaadon.dev",
      logo: {
        "@type": "ImageObject",
        url: "https://www.eladsaadon.dev/logo.png"
      },
      sameAs: [
        "https://github.com/Bobikobi",
        "https://www.linkedin.com/in/elad-saadon-184809281/"
      ]
    },
    {
      "@type": "Person",
      "@id": "https://www.eladsaadon.dev/#person",
      name: "אלעד סעדון (Elad Saadon)",
      alternateName: ["Elad Saadon", "Элад Саадон"],
      url: "https://www.eladsaadon.dev",
      image: {
        "@type": "ImageObject",
        url: "https://www.eladsaadon.dev/og-image.png",
        width: 1200,
        height: 630,
        caption: "Elad Saadon - Full-Stack Developer and AI Systems Architect",
      },
      jobTitle: "Full-Stack Developer & AI Systems Architect",
      description:
        "Elad Saadon (אלעד סעדון) is a full-stack developer and AI systems architect from Israel with a B.A. in Social Work. He builds production-grade web applications with Next.js, React, TypeScript, Tailwind CSS, and Supabase, plus real-time 3D on WebGL with Three.js and React Three Fiber, including custom GLSL shaders and post-processing pipelines. He integrates AI capabilities using Google Gemini (Vision AI + Function Calling) and deploys across Vercel, GCP, and Oracle Cloud. His portfolio includes 12+ production projects: autonomous AI systems, municipal emergency management platforms, civic-tech tools, and community marketing solutions.",
      hasOccupation: {
        "@type": "Occupation",
        name: "Full-Stack Developer",
        occupationLocation: { "@type": "Country", name: "Israel" },
        skills: "Next.js, React, TypeScript, Node.js, Python, Google Gemini, Supabase, Vercel, GCP, Oracle Cloud, Tailwind CSS, Electron",
        estimatedSalary: [],
      },
      worksFor: {
        "@type": "Organization",
        name: "Self-Employed",
        url: "https://www.eladsaadon.dev",
      },
      knowsAbout: [
        "Full-Stack Development",
        "AI Integration",
        "Next.js",
        "React",
        "TypeScript",
        "Google Gemini",
        "Cloud Automation",
        "Civic-Tech",
        "Supabase",
        "Node.js",
        "Python",
        "Electron",
        "Tailwind CSS",
        "Docker",
        "GCP",
        "Oracle Cloud",
        "Vercel",
      ],
      knowsLanguage: [
        { "@type": "Language", name: "Hebrew", alternateName: "he" },
        { "@type": "Language", name: "English", alternateName: "en" },
        { "@type": "Language", name: "Russian", alternateName: "ru" },
      ],
      alumniOf: {
        "@type": "EducationalOrganization",
        name: "Ruppin Academic Center",
        description: "B.A. in Social Work",
        address: { "@type": "PostalAddress", addressCountry: "IL" },
      },
      nationality: { "@type": "Country", name: "Israel" },
      address: {
        "@type": "PostalAddress",
        addressCountry: "IL",
        addressRegion: "Center District",
      },
      identifier: [
        { "@type": "PropertyValue", propertyID: "github", value: "Bobikobi" },
        { "@type": "PropertyValue", propertyID: "linkedin", value: "elad-saadon-184809281" },
      ],
      sameAs: [
        "https://github.com/Bobikobi",
        "https://www.linkedin.com/in/elad-saadon-184809281/",
        "https://www.eladsaadon.dev",
      ],
    },
    // Service offerings — helps Google understand what the site offers
    {
      "@type": "Service",
      "@id": "https://www.eladsaadon.dev/#service-web",
      name: "Full-Stack Web Development",
      description:
        "End-to-end web applications using React, Next.js, TypeScript, Tailwind CSS, and Supabase. From design to deployment on Vercel.",
      provider: { "@id": "https://www.eladsaadon.dev/#person" },
      serviceType: "Web Development",
      areaServed: { "@type": "Country", name: "Israel" },
    },
    {
      "@type": "Service",
      "@id": "https://www.eladsaadon.dev/#service-ai",
      name: "AI Integration & Automation",
      description:
        "Custom AI solutions using Google Gemini, autonomous bots, intelligent pipelines, and workflow automation.",
      provider: { "@id": "https://www.eladsaadon.dev/#person" },
      serviceType: "AI Development",
    },
    {
      "@type": "Service",
      "@id": "https://www.eladsaadon.dev/#service-civic",
      name: "Civic-Tech Solutions",
      description:
        "Municipal and civic technology platforms including emergency management systems, political tools, and community platforms.",
      provider: { "@id": "https://www.eladsaadon.dev/#person" },
      serviceType: "Civic Technology",
    },
    // Speakable — tells AI which parts of the page are most citable
    {
      "@type": "WebPage",
      "@id": "https://www.eladsaadon.dev/#webpage",
      url: "https://www.eladsaadon.dev",
      name: "Elad Saadon - Full-Stack Developer and AI Systems Architect",
      isPartOf: { "@id": "https://www.eladsaadon.dev/#website" },
      about: { "@id": "https://www.eladsaadon.dev/#person" },
      speakable: {
        "@type": "SpeakableSpecification",
        cssSelector: ["#about", "#services", "#tech"],
      },
    },
    // BreadcrumbList — site navigation hierarchy
    {
      "@type": "BreadcrumbList",
      itemListElement: [
        {
          "@type": "ListItem",
          position: 1,
          name: "Home",
          item: "https://www.eladsaadon.dev",
        },
      ],
    },
  ],
};

export default async function RootLayout({ children }: { children: React.ReactNode }) {
  // Locale is resolved server-side from the `x-locale` header set by the proxy (proxy.ts),
  // so the initial SSR HTML — content, <html lang> and dir — is correct for /he and /ru
  // instead of always defaulting to the English default and only correcting after hydration.
  const locale = (((await headers()).get("x-locale") as Locale | null) ?? "en");
  const dir = locale === "he" ? "rtl" : "ltr";
  // F2 - the view mode has to be known BEFORE the tree renders, because the section
  // routes render different children in each mode. Read here, stamped on <html> so CSS
  // can respond in the first paint, and handed to the provider so the client agrees.
  const chosenMode = parseViewMode((await cookies()).get(VIEW_MODE_COOKIE)?.value);
  const viewMode = chosenMode ?? DEFAULT_VIEW_MODE;
  return (
    <html
      lang={locale}
      dir={dir}
      data-view={viewMode}
      className={`${heebo.variable} ${frankRuhl.variable} ${playfair.variable} ${inter.variable} h-full antialiased`}
    >
      <head>
        {/* Preconnect to external origins for faster resource loading */}
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link rel="preconnect" href="https://va.vercel-scripts.com" />
        {/* Explicit favicon links for search engine favicon discovery */}
        <link rel="icon" href="/favicon-48.png" sizes="48x48" type="image/png" />
        <link rel="icon" href="/favicon-192.png" sizes="192x192" type="image/png" />
        <link rel="icon" href="/favicon.ico" type="image/x-icon" />
        {/* Digital identity links — help search engines & AI connect social profiles to this entity */}
        <link rel="me" href="https://github.com/Bobikobi" />
        <link rel="me" href="https://www.linkedin.com/in/elad-saadon-184809281/" />
        <meta name="author" content="Elad Saadon" />
        {/* Person entity hint for search engines */}
        <meta name="subject" content="Elad Saadon | אלעד סעדון - Full-Stack Developer and AI Systems Architect" />
        <meta name="classification" content="Personal Portfolio" />
        <meta name="coverage" content="Israel" />
        <meta name="language" content="English, Hebrew, Russian" />
      </head>
      <body className="min-h-full flex flex-col">
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
        />
        <ClientProviders
          initialLocale={locale}
          initialViewMode={viewMode}
          viewModeChosen={chosenMode !== null}
        >
          {children}
        </ClientProviders>
        <Analytics />
        <SpeedInsights />
      </body>
    </html>
  );
}
