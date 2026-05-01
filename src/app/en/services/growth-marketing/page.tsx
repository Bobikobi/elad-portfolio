import type { Metadata } from 'next';
import Link from 'next/link';
import { Filter, Mail, BarChart2, Sparkles, ArrowLeft } from 'lucide-react';
import { JsonLd } from '@/components/JsonLd';
import GradientBar from '@/components/ui/GradientBar';
import Breadcrumbs from '@/components/ui/Breadcrumbs';

export const metadata: Metadata = {
  title: 'Growth Marketing Automation',
  description:
    'Building measurable marketing infrastructure: lead automation, nurturing workflows, dashboards, and conversion funnels that connect product, content, and business results.',
  alternates: {
    canonical: 'https://www.eladsaadon.dev/en/services/growth-marketing',
    languages: {
      'he-IL': 'https://www.eladsaadon.dev/services/growth-marketing',
      'en-US': 'https://www.eladsaadon.dev/en/services/growth-marketing',
      'ru-RU': 'https://www.eladsaadon.dev/ru/services/growth-marketing',
    },
  },
};

const schemas = [
  {
    '@context': 'https://schema.org',
    '@type': 'Service',
    name: 'Growth Marketing Automation Service',
    description: 'Automation-first growth marketing implementation for lead pipelines and measurable conversion workflows.',
    url: 'https://www.eladsaadon.dev/en/services/growth-marketing',
    provider: {
      '@type': 'Person',
      name: 'Elad Saadon',
      url: 'https://www.eladsaadon.dev',
    },
    serviceType: 'Growth Marketing Automation',
    areaServed: { '@type': 'Country', name: 'Israel' },
  },
  {
    '@context': 'https://schema.org',
    '@type': 'FAQPage',
    mainEntity: [
      {
        '@type': 'Question',
        name: 'What does a good marketing infrastructure include?',
        acceptedAnswer: {
          '@type': 'Answer',
          text: 'A good infrastructure includes unified measurement, lead source management, automated follow-up, and a performance dashboard that connects campaigns, content, and actual conversions.',
        },
      },
      {
        '@type': 'Question',
        name: 'How do you integrate AI into marketing?',
        acceptedAnswer: {
          '@type': 'Answer',
          text: 'We integrate AI for content variation generation, conversation summarization, lead scoring, and message optimization. The goal is to shorten response time and improve conversion rates.',
        },
      },
    ],
  },
];

const components = [
  {
    icon: Filter,
    title: 'Lead Capture & Filtering',
    desc: 'Every incoming lead is automatically classified by source, quality, and behavior — the team talks only to those worth talking to.',
  },
  {
    icon: Mail,
    title: 'Timely Messaging',
    desc: 'A sequence of messages that adapts to each lead\'s stage in the funnel — not a one-time blast, but communication that builds trust.',
  },
  {
    icon: BarChart2,
    title: 'Performance Dashboard',
    desc: 'Weekly metrics at the campaign, channel, and content level — understand what works and improve based on data, not feelings.',
  },
  {
    icon: Sparkles,
    title: 'AI-Powered Marketing',
    desc: 'AI that scores leads, generates message variations, and summarizes conversations — less manual work, more time for strategy.',
  },
];

export default function GrowthMarketingPage() {
  const breadcrumbs = [
    { label: 'Home', href: '/en' },
    { label: 'Services', href: '/en/services' },
    { label: 'Growth Marketing', href: '/en/services/growth-marketing' },
  ];

  return (
    <main className="mx-auto w-full max-w-4xl px-6 py-16 sm:px-8">
      <JsonLd data={schemas} />

      <GradientBar />
      <Breadcrumbs items={breadcrumbs} locale="en" />
      <h1 className="text-3xl font-bold text-[var(--color-text-primary)] sm:text-4xl">
        Growth Marketing Automation
      </h1>
      <p className="mt-4 max-w-2xl text-base leading-8 text-[var(--color-text-secondary)]">
        Instead of manually tracking every lead, build an engine that does it automatically — from the moment someone arrives at your site to the moment they become a customer.
      </p>

      {/* Component cards */}
      <div className="mt-10 grid gap-5 sm:grid-cols-2">
        {components.map((c) => {
          const Icon = c.icon;
          return (
            <div
              key={c.title}
              className="flex flex-col gap-3 rounded-xl border border-[var(--color-border-default)] bg-[var(--color-bg-secondary)] p-5"
            >
              <div className="w-9 h-9 rounded-lg bg-[var(--color-bg-tertiary)] flex items-center justify-center">
                <Icon size={18} strokeWidth={1.5} className="text-[var(--color-accent)]" />
              </div>
              <h2 className="text-base font-medium text-[var(--color-text-primary)]">{c.title}</h2>
              <p className="text-sm text-[var(--color-text-secondary)] leading-relaxed">{c.desc}</p>
            </div>
          );
        })}
      </div>

      {/* FAQ */}
      <section className="mt-14 space-y-4">
        <h2 className="text-2xl font-semibold text-[var(--color-text-primary)]">Frequently Asked Questions</h2>
        <article className="rounded-xl border border-[var(--color-border-default)] bg-[var(--color-bg-secondary)] p-5">
          <h3 className="text-base font-medium text-[var(--color-text-primary)]">What does a good marketing infrastructure include?</h3>
          <p className="mt-2 text-sm leading-7 text-[var(--color-text-secondary)]">
            Unified measurement, lead source management, automated follow-up, and a dashboard connecting campaigns, content, and actual conversions.
          </p>
        </article>
        <article className="rounded-xl border border-[var(--color-border-default)] bg-[var(--color-bg-secondary)] p-5">
          <h3 className="text-base font-medium text-[var(--color-text-primary)]">Is this suitable for a small business?</h3>
          <p className="mt-2 text-sm leading-7 text-[var(--color-text-secondary)]">
            Yes. Small businesses have fewer manual resources, so automation saves proportionally more. We start with one point and expand as needed.
          </p>
        </article>
      </section>

      {/* CTA */}
      <section className="mt-14 flex flex-col gap-4 rounded-xl border border-[var(--color-border-default)] bg-[var(--color-bg-secondary)] p-6 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <p className="text-lg font-semibold text-[var(--color-text-primary)]">Want a growth engine that runs itself?</p>
          <p className="mt-1 text-sm text-[var(--color-text-secondary)]">Tell me about your channels and we will plan together.</p>
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
