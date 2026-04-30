import type { Metadata } from 'next';
import Link from 'next/link';
import { Bot, FileText, MessageSquare, Zap, ArrowLeft } from 'lucide-react';
import { JsonLd } from '@/components/JsonLd';
import GradientBar from '@/components/ui/GradientBar';

export const metadata: Metadata = {
  title: 'Интеграция ИИ в существующие и новые системы',
  description:
    'Внедрение ИИ в веб-продукты: умный чат, суммаризация документов, классификация данных и автоматизация с Gemini и OpenAI — безопасно.',
  alternates: {
    canonical: 'https://www.eladsaadon.dev/ru/services/ai-integration',
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
    url: 'https://www.eladsaadon.dev/ru/services/ai-integration',
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
        name: 'Как интегрировать ИИ без риска для конфиденциальных данных?',
        acceptedAnswer: {
          '@type': 'Answer',
          text: 'Мы настраиваем уровни разрешений, фильтрацию данных и контролируемое логирование. Все вызовы ИИ проходят только через сервер — ключи и секреты никогда не попадают в браузер.',
        },
      },
      {
        '@type': 'Question',
        name: 'Какие процессы можно автоматизировать с помощью ИИ?',
        acceptedAnswer: {
          '@type': 'Answer',
          text: 'Документацию, обобщение обращений, генерацию контента, классификацию и приоритизацию задач, а также извлечение информации из документов и форм.',
        },
      },
    ],
  },
];

const useCases = [
  {
    icon: MessageSquare,
    title: 'Умный внутренний помощник',
    desc: 'Команды находят мгновенные ответы вместо часов поиска в документации. ИИ, который знает ваш продукт, политики и организационные знания.',
  },
  {
    icon: FileText,
    title: 'Автоматическая обработка документов',
    desc: 'Контракты, формы и отчёты автоматически обрабатываются и обобщаются. Экономия повторяющейся ручной работы и снижение ошибок.',
  },
  {
    icon: Zap,
    title: 'Умная классификация и приоритизация',
    desc: 'Обращения, лиды и задачи автоматически ранжируются по важности и срочности — команда фокусируется на действительно важном.',
  },
  {
    icon: Bot,
    title: 'Продуктовый чат',
    desc: 'Встроенный ИИ-ассистент в вашем интерфейсе, который отвечает на вопросы, направляет пользователей и снижает нагрузку на поддержку.',
  },
];

export default function AiIntegrationPage() {
  return (
    <main className="mx-auto w-full max-w-4xl px-6 py-16 sm:px-8">
      <JsonLd data={schemas} />

      <GradientBar />
      <h1 className="text-3xl font-bold text-[var(--color-text-primary)] sm:text-4xl">
        Интеграция ИИ для цифровых продуктов
      </h1>
      <p className="mt-4 max-w-2xl text-base leading-8 text-[var(--color-text-secondary)]">
        Внедряйте возможности ИИ в ваш продукт безопасно и измеримо — чтобы команда экономила время, а пользователи получали более умный опыт.
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
        <h2 className="text-2xl font-semibold text-[var(--color-text-primary)]">Часто задаваемые вопросы</h2>
        <article className="rounded-xl border border-[var(--color-border-default)] bg-[var(--color-bg-secondary)] p-5">
          <h3 className="text-base font-medium text-[var(--color-text-primary)]">Как обеспечивается безопасность данных?</h3>
          <p className="mt-2 text-sm leading-7 text-[var(--color-text-secondary)]">
            Все вызовы ИИ проходят через сервер — ключи и конфиденциальные данные никогда не попадают в браузер. Добавляем разрешения, фильтрацию и контролируемое логирование.
          </p>
        </article>
        <article className="rounded-xl border border-[var(--color-border-default)] bg-[var(--color-bg-secondary)] p-5">
          <h3 className="text-base font-medium text-[var(--color-text-primary)]">На каких процессах ИИ работает лучше всего?</h3>
          <p className="mt-2 text-sm leading-7 text-[var(--color-text-secondary)]">
            Повторяющиеся процессы: документация, обобщение обращений, классификация, извлечение информации из форм. Здесь ROI наиболее ясен и измерим.
          </p>
        </article>
      </section>

      {/* CTA */}
      <section className="mt-14 flex flex-col gap-4 rounded-xl border border-[var(--color-border-default)] bg-[var(--color-bg-secondary)] p-6 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <p className="text-lg font-semibold text-[var(--color-text-primary)]">Хотите ИИ в вашем продукте?</p>
          <p className="mt-1 text-sm text-[var(--color-text-secondary)]">Давайте вместе определим, где ИИ принесёт наибольшую ценность.</p>
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
