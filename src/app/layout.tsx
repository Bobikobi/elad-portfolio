import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import { Heebo } from "next/font/google";
import "./globals.css";
import ClientProviders from "@/components/layout/ClientProviders";

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
  metadataBase: new URL("https://elad-s-portfolio.vercel.app"),
  title: {
    default: "Elad Saadon | Full-Stack Developer & AI Systems Architect",
    template: "%s | Elad Saadon",
  },
  description:
    "Young developer specializing in full-stack web development, AI integration, cloud automation, and civic-tech solutions. Building real solutions that make a difference.",
  keywords: [
    "Elad Saadon",
    "Full-Stack Developer",
    "AI Developer",
    "Next.js",
    "React",
    "Automation",
    "Civic-Tech",
  ],
  alternates: { canonical: "/" },
  openGraph: {
    title: "Elad Saadon | Full-Stack Developer & AI Systems Architect",
    description:
      "Young developer specializing in full-stack web development, AI integration, cloud automation, and civic-tech solutions.",
    type: "website",
    locale: "he_IL",
    alternateLocale: ["en_US", "ru_RU"],
    images: [{ url: "/og-image.png", width: 1200, height: 630, alt: "Elad Saadon Portfolio" }],
  },
  twitter: {
    card: "summary_large_image",
    title: "Elad Saadon | Full-Stack Developer & AI Systems Architect",
    description:
      "Full-stack web development, AI integration, cloud automation, and civic-tech solutions.",
    images: ["/og-image.png"],
  },
  robots: { index: true, follow: true },
};

const jsonLd = {
  "@context": "https://schema.org",
  "@graph": [
    {
      "@type": "WebSite",
      name: "Elad Saadon Portfolio",
      url: "https://elad-s-portfolio.vercel.app",
      description:
        "Full-stack web development, AI integration, cloud automation, and civic-tech solutions.",
      inLanguage: ["he", "en", "ru"],
    },
    {
      "@type": "Person",
      name: "Elad Saadon",
      url: "https://elad-s-portfolio.vercel.app",
      jobTitle: "Full-Stack Developer & AI Systems Architect",
      knowsAbout: [
        "Full-Stack Development",
        "AI Integration",
        "Next.js",
        "React",
        "TypeScript",
        "Cloud Automation",
      ],
      sameAs: [
        "https://github.com/Bobikobi",
        "https://www.linkedin.com/in/elad-saadon-184809281/",
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
      <body className="min-h-full flex flex-col">
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
        />
        <ClientProviders>{children}</ClientProviders>
      </body>
    </html>
  );
}
