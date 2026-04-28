import type { Metadata } from 'next';
import Home from '../page';

export const metadata: Metadata = {
  title: { absolute: 'Элад Саадон | Фулстек-разработчик и архитектор систем ИИ' },
  description:
    'Элад Саадон — фулстек-разработчик и архитектор систем искусственного интеллекта из Израиля. Специализация: Next.js, React, TypeScript, интеграция ИИ и облачная автоматизация.',
  alternates: {
    canonical: 'https://www.eladsaadon.dev/ru',
    languages: {
      'he-IL': 'https://www.eladsaadon.dev',
      'en-US': 'https://www.eladsaadon.dev/en',
      'ru-RU': 'https://www.eladsaadon.dev/ru',
    },
  },
};

export default Home;
