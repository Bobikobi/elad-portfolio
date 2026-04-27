import type { Metadata } from 'next';
import Home from '../page';

export const metadata: Metadata = {
  title: 'Элад Саадон | Full-Stack Developer & AI Systems Architect',
  description:
    'Элад Саадон — full-stack разработчик и архитектор AI-систем из Израиля. Специализация: Next.js, React, TypeScript, интеграция AI и облачная автоматизация.',
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
