import type { Metadata } from 'next';
import Link from 'next/link';
import { Globe, Bot, Workflow, TrendingUp, ArrowLeft, CheckCircle2 } from 'lucide-react';
import { JsonLd } from '@/components/JsonLd';
import GradientBar from '@/components/ui/GradientBar';

export const metadata: Metadata = {
  title: 'Development, AI & Automation Services',
  description:
    'Full-Stack development, AI integration, and business automation. Clean code, high performance, and secure production deployment.',
  alternates: {
    canonical: 'https://www.eladsaadon.dev/en/services',
    languages: {
      'he-IL': 'https://www.eladsaadon.dev/services',
      'en-US': 'https://www.eladsaadon.dev/en/services',
      'ru-RU': 'https://www.eladsaadon.dev/ru/services',
    },
  },
};

const serviceSchema = {
  '@context': 'https://schema.org',
  '@type': 'Service',
  name: 'Next.js, AI & Automation Development Services',
  description:
    'Full-stack web development, AI integration, and workflow automation delivered by Elad Saadon.',
  url: 'https://www.eladsaadon.dev/en/services',
  provider: {
    '@type': 'Person',
    name: 'Elad Saadon',
    url: 'https://www.eladsaadon.dev',
  },
  areaServed: { '@type': 'Country', name: 'Israel' },
  serviceType: 'Full-Stack Development and AI Integration',
};

const breadcrumbSchema = {
  '@context': 'https://schema.org',
  '@type': 'BreadcrumbList',
  itemListElement: [
    { '@type': 'ListItem', position: 1, name: 'Home', item: 'https://www.eladsaadon.dev/en' },
    { '@type': 'ListItem', position: 2, name: 'Services', item: 'https://www.eladsaadon.dev/en/services' },
  ],
};

const faqSchema = {
  '@context': 'https://schema.org',
  '@type': 'FAQPage',
  mainEntity: [
    {
      '@type': 'Question',
      name: 'What services do you offer for businesses and startups?',
      acceptedAnswer: {
        '@type': 'Answer',
        text: 'Full-Stack development with Next.js, AI integration with Gemini and OpenAI, process automation, internal tools, and secure production deployment.',
      },
    },
    {
      '@type': 'Question',
      name: 'Can you improve an existing system without rebuilding everything?',
      acceptedAnswer: {
        '@type': 'Answer',
        text: 'Yes. We typically start by identifying bottlenecks, improve performance and architecture incrementally, and integrate AI or automation in low-risk stages.',
      },
    },
    {
      '@type': 'Question',
      name: 'Is my project a good fit for this service?',
      acceptedAnswer: {
        '@type': 'Answer',
        text: 'If you have a digital product, a repetitive process, or an idea that needs building — probably yes. Send a quick message and I will check it out with you.',
      },
    },
  ],
};

const services = [
  {
    icon: Globe,
    title: 'Full-Stack Development',
    desc: 'From a fast UI to server logic and database — you get a complete, secure, and scalable product.',
    href: '/en/services/nextjs-development',
  },
  {
    icon: Bot,
    title: 'AI Integration',
    desc: 'Integrate smart assistants, document processing, and intelligent automation directly into your product.',
    href: '/en/services/ai-integration',
  },
  {
    icon: Workflow,
    title: 'Business Automation',
    desc: 'Connect systems, eliminate repetitive manual work, and add full transparency to your processes.',
    href: '/en/services/automation-workflows',
  },
  {
    icon: TrendingUp,
    title: 'Growth & Marketing',
    desc: 'Measurable marketing infrastructure: lead capture, conversion funnels, and a self-running performance dashboard.',
    href: '/en/services/growth-marketing',
  },
];

const highlights = [
  'Clean, documented code for long-term maintainability',
  'SEO, accessibility, and green Core Web Vitals',
  'Secure deployment with production monitoring',
];

