import type { Metadata } from 'next';
import { socialMeta } from '@/lib/seo';
import Home from '../page';

export const metadata: Metadata = {
  title: { absolute: 'Элад Саадон | Фулстек-разработчик и архитектор систем ИИ' },
  description:
    'Элад Саадон — фулстек-разработчик и архитектор систем искусственного интеллекта из Израиля. Специализация: Next.js, React, TypeScript, интеграция ИИ и облачная автоматизация.',
  alternates: {
    canonical: 'https://www.eladsaadon.dev/ru',
    languages: {
      'he-IL': 'https://www.eladsaadon.dev/he',
      'en-US': 'https://www.eladsaadon.dev',
      'ru-RU': 'https://www.eladsaadon.dev/ru',
      'x-default': 'https://www.eladsaadon.dev',
    },
  },
  ...socialMeta('ru', 'Элад Саадон | Фулстек-разработчик и архитектор систем ИИ', 'Элад Саадон — фулстек-разработчик и архитектор систем искусственного интеллекта из Израиля. Специализация: Next.js, React, TypeScript, интеграция ИИ и облачная автоматизация.', 'https://www.eladsaadon.dev/ru'),
};

export default Home;
