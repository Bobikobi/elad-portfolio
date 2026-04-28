import type { Metadata } from 'next';
import AccessibilityContent from './AccessibilityContent';

export const metadata: Metadata = {
  title: 'הצהרת נגישות',
  description: 'הצהרת הנגישות של אתר הפורטפוליו של אלעד סעדון. תאימות WCAG 2.1 AA.',
  alternates: { canonical: '/accessibility' },
};

export default function AccessibilityPage() {
  return <AccessibilityContent />;
}
