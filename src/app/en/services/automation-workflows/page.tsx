import type { Metadata } from 'next';
import Link from 'next/link';
import { RefreshCw, Bell, BarChart2, Link2, ArrowLeft } from 'lucide-react';
import { JsonLd } from '@/components/JsonLd';
import GradientBar from '@/components/ui/GradientBar';
import Breadcrumbs from '@/components/ui/Breadcrumbs';

export const metadata: Metadata = {
  title: 'Business Process Automation',
  description:
    'Planning and developing automations that reduce manual work: system integration, triggers, data processing, and automated reports with Node.js, Python, and APIs.',
  alternates: {
    canonical: 'https://www.eladsaadon.dev/en/services/automation-workflows',
    languages: {
      'he-IL': 'https://www.eladsaadon.dev/services/automation-workflows',
      'en-US': 'https://www.eladsaadon.dev/en/services/automation-workflows',
      'ru-RU': 'https://www.eladsaadon.dev/ru/services/automation-workflows',
    },
  },
};

const schemas = [
  {
    '@context': 'https://schema.org',
    '@type': 'Service',
    name: 'Business Workflow Automation Service',
    description: 'Automation pipelines for business operations, data handling, and reporting.',
    url: 'https://www.eladsaadon.dev/en/services/automation-workflows',
    provider: {
      '@type': 'Person',
      name: 'Elad Saadon',
      url: 'https://www.eladsaadon.dev',
    },
    areaServed: { '@type': 'Country', name: 'Israel' },
    serviceType: 'Automation Development',
  },
  {
    '@context': 'https://schema.org',
    '@type': 'FAQPage',
    mainEntity: [
      {
        '@type': 'Question',
        name: 'Which processes should I automate first?',
        acceptedAnswer: {
          '@type': 'Answer',
          text: 'Start with processes that repeat many times a week and consume manual time — usually reporting, data syncing, and operational tasks.',
        },
      },
      {
        '@type': 'Question',
        name: 'How do you measure automation success?',
        acceptedAnswer: {
          '@type': 'Answer',
          text: 'We measure time saved, reduction in manual errors, faster response times, and overall team output before and after implementation.',
        },
      },
    ],
  },
];

const outcomes = [
  {
    icon: RefreshCw,
    title: 'Less Repetitive Work',
    desc: 'Tasks that repeat over and over — data syncing, report generation, sending updates — run on their own without human touch.',
  },
  {
    icon: Bell,
    title: 'Real-Time Alerts',
    desc: 'When something needs attention, the team gets an immediate update. No discovering issues after the fact — respond before it becomes a problem.',
  },
  {
    icon: Link2,
    title: 'Connected Systems',
    desc: 'CRM, email, spreadsheets, APIs — everything talks to each other. Information flows automatically and doesn\'t fall through the cracks.',
  },
  {
    icon: BarChart2,
    title: 'Transparency & Logs',
    desc: 'Every action is logged. It\'s always clear what ran, when, and with what result — easy to diagnose and improve.',
  },
];

export default function AutomationWorkflowsPage() {
  const breadcrumbs = [
    { label: 'Home', href: '/en' },
    { label: 'Services', href: '/en/services' },
    { label: 'Automation', href: '/en/services/automation-workflows' },
  ];

  return (
    <main className="mx-auto w-full max-w-4xl px-6 py-16 sm:px-8">
      <JsonLd data={schemas} />

      <GradientBar />
      <Breadcrumbs items={breadcrumbs} locale="en" />
      <h1 className="text-3xl font-bold text-[var(--color-text-primary)] sm:text-4xl">
        Business Process Automation
      </h1>
      <p className="mt-4 max-w-2xl text-base leading-8 text-[var(--color-text-secondary)]">
        When processes run themselves, the team frees up for work that requires real thinking. We build focused automations that start from the most painful bottleneck and deliver immediate results.
      </p>

      {/* Outcome cards */}
      <div className="mt-10 grid gap-5 sm:grid-cols-2">
        {outcomes.map((o) => {
          const Icon = o.icon;
          return (
            <div
              key={o.title}
              className="flex flex-col gap-3 rounded-xl border border-[var(--color-border-default)] bg-[var(--color-bg-secondary)] p-5"
            >
              <div className="w-9 h-9 rounded-lg bg-[var(--color-bg-tertiary)] flex items-center justify-center">
                <Icon size={18} strokeWidth={1.5} className="text-[var(--color-accent)]" />
              </div>
              <h2 className="text-base font-medium text-[var(--color-text-primary)]">{o.title}</h2>
              <p className="text-sm text-[var(--color-text-secondary)] leading-relaxed">{o.desc}</p>
            </div>
          );
        })}
      </div>

      {/* FAQ */}
      <section className="mt-14 space-y-4">
        <h2 className="text-2xl font-semibold text-[var(--color-text-primary)]">Frequently Asked Questions</h2>
        <article className="rounded-xl border border-[var(--color-border-default)] bg-[var(--color-bg-secondary)] p-5">
          <h3 className="text-base font-medium text-[var(--color-text-primary)]">Where do we start?</h3>
          <p className="mt-2 text-sm leading-7 text-[var(--color-text-secondary)]">
            We start with the process that repeats most often and consumes the most manual time. That is where the fastest ROI is.
          </p>
        </article>
        <article className="rounded-xl border border-[var(--color-border-default)] bg-[var(--color-bg-secondary)] p-5">
          <h3 className="text-base font-medium text-[var(--color-text-primary)]">How do we know the automation is working?</h3>
          <p className="mt-2 text-sm leading-7 text-[var(--color-text-secondary)]">
            Every process comes with logs, error alerts, and clear metrics — time saved, error reduction, increased throughput.
          </p>
        </article>
      </section>

      {/* CTA */}
      <section className="mt-14 flex flex-col gap-4 rounded-xl border border-[var(--color-border-default)] bg-[var(--color-bg-secondary)] p-6 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <p className="text-lg font-semibold text-[var(--color-text-primary)]">Got a process that eats up your time?</p>
          <p className="mt-1 text-sm text-[var(--color-text-secondary)]">Tell me about it and we will check if it can be automated.</p>
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
