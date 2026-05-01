import type { Metadata } from 'next';
import Link from 'next/link';
import { Globe, ShieldCheck, Gauge, Database, ArrowLeft } from 'lucide-react';
import { JsonLd } from '@/components/JsonLd';
import GradientBar from '@/components/ui/GradientBar';
import Breadcrumbs from '@/components/ui/Breadcrumbs';

export const metadata: Metadata = {
  title: 'Next.js Development for Businesses & Startups',
  description:
    'End-to-end Next.js development: architecture, performance, SEO, API integrations, and secure production deployment with TypeScript and Supabase.',
  alternates: {
    canonical: 'https://www.eladsaadon.dev/en/services/nextjs-development',
    languages: {
      'he-IL': 'https://www.eladsaadon.dev/services/nextjs-development',
      'en-US': 'https://www.eladsaadon.dev/en/services/nextjs-development',
      'ru-RU': 'https://www.eladsaadon.dev/ru/services/nextjs-development',
    },
  },
};

const schemas = [
  {
    '@context': 'https://schema.org',
    '@type': 'Service',
    name: 'Next.js Development Service',
    description: 'Full-stack Next.js development for web apps, dashboards, and public-facing websites.',
    url: 'https://www.eladsaadon.dev/en/services/nextjs-development',
    provider: {
      '@type': 'Person',
      name: 'Elad Saadon',
      url: 'https://www.eladsaadon.dev',
    },
    areaServed: { '@type': 'Country', name: 'Israel' },
    serviceType: 'Next.js Development',
  },
  {
    '@context': 'https://schema.org',
    '@type': 'FAQPage',
    mainEntity: [
      {
        '@type': 'Question',
        name: 'What does Next.js development service include?',
        acceptedAnswer: {
          '@type': 'Answer',
          text: 'Architecture planning, server-side and client-side development, API integrations, performance optimization, technical SEO, and full production deployment.',
        },
      },
      {
        '@type': 'Question',
        name: 'Can you upgrade an existing Next.js system?',
        acceptedAnswer: {
          '@type': 'Answer',
          text: 'Yes. We diagnose bottlenecks in performance, architecture, or SEO, and improve incrementally — without breaking what works.',
        },
      },
    ],
  },
];

const features = [
  {
    icon: Globe,
    title: 'Performance & SEO',
    desc: 'Green Core Web Vitals, SSR/ISR as needed, precise metadata, and schema that Google understands.',
  },
  {
    icon: ShieldCheck,
    title: 'Built-in Security',
    desc: 'Permissions, headers, rate-limiting, and OWASP Top 10 as part of the architecture — not an afterthought.',
  },
  {
    icon: Database,
    title: 'Data Layer',
    desc: 'Supabase, external APIs, cache management, and a database that handles load and syncs correctly.',
  },
  {
    icon: Gauge,
    title: 'Ready to Scale',
    desc: 'Clean, documented, and tested code — so the next feature is quick to add and not a headache.',
  },
];

export default function NextJsDevelopmentPage() {
  const breadcrumbs = [
    { label: 'Home', href: '/en' },
    { label: 'Services', href: '/en/services' },
    { label: 'Next.js Development', href: '/en/services/nextjs-development' },
  ];

  return (
    <main className="mx-auto w-full max-w-4xl px-6 py-16 sm:px-8">
      <JsonLd data={schemas} />

      <GradientBar />
      <Breadcrumbs items={breadcrumbs} locale="en" />
      <h1 className="text-3xl font-bold text-[var(--color-text-primary)] sm:text-4xl">
        Next.js Development for Businesses & Startups
      </h1>
      <p className="mt-4 max-w-2xl text-base leading-8 text-[var(--color-text-secondary)]">
        A Next.js product built right — fast for users, friendly to Google, secure in production, and easy to maintain. From scratch to full deployment.
      </p>

      {/* Feature cards */}
      <div className="mt-10 grid gap-5 sm:grid-cols-2">
        {features.map((f) => {
          const Icon = f.icon;
          return (
            <div
              key={f.title}
              className="flex flex-col gap-3 rounded-xl border border-[var(--color-border-default)] bg-[var(--color-bg-secondary)] p-5"
            >
              <div className="w-9 h-9 rounded-lg bg-[var(--color-bg-tertiary)] flex items-center justify-center">
                <Icon size={18} strokeWidth={1.5} className="text-[var(--color-accent)]" />
              </div>
              <h2 className="text-base font-medium text-[var(--color-text-primary)]">{f.title}</h2>
              <p className="text-sm text-[var(--color-text-secondary)] leading-relaxed">{f.desc}</p>
            </div>
          );
        })}
      </div>

      {/* FAQ */}
      <section className="mt-14 space-y-4">
        <h2 className="text-2xl font-semibold text-[var(--color-text-primary)]">Frequently Asked Questions</h2>
        <article className="rounded-xl border border-[var(--color-border-default)] bg-[var(--color-bg-secondary)] p-5">
          <h3 className="text-base font-medium text-[var(--color-text-primary)]">What does Next.js development service include?</h3>
          <p className="mt-2 text-sm leading-7 text-[var(--color-text-secondary)]">
            Architecture planning, UI development, server logic, database setup, API integrations, technical SEO, and full production deployment.
          </p>
        </article>
        <article className="rounded-xl border border-[var(--color-border-default)] bg-[var(--color-bg-secondary)] p-5">
          <h3 className="text-base font-medium text-[var(--color-text-primary)]">Can you upgrade what I have without rebuilding?</h3>
          <p className="mt-2 text-sm leading-7 text-[var(--color-text-secondary)]">
            Yes. We diagnose first: performance, architecture, SEO. Then improve in focused stages that don't break what works.
          </p>
        </article>
      </section>

      {/* CTA */}
      <section className="mt-14 flex flex-col gap-4 rounded-xl border border-[var(--color-border-default)] bg-[var(--color-bg-secondary)] p-6 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <p className="text-lg font-semibold text-[var(--color-text-primary)]">Have a Next.js project?</p>
          <p className="mt-1 text-sm text-[var(--color-text-secondary)]">Share the details and let's see what we can do together.</p>
        </div>
        <Link
          href="/#contact"
          className="shrink-0 inline-flex items-center gap-2 rounded-lg bg-[var(--color-accent)] px-5 py-2.5 text-sm font-medium text-white hover:bg-[var(--color-accent-hover)] transition-colors"
        >
          Let's Talk <ArrowLeft size={14} />
        </Link>
      </section>
    </main>
  );
}
