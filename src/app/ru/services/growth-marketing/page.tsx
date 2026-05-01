import type { Metadata } from 'next';
import Link from 'next/link';
import { Filter, Mail, BarChart2, Sparkles, ArrowLeft } from 'lucide-react';
import { JsonLd } from '@/components/JsonLd';
import GradientBar from '@/components/ui/GradientBar';
import Breadcrumbs from '@/components/ui/Breadcrumbs';

export const metadata: Metadata = {
  title: 'Автоматизация маркетинга роста',
  description:
    'Создание измеримой маркетинговой инфраструктуры: автоматизация лидов, воронки взращивания, дашборды и сценарии конверсии, связывающие продукт, контент и бизнес-результаты.',
  alternates: {
    canonical: 'https://www.eladsaadon.dev/ru/services/growth-marketing',
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
    url: 'https://www.eladsaadon.dev/ru/services/growth-marketing',
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
        name: 'Что включает хорошая маркетинговая инфраструктура?',
        acceptedAnswer: {
          '@type': 'Answer',
          text: 'Хорошая инфраструктура включает единое измерение, управление источниками лидов, автоматизированный follow-up и дашборд производительности, связывающий кампании, контент и фактические конверсии.',
        },
      },
      {
        '@type': 'Question',
        name: 'Как интегрировать ИИ в маркетинг?',
        acceptedAnswer: {
          '@type': 'Answer',
          text: 'Мы интегрируем ИИ для генерации вариаций контента, обобщения разговоров, скоринга лидов и оптимизации сообщений. Цель — сократить время реакции и улучшить коэффициент конверсии.',
        },
      },
    ],
  },
];

const components = [
  {
    icon: Filter,
    title: 'Захват и фильтрация лидов',
    desc: 'Каждый входящий лид автоматически классифицируется по источнику, качеству и поведению — команда общается только с теми, с кем стоит.',
  },
  {
    icon: Mail,
    title: 'Своевременные сообщения',
    desc: 'Последовательность сообщений, адаптирующаяся к этапу каждого лида в воронке — не разовый blast, а коммуникация, строящая доверие.',
  },
  {
    icon: BarChart2,
    title: 'Дашборд производительности',
    desc: 'Еженедельные метрики на уровне кампании, канала и контента — понимаем, что работает, и улучшаем на основе данных, а не ощущений.',
  },
  {
    icon: Sparkles,
    title: 'Маркетинг с ИИ',
    desc: 'ИИ, который оценивает лиды, генерирует вариации сообщений и обобщает разговоры — меньше ручной работы, больше времени на стратегию.',
  },
];

export default function GrowthMarketingPage() {
  const breadcrumbs = [
    { label: 'Главная', href: '/ru' },
    { label: 'Услуги', href: '/ru/services' },
    { label: 'Маркетинг роста', href: '/ru/services/growth-marketing' },
  ];

  return (
    <main className="mx-auto w-full max-w-4xl px-6 py-16 sm:px-8">
      <JsonLd data={schemas} />

      <GradientBar />
      <Breadcrumbs items={breadcrumbs} locale="ru" />
      <h1 className="text-3xl font-bold text-[var(--color-text-primary)] sm:text-4xl">
        Автоматизация маркетинга роста
      </h1>
      <p className="mt-4 max-w-2xl text-base leading-8 text-[var(--color-text-secondary)]">
        Вместо ручного отслеживания каждого лида создайте двигатель, который делает это автоматически — с момента, когда кто-то приходит на сайт, до момента, когда он становится клиентом.
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
        <h2 className="text-2xl font-semibold text-[var(--color-text-primary)]">Часто задаваемые вопросы</h2>
        <article className="rounded-xl border border-[var(--color-border-default)] bg-[var(--color-bg-secondary)] p-5">
          <h3 className="text-base font-medium text-[var(--color-text-primary)]">Что включает хорошая маркетинговая инфраструктура?</h3>
          <p className="mt-2 text-sm leading-7 text-[var(--color-text-secondary)]">
            Единое измерение, управление источниками лидов, автоматизированный follow-up и дашборд, связывающий кампании, контент и фактические конверсии.
          </p>
        </article>
        <article className="rounded-xl border border-[var(--color-border-default)] bg-[var(--color-bg-secondary)] p-5">
          <h3 className="text-base font-medium text-[var(--color-text-primary)]">Подходит ли это для малого бизнеса?</h3>
          <p className="mt-2 text-sm leading-7 text-[var(--color-text-secondary)]">
            Да. У малого бизнеса меньше ручных ресурсов, поэтому автоматизация экономит пропорционально больше. Начинаем с одной точки и расширяем по мере необходимости.
          </p>
        </article>
      </section>

      {/* CTA */}
      <section className="mt-14 flex flex-col gap-4 rounded-xl border border-[var(--color-border-default)] bg-[var(--color-bg-secondary)] p-6 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <p className="text-lg font-semibold text-[var(--color-text-primary)]">Хотите двигатель роста, который работает сам?</p>
          <p className="mt-1 text-sm text-[var(--color-text-secondary)]">Расскажите о ваших каналах, и мы спланируем вместе.</p>
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
