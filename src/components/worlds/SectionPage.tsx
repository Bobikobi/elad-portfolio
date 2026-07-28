import type { Locale } from '@/lib/translations';
import { translations as tr } from '@/lib/translations';
import { SECTIONS, type SectionId } from '@/lib/sections';
import { JsonLd } from '@/components/JsonLd';
import PlanetWorld from '@/components/worlds/PlanetWorld';
import AboutWorld from './AboutWorld';
import ServicesWorld from './ServicesWorld';
import ProjectsWorld from './ProjectsWorld';
import TechWorld from './TechWorld';
import ContactWorld from './ContactWorld';

const BASE = 'https://www.eladsaadon.dev';

// Preserve the marketing /services SEO signals in the Jupiter world.
const servicesSchema = [
  {
    '@context': 'https://schema.org',
    '@type': 'Service',
    name: 'Next.js, AI & Automation Development Services',
    description: 'Full-stack web development, AI integration, and workflow automation delivered by Elad Saadon.',
    url: `${BASE}/services`,
    provider: { '@type': 'Person', name: 'Elad Saadon', url: BASE },
    areaServed: { '@type': 'Country', name: 'Israel' },
    serviceType: 'Full-Stack Development and AI Integration',
  },
  {
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    itemListElement: [
      { '@type': 'ListItem', position: 1, name: 'Home', item: BASE },
      { '@type': 'ListItem', position: 2, name: 'Services', item: `${BASE}/services` },
    ],
  },
  {
    '@context': 'https://schema.org',
    '@type': 'FAQPage',
    mainEntity: [
      {
        '@type': 'Question',
        name: 'איזה שירותים אתה נותן לעסקים וסטארטאפים?',
        acceptedAnswer: { '@type': 'Answer', text: 'פיתוח Full-Stack ב-Next.js, אינטגרציית AI עם Gemini ו-OpenAI, אוטומציות תהליכים, כלי פנים ארגוניים ופריסה מאובטחת לפרודקשן.' },
      },
      {
        '@type': 'Question',
        name: 'האם אפשר לשפר מערכת קיימת בלי לבנות הכול מחדש?',
        acceptedAnswer: { '@type': 'Answer', text: 'כן. בדרך כלל מתחילים באבחון צווארי בקבוק, משפרים ביצועים וארכיטקטורה בהדרגה, ומטמיעים AI או אוטומציה בשלבים עם סיכון נמוך.' },
      },
      {
        '@type': 'Question',
        name: 'האם הפרויקט שלי מתאים לשירות הזה?',
        acceptedAnswer: { '@type': 'Answer', text: 'אם יש לכם מוצר דיגיטלי, תהליך שחוזר שוב ושוב, או רעיון שצריך לממש — כנראה שכן. שלחו הודעה קצרה ואבדוק יחד איתכם.' },
      },
    ],
  },
];

function schemaFor(id: SectionId) {
  if (id === 'services') return servicesSchema;
  return null;
}

/** One section route → its planet world. Server-rendered content (crawlable) inside
 *  the dark-glass panel; the persistent canvas (CosmicStage) flies to the planet. */
export default function SectionPage({ id, locale }: { id: SectionId; locale: Locale }) {
  const section = SECTIONS.find((s) => s.id === id)!;
  const title = tr[section.navKey]?.[locale] ?? id;
  const schema = schemaFor(id);
  // Projects is the Layout v2 "Jupiter frame" pilot: it owns its full-bleed chrome
  // (floating windows + arc + scroll steering + back), NOT the shared glass panel.
  if (id === 'projects') {
    return (
      <>
        {schema && <JsonLd data={schema} />}
        <ProjectsWorld locale={locale} />
      </>
    );
  }
  return (
    <>
      {schema && <JsonLd data={schema} />}
      <PlanetWorld locale={locale} title={title}>
        {id === 'about' && <AboutWorld locale={locale} />}
        {id === 'services' && <ServicesWorld locale={locale} />}
        {id === 'technologies' && <TechWorld locale={locale} />}
        {id === 'contact' && <ContactWorld locale={locale} />}
      </PlanetWorld>
    </>
  );
}
