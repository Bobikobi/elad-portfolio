import type { Metadata } from 'next';
import Link from 'next/link';
import { RefreshCw, Bell, BarChart2, Link2, ArrowLeft } from 'lucide-react';
import { JsonLd } from '@/components/JsonLd';
import GradientBar from '@/components/ui/GradientBar';
import Breadcrumbs from '@/components/ui/Breadcrumbs';

export const metadata: Metadata = {
  title: 'Автоматизация бизнес-процессов',
  description:
    'Планирование и разработка автоматизаций, сокращающих ручную работу: интеграция систем, триггеры, обработка данных и автоматические отчёты с Node.js, Python и API.',
  alternates: {
    canonical: 'https://www.eladsaadon.dev/ru/services/automation-workflows',
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
    url: 'https://www.eladsaadon.dev/ru/services/automation-workflows',
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
        name: 'Какие процессы стоит автоматизировать в первую очередь?',
        acceptedAnswer: {
          '@type': 'Answer',
          text: 'Начинайте с процессов, которые повторяются много раз в неделю и отнимают ручное время — обычно это отчёты, синхронизация данных и операционные задачи.',
        },
      },
      {
        '@type': 'Question',
        name: 'Как измерять успех автоматизации?',
        acceptedAnswer: {
          '@type': 'Answer',
          text: 'Мы измеряем сэкономленное время, снижение ручных ошибок, сокращение времени реакции и общую производительность команды до и после внедрения.',
        },
      },
    ],
  },
];

const outcomes = [
  {
    icon: RefreshCw,
    title: 'Меньше повторяющейся работы',
    desc: 'Задачи, которые повторяются снова и снова — синхронизация данных, создание отчётов, отправка обновлений — работают сами без участия человека.',
  },
  {
    icon: Bell,
    title: 'Оповещения в реальном времени',
    desc: 'Когда что-то требует внимания, команда получает мгновенное уведомление. Не обнаруживать проблемы постфактум — реагировать до того, как это станет проблемой.',
  },
  {
    icon: Link2,
    title: 'Связанные системы',
    desc: 'CRM, email, таблицы, API — всё общается друг с другом. Информация течёт автоматически и не проваливается между стульями.',
  },
  {
    icon: BarChart2,
    title: 'Прозрачность и логи',
    desc: 'Каждое действие записывается. Всегда понятно, что работало, когда и с каким результатом — легко диагностировать и улучшать.',
  },
];

export default function AutomationWorkflowsPage() {
  const breadcrumbs = [
    { label: 'Главная', href: '/ru' },
    { label: 'Услуги', href: '/ru/services' },
    { label: 'Автоматизация', href: '/ru/services/automation-workflows' },
  ];

  return (
    <main className="mx-auto w-full max-w-4xl px-6 py-16 sm:px-8">
      <JsonLd data={schemas} />

      <GradientBar />
      <Breadcrumbs items={breadcrumbs} locale="ru" />
      <h1 className="text-3xl font-bold text-[var(--color-text-primary)] sm:text-4xl">
        Автоматизация бизнес-процессов
      </h1>
      <p className="mt-4 max-w-2xl text-base leading-8 text-[var(--color-text-secondary)]">
        Когда процессы работают сами, команда освобождается для работы, требующей настоящего мышления. Создаём сфокусированные автоматизации, начиная с самого болезненного узкого места и получая немедленный результат.
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
        <h2 className="text-2xl font-semibold text-[var(--color-text-primary)]">Часто задаваемые вопросы</h2>
        <article className="rounded-xl border border-[var(--color-border-default)] bg-[var(--color-bg-secondary)] p-5">
          <h3 className="text-base font-medium text-[var(--color-text-primary)]">С чего начать?</h3>
          <p className="mt-2 text-sm leading-7 text-[var(--color-text-secondary)]">
            Начинаем с процесса, который повторяется чаще всего и отнимает больше всего ручного времени. Там самая быстрая окупаемость.
          </p>
        </article>
        <article className="rounded-xl border border-[var(--color-border-default)] bg-[var(--color-bg-secondary)] p-5">
          <h3 className="text-base font-medium text-[var(--color-text-primary)]">Как узнать, что автоматизация работает?</h3>
          <p className="mt-2 text-sm leading-7 text-[var(--color-text-secondary)]">
            Каждый процесс сопровождается логами, оповещениями об ошибках и чёткими метриками — сэкономленное время, снижение ошибок, рост производительности.
          </p>
        </article>
      </section>

      {/* CTA */}
      <section className="mt-14 flex flex-col gap-4 rounded-xl border border-[var(--color-border-default)] bg-[var(--color-bg-secondary)] p-6 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <p className="text-lg font-semibold text-[var(--color-text-primary)]">Есть процесс, который отнимает время?</p>
          <p className="mt-1 text-sm text-[var(--color-text-secondary)]">Расскажите о нём, и мы проверим, можно ли его автоматизировать.</p>
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
