import type { Metadata } from 'next';
import Link from 'next/link';
import { Globe, ShieldCheck, Gauge, Database, ArrowLeft } from 'lucide-react';
import { JsonLd } from '@/components/JsonLd';
import GradientBar from '@/components/ui/GradientBar';
import Breadcrumbs from '@/components/ui/Breadcrumbs';

export const metadata: Metadata = {
  title: 'Разработка Next.js для бизнеса и стартапов',
  description:
    'Полная разработка на Next.js: архитектура, производительность, SEO, интеграции API и безопасный продакшн-деплой с TypeScript и Supabase.',
  alternates: {
    canonical: 'https://www.eladsaadon.dev/ru/services/nextjs-development',
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
    url: 'https://www.eladsaadon.dev/ru/services/nextjs-development',
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
        name: 'Что включает услуга разработки на Next.js?',
        acceptedAnswer: {
          '@type': 'Answer',
          text: 'Планирование архитектуры, разработка серверной и клиентской частей, интеграции API, оптимизация производительности, техническое SEO и полный продакшн-деплой.',
        },
      },
      {
        '@type': 'Question',
        name: 'Можно ли модернизировать существующую систему Next.js?',
        acceptedAnswer: {
          '@type': 'Answer',
          text: 'Да. Мы диагностируем узкие места в производительности, архитектуре или SEO и улучшаем поэтапно — не ломая то, что работает.',
        },
      },
    ],
  },
];

const features = [
  {
    icon: Globe,
    title: 'Производительность и SEO',
    desc: 'Зелёные Core Web Vitals, SSR/ISR по необходимости, точные метаданные и понятная для Google схема.',
  },
  {
    icon: ShieldCheck,
    title: 'Встроенная безопасность',
    desc: 'Разрешения, заголовки, rate-limiting и OWASP Top 10 как часть архитектуры — не дополнение.',
  },
  {
    icon: Database,
    title: 'Слой данных',
    desc: 'Supabase, внешние API, управление кэшем и база данных, которая выдерживает нагрузку и правильно синхронизируется.',
  },
  {
    icon: Gauge,
    title: 'Готов к масштабированию',
    desc: 'Чистый, документированный и протестированный код — чтобы следующая функция добавлялась быстро и без головной боли.',
  },
];

export default function NextJsDevelopmentPage() {
  const breadcrumbs = [
    { label: 'Главная', href: '/ru' },
    { label: 'Услуги', href: '/ru/services' },
    { label: 'Разработка Next.js', href: '/ru/services/nextjs-development' },
  ];

  return (
    <main className="mx-auto w-full max-w-4xl px-6 py-16 sm:px-8">
      <JsonLd data={schemas} />

      <GradientBar />
      <Breadcrumbs items={breadcrumbs} locale="ru" />
      <h1 className="text-3xl font-bold text-[var(--color-text-primary)] sm:text-4xl">
        Разработка Next.js для бизнеса и стартапов
      </h1>
      <p className="mt-4 max-w-2xl text-base leading-8 text-[var(--color-text-secondary)]">
        Продукт на Next.js, созданный правильно — быстрый для пользователя, дружественный к Google, безопасный в продакшне и удобный в поддержке. С нуля до полного деплоя.
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
        <h2 className="text-2xl font-semibold text-[var(--color-text-primary)]">Часто задаваемые вопросы</h2>
        <article className="rounded-xl border border-[var(--color-border-default)] bg-[var(--color-bg-secondary)] p-5">
          <h3 className="text-base font-medium text-[var(--color-text-primary)]">Что включает услуга разработки на Next.js?</h3>
          <p className="mt-2 text-sm leading-7 text-[var(--color-text-secondary)]">
            Планирование архитектуры, разработка интерфейса, серверная логика, база данных, интеграции API, техническое SEO и полный продакшн-деплой.
          </p>
        </article>
        <article className="rounded-xl border border-[var(--color-border-default)] bg-[var(--color-bg-secondary)] p-5">
          <h3 className="text-base font-medium text-[var(--color-text-primary)]">Можно ли улучшить существующее без перестройки?</h3>
          <p className="mt-2 text-sm leading-7 text-[var(--color-text-secondary)]">
            Да. Сначала диагностируем: производительность, архитектура, SEO. Затем улучшаем сфокусированными этапами, не ломая то, что работает.
          </p>
        </article>
      </section>

      {/* CTA */}
      <section className="mt-14 flex flex-col gap-4 rounded-xl border border-[var(--color-border-default)] bg-[var(--color-bg-secondary)] p-6 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <p className="text-lg font-semibold text-[var(--color-text-primary)]">Есть проект на Next.js?</p>
          <p className="mt-1 text-sm text-[var(--color-text-secondary)]">Поделитесь деталями, и мы вместе посмотрим, что можно сделать.</p>
        </div>
        <Link
          href="/#contact"
          className="shrink-0 inline-flex items-center gap-2 rounded-lg bg-[var(--color-accent)] px-5 py-2.5 text-sm font-medium text-white hover:bg-[var(--color-accent-hover)] transition-colors"
        >
          Давайте поговорим <ArrowLeft size={14} />
        </Link>
      </section>
    </main>
  );
}
