import type { Metadata } from 'next';
import { pageMetadata } from '@/lib/seo';
import TermsContent from './TermsContent';

export const metadata: Metadata = pageMetadata({
  locale: 'he',
  title: 'תנאי שימוש',
  description:
    'תנאי השימוש של אתר הפורטפוליו של אלעד סעדון.',
  path: '/terms',
});

export default function TermsPage() {
  return <TermsContent />;
}
