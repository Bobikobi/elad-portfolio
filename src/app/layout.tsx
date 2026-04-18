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
  metadataBase: new URL("https://eladsaadon.dev"),
  title: {
    default: "Elad Saadon | Full-Stack Developer & AI Systems Architect",
    template: "%s | Elad Saadon",
  },
  description:
    "Elad Saadon is a full-stack developer specializing in Next.js, React, TypeScript, AI integration with Google Gemini, cloud automation (GCP, Oracle Cloud, Vercel), and civic-tech solutions. Based in Israel, building real products that make a difference.",
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
  authors: [{ name: "Elad Saadon", url: "https://eladsaadon.dev" }],
  creator: "Elad Saadon",
  publisher: "Elad Saadon",
  category: "Technology",
  alternates: {
    canonical: "/",
    languages: {
      "he-IL": "/",
      "en-US": "/",
      "ru-RU": "/",
    },
  },
  openGraph: {
    title: "Elad Saadon | Full-Stack Developer & AI Systems Architect",
    description:
      "Full-stack developer specializing in Next.js, AI integration, cloud automation, and civic-tech solutions. Building real products that make a difference.",
    type: "website",
    locale: "he_IL",
    alternateLocale: ["en_US", "ru_RU"],
    siteName: "Elad Saadon Portfolio",
    url: "https://eladsaadon.dev",
    images: [{ url: "/og-image.png", width: 1200, height: 630, alt: "Elad Saadon — Full-Stack Developer & AI Systems Architect" }],
  },
  twitter: {
    card: "summary_large_image",
    title: "Elad Saadon | Full-Stack Developer & AI Systems Architect",
    description:
      "Full-stack developer specializing in Next.js, AI integration, cloud automation, and civic-tech solutions.",
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
  other: {
    "google-site-verification": "REPLACE_WITH_YOUR_VERIFICATION_CODE",
  },
};

const jsonLd = {
  "@context": "https://schema.org",
  "@graph": [
    {
      "@type": "WebSite",
      "@id": "https://eladsaadon.dev/#website",
      name: "Elad Saadon Portfolio",
      url: "https://eladsaadon.dev",
      description:
        "Full-stack web development, AI integration, cloud automation, and civic-tech solutions.",
      inLanguage: ["he", "en", "ru"],
      publisher: { "@id": "https://eladsaadon.dev/#person" },
    },
    {
      "@type": "ProfilePage",
      "@id": "https://eladsaadon.dev/#profilepage",
      url: "https://eladsaadon.dev",
      name: "Elad Saadon — Full-Stack Developer & AI Systems Architect",
      isPartOf: { "@id": "https://eladsaadon.dev/#website" },
      mainEntity: { "@id": "https://eladsaadon.dev/#person" },
      dateCreated: "2026-04-05",
      dateModified: new Date().toISOString().split("T")[0],
      inLanguage: "he",
    },
    {
      "@type": "Person",
      "@id": "https://eladsaadon.dev/#person",
      name: "Elad Saadon",
      alternateName: "אלעד סעדון",
      url: "https://eladsaadon.dev",
      image: {
        "@type": "ImageObject",
        url: "https://eladsaadon.dev/og-image.png",
        width: 1200,
        height: 630,
      },
      email: "eladeladsaa@gmail.com",
      jobTitle: "Full-Stack Developer & AI Systems Architect",
      description:
        "Full-stack developer with a B.A. in Social Work, specializing in Next.js, React, TypeScript, AI integration with Google Gemini, cloud automation across GCP/Oracle Cloud/Vercel, and civic-tech solutions. Built 10+ production projects including autonomous AI systems, municipal emergency management platforms, and community marketing tools.",
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
      ],
      knowsLanguage: [
        { "@type": "Language", name: "Hebrew", alternateName: "he" },
        { "@type": "Language", name: "English", alternateName: "en" },
        { "@type": "Language", name: "Russian", alternateName: "ru" },
      ],
      alumniOf: {
        "@type": "EducationalOrganization",
        name: "B.A. in Social Work",
      },
      nationality: { "@type": "Country", name: "Israel" },
      sameAs: [
        "https://github.com/Bobikobi",
        "https://www.linkedin.com/in/elad-saadon-184809281/",
      ],
    },
    // Service offerings — helps Google understand what the site offers
    {
      "@type": "Service",
      "@id": "https://eladsaadon.dev/#service-web",
      name: "Full-Stack Web Development",
      description:
        "End-to-end web applications using React, Next.js, TypeScript, Tailwind CSS, and Supabase. From design to deployment on Vercel.",
      provider: { "@id": "https://eladsaadon.dev/#person" },
      serviceType: "Web Development",
      areaServed: { "@type": "Country", name: "Israel" },
    },
    {
      "@type": "Service",
      "@id": "https://eladsaadon.dev/#service-ai",
      name: "AI Integration & Automation",
      description:
        "Custom AI solutions using Google Gemini, autonomous bots, intelligent pipelines, and workflow automation.",
      provider: { "@id": "https://eladsaadon.dev/#person" },
      serviceType: "AI Development",
    },
    {
      "@type": "Service",
      "@id": "https://eladsaadon.dev/#service-civic",
      name: "Civic-Tech Solutions",
      description:
        "Municipal and civic technology platforms including emergency management systems, political tools, and community platforms.",
      provider: { "@id": "https://eladsaadon.dev/#person" },
      serviceType: "Civic Technology",
    },
    // FAQ — appears in "People also ask" + AI search citations
    {
      "@type": "FAQPage",
      "@id": "https://eladsaadon.dev/#faq",
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
      ],
    },
    // Speakable — tells AI which parts of the page are most citable
    {
      "@type": "WebPage",
      "@id": "https://eladsaadon.dev/#webpage",
      url: "https://eladsaadon.dev",
      name: "Elad Saadon — Full-Stack Developer & AI Systems Architect",
      isPartOf: { "@id": "https://eladsaadon.dev/#website" },
      about: { "@id": "https://eladsaadon.dev/#person" },
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
          item: "https://eladsaadon.dev",
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
