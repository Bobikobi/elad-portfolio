import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import { Heebo } from "next/font/google";
import "./globals.css";
import ClientProviders from "@/components/layout/ClientProviders";
import { Analytics } from "@vercel/analytics/next";
import { SpeedInsights } from "@vercel/speed-insights/next";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

const heebo = Heebo({
  variable: "--font-heebo",
  subsets: ["hebrew", "latin"],
  weight: ["400", "500", "600", "700"],
});

export const metadata: Metadata = {
  metadataBase: new URL("https://www.eladsaadon.dev"),
  title: {
    default: "אלעד סעדון | מפתח פול-סטאק וארכיטקט מערכות בינה מלאכותית",
    template: "%s | אלעד סעדון",
  },
  description:
    "אלעד סעדון הוא מפתח פול-סטאק וארכיטקט מערכות בינה מלאכותית מישראל, עם התמחות בפיתוח מערכות ווב, אינטגרציית בינה מלאכותית ואוטומציה בענן.",
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
      "he-IL": "https://www.eladsaadon.dev",
      "en-US": "https://www.eladsaadon.dev/en",
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
    title: "אלעד סעדון | מפתח פול-סטאק וארכיטקט מערכות בינה מלאכותית",
    description:
      "אלעד סעדון הוא מפתח פול-סטאק מישראל המתמחה בפיתוח מערכות, אינטגרציית בינה מלאכותית, אוטומציה בענן ופתרונות טכנולוגיים למגזר הציבורי.",
    type: "website",
    locale: "he_IL",
    alternateLocale: ["en_US", "ru_RU"],
    siteName: "Elad Saadon Portfolio",
    url: "https://www.eladsaadon.dev",
    images: [{ url: "/og-image.png", width: 1200, height: 630, alt: "Elad Saadon — Full-Stack Developer & AI Systems Architect" }],
  },
  twitter: {
    card: "summary_large_image",
    title: "אלעד סעדון | מפתח פול-סטאק וארכיטקט מערכות בינה מלאכותית",
    description:
      "אלעד סעדון הוא מפתח פול-סטאק מישראל המתמחה בפיתוח מערכות, אינטגרציית בינה מלאכותית ואוטומציה בענן.",
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
      name: "אלעד סעדון | Elad Saadon — Full-Stack Developer & AI Systems Architect",
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
        caption: "Elad Saadon — Full-Stack Developer & AI Systems Architect",
      },
      jobTitle: "Full-Stack Developer & AI Systems Architect",
      description:
        "Elad Saadon (אלעד סעדון) is a full-stack developer and AI systems architect from Israel with a B.A. in Social Work. He builds production-grade web applications with Next.js, React, TypeScript, Tailwind CSS, and Supabase. He integrates AI capabilities using Google Gemini (Vision AI + Function Calling) and deploys across Vercel, GCP, and Oracle Cloud. His portfolio includes 10+ production projects: autonomous AI systems, municipal emergency management platforms, civic-tech tools, and community marketing solutions.",
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
      name: "Elad Saadon — Full-Stack Developer & AI Systems Architect",
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

function getLocaleFromPath(path: string): { lang: string; dir: string } {
  const seg = path.split('/')[1];
  if (seg === 'en') return { lang: 'en', dir: 'ltr' };
  if (seg === 'ru') return { lang: 'ru', dir: 'ltr' };
  return { lang: 'he', dir: 'rtl' };
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  // This hook only runs on client, so fallback to he/rtl for SSR, but hydrate instantly.
  let lang = 'he';
  let dir = 'rtl';
  if (typeof window !== 'undefined') {
    const { lang: l, dir: d } = getLocaleFromPath(window.location.pathname);
    lang = l;
    dir = d;
  }
  return (
    <html
      lang={lang}
      dir={dir}
      className={`${geistSans.variable} ${geistMono.variable} ${heebo.variable} h-full antialiased`}
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
        <meta name="subject" content="אלעד סעדון | Elad Saadon — Full-Stack Developer &amp; AI Systems Architect" />
        <meta name="classification" content="Personal Portfolio" />
        <meta name="coverage" content="Israel" />
        <meta name="language" content="Hebrew, English, Russian" />
      </head>
      <body className="min-h-full flex flex-col">
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
        />
        <ClientProviders>{children}</ClientProviders>
        <Analytics />
        <SpeedInsights />
      </body>
    </html>
  );
}
