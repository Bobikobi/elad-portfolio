import type { Metadata } from 'next';
import Home from '../page';

// F3 — Hebrew moved off the un-prefixed root to /he when English became the default.
// The strings below are the ones that used to live in app/layout.tsx, unchanged; only
// their URL changed.
export const metadata: Metadata = {
  title: { absolute: 'אלעד סעדון | מפתח פול-סטאק וארכיטקט מערכות בינה מלאכותית' },
  description:
    'אלעד סעדון הוא מפתח פול-סטאק וארכיטקט מערכות בינה מלאכותית מישראל, עם התמחות בפיתוח מערכות ווב, אינטגרציית בינה מלאכותית ואוטומציה בענן.',
  alternates: {
    canonical: 'https://www.eladsaadon.dev/he',
    languages: {
      'he-IL': 'https://www.eladsaadon.dev/he',
      'en-US': 'https://www.eladsaadon.dev',
      'ru-RU': 'https://www.eladsaadon.dev/ru',
      'x-default': 'https://www.eladsaadon.dev',
    },
  },
  openGraph: {
    title: 'אלעד סעדון | מפתח פול-סטאק וארכיטקט מערכות בינה מלאכותית',
    description:
      'אלעד סעדון הוא מפתח פול-סטאק מישראל המתמחה בפיתוח מערכות, אינטגרציית בינה מלאכותית, אוטומציה בענן ופתרונות טכנולוגיים למגזר הציבורי.',
    locale: 'he_IL',
    alternateLocale: ['en_US', 'ru_RU'],
    url: 'https://www.eladsaadon.dev/he',
  },
};

export default Home;
