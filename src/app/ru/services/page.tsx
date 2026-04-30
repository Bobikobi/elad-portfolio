import type { Metadata } from 'next';
import Link from 'next/link';
import { Globe, Bot, Workflow, TrendingUp, ArrowLeft, CheckCircle2 } from 'lucide-react';
import { JsonLd } from '@/components/JsonLd';
import GradientBar from '@/components/ui/GradientBar';

export const metadata: Metadata = {
  title: 'Услуги разработки, ИИ и автоматизации',
  description:
    'Full-Stack разработка, интеграция ИИ и бизнес-автоматизация. Чистый код, высокая производительность и безопасный продакшн-деплой.',
  alternates: {
    canonical: 'https://www.eladsaadon.dev/ru/services',
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
  url: 'https://www.eladsaadon.dev/ru/services',
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
    { '@type': 'ListItem', position: 1, name: 'Главная', item: 'https://www.eladsaadon.dev/ru' },
    { '@type': 'ListItem', position: 2, name: 'Услуги', item: 'https://www.eladsaadon.dev/ru/services' },
  ],
};

const faqSchema = {
  '@context': 'https://schema.org',
  '@type': 'FAQPage',
  mainEntity: [
    {
      '@type': 'Question',
      name: 'Какие услуги вы предлагаете для бизнеса и стартапов?',
      acceptedAnswer: {
        '@type': 'Answer',
        text: 'Full-Stack разработку на Next.js, интеграцию ИИ с Gemini и OpenAI, автоматизацию процессов, внутренние инструменты и безопасный продакшн-деплой.',
      },
    },
    {
      '@type': 'Question',
      name: 'Можно ли улучшить существующую систему без полной перестройки?',
      acceptedAnswer: {
        '@type': 'Answer',
        text: 'Да. Обычно мы начинаем с выявления узких мест, улучшаем производительность и архитектуру постепенно, и внедряем ИИ или автоматизацию поэтапно с низким риском.',
      },
    },
    {
      '@type': 'Question',
      name: 'Подходит ли мой проект для этой услуги?',
      acceptedAnswer: {
        '@type': 'Answer',
        text: 'Если у вас есть цифровой продукт, повторяющийся процесс или идея, которую нужно реализовать — вероятно, да. Отправьте краткое сообщение, и я проверю вместе с вами.',
      },
    },
  ],
};

const services = [
  {
    icon: Globe,
    title: 'Full-Stack Разработка',
    desc: 'От быстрого интерфейса до серверной логики и базы данных — получаете готовый, безопасный и масштабируемый продукт.',
    href: '/ru/services/nextjs-development',
  },
  {
    icon: Bot,
    title: 'Интеграция ИИ',
    desc: 'Встраивайте умных помощников, обработку документов и интеллектуальную автоматизацию прямо в ваш продукт.',
    href: '/ru/services/ai-integration',
  },
  {
    icon: Workflow,
    title: 'Бизнес-автоматизация',
    desc: 'Объединяйте системы, устраняйте повторяющуюся ручную работу и добавляйте полную прозрачность процессов.',
    href: '/ru/services/automation-workflows',
  },
  {
    icon: TrendingUp,
    title: 'Маркетинг и Рост',
    desc: 'Измеримая маркетинговая инфраструктура: захват лидов, воронки конверсии и самоуправляемая панель производительности.',
    href: '/ru/services/growth-marketing',
  },
];

const highlights = [
  'Чистый документированный код для долгосрочной поддержки',
  'SEO, доступность и зелёные Core Web Vitals',
  'Безопасный деплой с мониторингом продакшна',
];

export default function ServicesPage() {
  return (
    <main className="mx-auto w-full max-w-5xl px-6 py-16 sm:px-8">
      <JsonLd data={[serviceSchema, breadcrumbSchema, faqSchema]} />

      <GradientBar />
      <h1 className="text-3xl font-bold text-[var(--color-text-primary)] sm:text-4xl">
        Услуги разработки, ИИ и автоматизации
      </h1>
      <p className="mt-4 max-w-2xl text-base leading-8 text-[var(--color-text-secondary)]">
        Решаю реальные цифровые задачи — от сайта, который привлекает трафик, через продукт со встроенным ИИ, до процессов, которые работают сами и освобождают команду для более важной работы.
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
                Подробнее <ArrowLeft size={14} />
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
        <h2 className="text-2xl font-semibold text-[var(--color-text-primary)]">Часто задаваемые вопросы</h2>
        <article className="rounded-xl border border-[var(--color-border-default)] bg-[var(--color-bg-secondary)] p-5">
          <h3 className="text-base font-medium text-[var(--color-text-primary)]">Вы работаете с существующими системами?</h3>
          <p className="mt-2 text-sm leading-7 text-[var(--color-text-secondary)]">
            Да. Иногда самое быстрое улучшение приходит от модернизации архитектуры, оптимизации производительности и добавления слоя автоматизации — без полного переписывания.
          </p>
        </article>
        <article className="rounded-xl border border-[var(--color-border-default)] bg-[var(--color-bg-secondary)] p-5">
          <h3 className="text-base font-medium text-[var(--color-text-primary)]">Подходит ли мой проект?</h3>
          <p className="mt-2 text-sm leading-7 text-[var(--color-text-secondary)]">
            Если у вас есть цифровой продукт, трудоёмкий повторяющийся процесс или идея, которую нужно реализовать — вероятно, да. Отправьте краткое сообщение, и я проверю вместе с вами.
          </p>
        </article>
      </section>

      {/* CTA */}
      <section className="mt-14 flex flex-col gap-4 rounded-xl border border-[var(--color-border-default)] bg-[var(--color-bg-secondary)] p-6 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <p className="text-lg font-semibold text-[var(--color-text-primary)]">Хотите обсудить ваш проект?</p>
          <p className="mt-1 text-sm text-[var(--color-text-secondary)]">Заполните короткую форму, и я свяжусь с вами в ближайшее время.</p>
        </div>
        <Link
          href="/#contact"
          className="shrink-0 inline-flex items-center gap-2 rounded-lg bg-[var(--color-accent)] px-5 py-2.5 text-sm font-medium text-white hover:bg-[var(--color-accent-hover)] transition-colors"
        >
          Давайте поговорим
        </Link>
      </section>
    </main>
  );
}
