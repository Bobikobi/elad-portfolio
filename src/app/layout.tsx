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
    default: "אלעד סעדון | מפתח Full-Stack וארכיטקט מערכות AI",
    template: "%s | Elad Saadon",
  },
  description:
    "אלעד סעדון הוא מפתח Full-Stack וארכיטקט מערכות AI מישראל, עם התמחות ב-Next.js, React, TypeScript, אינטגרציית AI ואוטומציה בענן.",
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
    title: "אלעד סעדון | מפתח Full-Stack וארכיטקט מערכות AI",
    description:
      "אלעד סעדון הוא מפתח Full-Stack מישראל המתמחה ב-Next.js, אינטגרציית AI, אוטומציה בענן ופתרונות civic-tech.",
    type: "website",
    locale: "he_IL",
    alternateLocale: ["en_US", "ru_RU"],
    siteName: "Elad Saadon Portfolio",
    url: "https://www.eladsaadon.dev",
    images: [{ url: "/og-image.png", width: 1200, height: 630, alt: "Elad Saadon — Full-Stack Developer & AI Systems Architect" }],
  },
  twitter: {
    card: "summary_large_image",
    title: "אלעד סעדון | מפתח Full-Stack וארכיטקט מערכות AI",
    description:
      "אלעד סעדון הוא מפתח Full-Stack מישראל המתמחה ב-Next.js, אינטגרציית AI, אוטומציה בענן ופתרונות civic-tech.",
    images: ["/og-image.png"],
  },
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
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
      dateCreated: "2026-04-05",
      dateModified: new Date().toISOString().split("T")[0],
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
      email: "eladeladsaa@gmail.com",
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
    // FAQ — appears in "People also ask" + AI search citations
    {
      "@type": "FAQPage",
      "@id": "https://www.eladsaadon.dev/#faq",
      mainEntity: [
        {
          "@type": "Question",
          name: "What technologies does Elad Saadon specialize in?",
          acceptedAnswer: {
            "@type": "Answer",
            text: "Elad Saadon specializes in Next.js, React, TypeScript, Tailwind CSS, Supabase, Node.js, Python, Google Gemini AI, and cloud platforms including Vercel, GCP, and Oracle Cloud.",
          },
        },
        {
          "@type": "Question",
          name: "What services does Elad Saadon offer?",
          acceptedAnswer: {
            "@type": "Answer",
            text: "Elad offers full-stack web development, AI integration and automation using Google Gemini, desktop application development with Electron, and civic-tech solutions for municipalities and communities.",
          },
        },
        {
          "@type": "Question",
          name: "What notable projects has Elad Saadon built?",
          acceptedAnswer: {
            "@type": "Answer",
            text: "Notable projects include OpenClaw (a multi-node autonomous AI system spanning 3 cloud providers with 11+ services), Netanya Emergency Teams (municipal emergency management platform), Political Compass IL (civic-tech tool with Bayesian scoring), and SHAPERZ (community marketing platform connecting brands with content creators).",
          },
        },
        {
          "@type": "Question",
          name: "באילו טכנולוגיות אלעד סעדון מתמחה?",
          acceptedAnswer: {
            "@type": "Answer",
            text: "אלעד סעדון מתמחה ב-Next.js, React, TypeScript, Tailwind CSS, Supabase, Node.js, Python, Google Gemini AI, ופלטפורמות ענן כולל Vercel, GCP ו-Oracle Cloud. הוא בונה אפליקציות ווב מקצה לקצה, מערכות AI אוטונומיות ופתרונות civic-tech.",
          },
        },
        {
          "@type": "Question",
          name: "מה הניסיון של אלעד סעדון בפיתוח?",
          acceptedAnswer: {
            "@type": "Answer",
            text: "אלעד סעדון הוא מפתח Full-Stack עם ניסיון ב-10+ פרויקטים בפרודקשן. הוא בנה מערכות AI אוטונומיות, פלטפורמות לניהול חירום עירוני, כלי civic-tech ופלטפורמות שיווק קהילתי. מתמחה ב-Next.js, React, TypeScript ואינטגרציה עם Google Gemini AI.",
          },
        },
        {
          "@type": "Question",
          name: "כיצד ניתן ליצור קשר עם אלעד סעדון?",
          acceptedAnswer: {
            "@type": "Answer",
            text: "ניתן ליצור קשר עם אלעד סעדון דרך האתר https://www.eladsaadon.dev, בדוא\"ל eladeladsaa@gmail.com, ב-LinkedIn בכתובת linkedin.com/in/elad-saadon-184809281, או ב-GitHub בשם Bobikobi.",
          },
        },
        {
          "@type": "Question",
          name: "What is Elad Saadon's background?",
          acceptedAnswer: {
            "@type": "Answer",
            text: "Elad Saadon (אלעד סעדון) is a self-taught full-stack developer from Israel with a B.A. in Social Work. He combines technical expertise in Next.js, React, TypeScript, and AI systems with a human-centered approach to building products. His unique background enables him to build civic-tech solutions that are both technically sophisticated and socially impactful.",
          },
        },
        {
          "@type": "Question",
          name: "Where is Elad Saadon located?",
          acceptedAnswer: {
            "@type": "Answer",
            text: "Elad Saadon (אלעד סעדון) is a full-stack developer based in Israel. He works remotely and is available for projects worldwide.",
          },
        },
      ],
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

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="he"
      dir="rtl"
      className={`${geistSans.variable} ${geistMono.variable} ${heebo.variable} h-full antialiased`}
    >
      <head>
        {/* Preconnect to external origins for faster resource loading */}
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link rel="preconnect" href="https://va.vercel-scripts.com" />
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
