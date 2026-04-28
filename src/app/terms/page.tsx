import type { Metadata } from 'next';
import TermsContent from './TermsContent';

export const metadata: Metadata = {
  title: 'תנאי שימוש',
  description: 'תנאי השימוש של אתר הפורטפוליו של אלעד סעדון.',
  alternates: { canonical: '/terms' },
};

export default function TermsPage() {
  return <TermsContent />;
}
