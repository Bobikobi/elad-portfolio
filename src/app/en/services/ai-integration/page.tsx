import type { Metadata } from 'next';
import Link from 'next/link';
import { Bot, FileText, MessageSquare, Zap, ArrowLeft } from 'lucide-react';
import { JsonLd } from '@/components/JsonLd';
import GradientBar from '@/components/ui/GradientBar';
import Breadcrumbs from '@/components/ui/Breadcrumbs';

export const metadata: Metadata = {
  title: 'AI Integration for Existing and New Systems',
  description:
    'Integrate AI into web products: smart chat, document summarization, data classification, and automation with Gemini and OpenAI — securely.',
  alternates: {
    canonical: 'https://www.eladsaadon.dev/en/services/ai-integration',
    languages: {
      'he-IL': 'https://www.eladsaadon.dev/services/ai-integration',
      'en-US': 'https://www.eladsaadon.dev/en/services/ai-integration',
      'ru-RU': 'https://www.eladsaadon.dev/ru/services/ai-integration',
    },
  },
};

const schemas = [
  {
    '@context': 'https://schema.org',
    '@type': 'Service',
    name: 'AI Integration Service',
    description: 'LLM integration, AI-assisted workflows, and automation features for business applications.',
    url: 'https://www.eladsaadon.dev/en/services/ai-integration',
    provider: {
      '@type': 'Person',
      name: 'Elad Saadon',
      url: 'https://www.eladsaadon.dev',
    },
    areaServed: { '@type': 'Country', name: 'Israel' },
    serviceType: 'AI Integration and Automation',
  },
  {
    '@context': 'https://schema.org',
    '@type': 'FAQPage',
    mainEntity: [
      {
        '@type': 'Question',
        name: 'How do you integrate AI without risking sensitive data?',
        acceptedAnswer: {
          '@type': 'Answer',
          text: 'We set up permission layers, data filtering, and controlled logging. All AI calls go through the server only — keys and secrets are never exposed to the browser.',
        },
      },
      {
        '@type': 'Question',
        name: 'What processes can be automated with AI?',
        acceptedAnswer: {
          '@type': 'Answer',
          text: 'Documentation, summarizing inquiries, content generation, classification and prioritization of tasks, and extracting information from documents and forms.',
        },
      },
    ],
  },
];

const useCases = [
  {
    icon: MessageSquare,
    title: 'Smart Internal Assistant',
    desc: 'Teams find instant answers instead of searching through documentation for hours. AI that knows your product, policies, and organizational knowledge.',
  },
  {
    icon: FileText,
    title: 'Automated Document Processing',
    desc: 'Contracts, forms, and reports are automatically processed and summarized. Saves repetitive manual work and reduces errors.',
  },
  {
    icon: Zap,
    title: 'Smart Classification & Prioritization',
    desc: 'Inquiries, leads, and tasks are automatically ranked by importance and urgency — the team focuses on what really matters.',
  },
  {
    icon: Bot,
    title: 'Product Chat',
    desc: 'A built-in AI assistant within your interface that answers questions, guides users, and reduces support load.',
  },
];

export default function AiIntegrationPage() {
  const breadcrumbs = [
    { label: 'Home', href: '/en' },
    { label: 'Services', href: '/en/services' },
    { label: 'AI Integration', href: '/en/services/ai-integration' },
  ];

  return (
    <main className="mx-auto w-full max-w-4xl px-6 py-16 sm:px-8">
      <JsonLd data={schemas} />

      <GradientBar />
      <Breadcrumbs items={breadcrumbs} locale="en" />
      <h1 className="text-3xl font-bold text-[var(--color-text-primary)] sm:text-4xl">
        AI Integration for Digital Products
      </h1>
      <p className="mt-4 max-w-2xl text-base leading-8 text-[var(--color-text-secondary)]">
        Integrate AI capabilities into your product securely and measurably — so your team saves time and your users get a smarter experience.
      </p>

      {/* Use case cards */}
      <div className="mt-10 grid gap-5 sm:grid-cols-2">
        {useCases.map((u) => {
          const Icon = u.icon;
          return (
            <div
              key={u.title}
              className="flex flex-col gap-3 rounded-xl border border-[var(--color-border-default)] bg-[var(--color-bg-secondary)] p-5"
            >
              <div className="w-9 h-9 rounded-lg bg-[var(--color-bg-tertiary)] flex items-center justify-center">
                <Icon size={18} strokeWidth={1.5} className="text-[var(--color-accent)]" />
              </div>
              <h2 className="text-base font-medium text-[var(--color-text-primary)]">{u.title}</h2>
              <p className="text-sm text-[var(--color-text-secondary)] leading-relaxed">{u.desc}</p>
            </div>
          );
        })}
      </div>

      {/* FAQ */}
      <section className="mt-14 space-y-4">
        <h2 className="text-2xl font-semibold text-[var(--color-text-primary)]">Frequently Asked Questions</h2>
        <article className="rounded-xl border border-[var(--color-border-default)] bg-[var(--color-bg-secondary)] p-5">
          <h3 className="text-base font-medium text-[var(--color-text-primary)]">How do you keep data secure?</h3>
          <p className="mt-2 text-sm leading-7 text-[var(--color-text-secondary)]">
            All AI calls go through the server — keys and sensitive data are never exposed to the browser. We add permissions, filtering, and controlled logging.
          </p>
        </article>
        <article className="rounded-xl border border-[var(--color-border-default)] bg-[var(--color-bg-secondary)] p-5">
          <h3 className="text-base font-medium text-[var(--color-text-primary)]">What processes does AI work best on?</h3>
          <p className="mt-2 text-sm leading-7 text-[var(--color-text-secondary)]">
            Repetitive processes: documentation, summarizing inquiries, classification, extracting information from forms. That is where the ROI is clearest and most measurable.
          </p>
        </article>
      </section>

      {/* CTA */}
      <section className="mt-14 flex flex-col gap-4 rounded-xl border border-[var(--color-border-default)] bg-[var(--color-bg-secondary)] p-6 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <p className="text-lg font-semibold text-[var(--color-text-primary)]">Want AI in your product?</p>
          <p className="mt-1 text-sm text-[var(--color-text-secondary)]">Let us define together where AI delivers the most value.</p>
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
