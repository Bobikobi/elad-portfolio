import type { Metadata } from 'next';
import { pageMetadata } from '@/lib/seo';
import AccessibilityContent from './AccessibilityContent';

export const metadata: Metadata = pageMetadata({
  locale: 'he',
  title: 'הצהרת נגישות',
  description:
    'הצהרת הנגישות של אתר הפורטפוליו של אלעד סעדון. תאימות WCAG 2.1 AA.',
  path: '/accessibility',
});

export default function AccessibilityPage() {
  return <AccessibilityContent />;
}
