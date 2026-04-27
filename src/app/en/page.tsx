import type { Metadata } from 'next';
import Home from '../page';

export const metadata: Metadata = {
  title: 'Elad Saadon | Full-Stack Developer & AI Systems Architect',
  description:
    'Elad Saadon is a full-stack developer and AI systems architect from Israel, specializing in Next.js, React, TypeScript, AI integration, and cloud automation.',
  alternates: {
    canonical: 'https://www.eladsaadon.dev/en',
    languages: {
      'he-IL': 'https://www.eladsaadon.dev',
      'en-US': 'https://www.eladsaadon.dev/en',
      'ru-RU': 'https://www.eladsaadon.dev/ru',
    },
  },
};

export default Home;