export default function ServicesPage() {
  return (
    <main className="mx-auto w-full max-w-5xl px-6 py-16 sm:px-8">
      <JsonLd data={[serviceSchema, breadcrumbSchema, faqSchema]} />

      <GradientBar />
      <h1 className="text-3xl font-bold text-[var(--color-text-primary)] sm:text-4xl">
        Development, AI & Automation Services
      </h1>
      <p className="mt-4 max-w-2xl text-base leading-8 text-[var(--color-text-secondary)]">
        Solving real digital problems — from a website that drives traffic, through a product with built-in AI, to processes that run themselves and free your team for more important work.
      </p>

      {/* Service cards */}
      <div className="mt-10 grid gap-5 sm:grid-cols-2">
        {services.map((s) => {
          const Icon = s.icon;
          return (
            <Link
              key={s.href}
              href={s.href}
              className="group flex flex-col gap-3 rounded-xl border border-[var(--color-border-default)] bg-[var(--color-bg-secondary)] p-6 hover:border-[var(--color-border-subtle)] hover:shadow-[0_0_0_1px_rgba(139,92,246,0.1),0_8px_40px_rgba(0,0,0,0.3)] transition-all duration-300"
            >
              <div className="w-10 h-10 rounded-lg bg-[var(--color-bg-tertiary)] flex items-center justify-center group-hover:bg-[var(--color-accent-glow)] transition-colors">
                <Icon size={20} strokeWidth={1.5} className="text-[var(--color-accent)]" />
              </div>
              <h2 className="text-lg font-medium text-[var(--color-text-primary)]">{s.title}</h2>
              <p className="text-sm text-[var(--color-text-secondary)] leading-relaxed">{s.desc}</p>
              <span className="mt-auto flex items-center gap-1 text-sm text-[var(--color-accent)] group-hover:gap-2 transition-all">
                Learn more <ArrowLeft size={14} />
              </span>
            </Link>
          );
        })}
      </div>

      {/* Highlights */}
      <ul className="mt-10 flex flex-col gap-3 sm:flex-row sm:flex-wrap">
        {highlights.map((h) => (
          <li key={h} className="flex items-center gap-2 text-sm text-[var(--color-text-secondary)]">
            <CheckCircle2 size={15} className="shrink-0 text-[var(--color-accent)]" />
            {h}
          </li>
        ))}
      </ul>

      {/* FAQ */}
      <section className="mt-14 space-y-4">
        <h2 className="text-2xl font-semibold text-[var(--color-text-primary)]">Frequently Asked Questions</h2>
        <article className="rounded-xl border border-[var(--color-border-default)] bg-[var(--color-bg-secondary)] p-5">
          <h3 className="text-base font-medium text-[var(--color-text-primary)]">Do you work on existing systems?</h3>
          <p className="mt-2 text-sm leading-7 text-[var(--color-text-secondary)]">
            Yes. Sometimes the fastest improvement comes from upgrading architecture, optimizing performance, and adding an automation layer — without a full rewrite.
          </p>
        </article>
        <article className="rounded-xl border border-[var(--color-border-default)] bg-[var(--color-bg-secondary)] p-5">
          <h3 className="text-base font-medium text-[var(--color-text-primary)]">Is my project a good fit?</h3>
          <p className="mt-2 text-sm leading-7 text-[var(--color-text-secondary)]">
            If you have a digital product, a time-consuming repetitive process, or an idea that needs building — probably yes. Send a quick message and I will check it out with you.
          </p>
        </article>
      </section>

      {/* CTA */}
      <section className="mt-14 flex flex-col gap-4 rounded-xl border border-[var(--color-border-default)] bg-[var(--color-bg-secondary)] p-6 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <p className="text-lg font-semibold text-[var(--color-text-primary)]">Want to talk about your project?</p>
          <p className="mt-1 text-sm text-[var(--color-text-secondary)]">Fill out a quick form and I will get back to you soon.</p>
        </div>
        <Link
          href="/#contact"
          className="shrink-0 inline-flex items-center gap-2 rounded-lg bg-[var(--color-accent)] px-5 py-2.5 text-sm font-medium text-white hover:bg-[var(--color-accent-hover)] transition-colors"
        >
          Let's Talk
        </Link>
      </section>
    </main>
  );
}
