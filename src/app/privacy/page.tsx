import type { Metadata } from 'next';
import { pageMetadata } from '@/lib/seo';
import PrivacyContent from './PrivacyContent';

export const metadata: Metadata = pageMetadata({
  locale: 'he',
  title: 'מדיניות פרטיות',
  description:
    'מדיניות הפרטיות של אתר הפורטפוליו של אלעד סעדון.',
  path: '/privacy',
});

export default function PrivacyPage() {
  return <PrivacyContent />;
}
