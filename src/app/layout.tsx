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
  title: "Elad Saadon | Full-Stack Developer & AI Systems Architect",
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
  openGraph: {
    title: "Elad Saadon | Full-Stack Developer & AI Systems Architect",
    description:
      "Young developer specializing in full-stack web development, AI integration, cloud automation, and civic-tech solutions.",
    type: "website",
    locale: "he_IL",
    alternateLocale: ["en_US", "ru_RU"],
  },
  robots: { index: true, follow: true },
  icons: { icon: '/logo.png', apple: '/logo.png' },
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
        <ClientProviders>{children}</ClientProviders>
      </body>
    </html>
  );
}
