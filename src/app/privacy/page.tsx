import Link from 'next/link';
import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'מדיניות פרטיות',
  description: 'מדיניות הפרטיות של אתר הפורטפוליו של אלעד סעדון.',
  alternates: { canonical: '/privacy' },
};

export default function PrivacyPage() {
  return (
    <div className="mx-auto max-w-[800px] px-6 py-32">
      <h1 className="text-3xl font-semibold text-[var(--color-text-primary)] mb-8">
        Privacy Policy / מדיניות פרטיות
      </h1>
      <div className="prose prose-invert prose-sm max-w-none text-[var(--color-text-secondary)] space-y-4">
        <p><strong>Effective date:</strong> April 2026</p>
        <h2 className="text-xl font-medium text-[var(--color-text-primary)] mt-8">Information We Collect</h2>
        <p>
          We collect only the information you voluntarily provide through our contact form: name,
          email address, and message content. We do not use tracking cookies or third-party analytics
          that collect personal data.
        </p>
        <h2 className="text-xl font-medium text-[var(--color-text-primary)] mt-8">How We Use Your Information</h2>
        <p>
          Your contact information is used solely to respond to your inquiry. We do not sell, share,
          or distribute your personal information to any third parties.
        </p>
        <h2 className="text-xl font-medium text-[var(--color-text-primary)] mt-8">Data Storage</h2>
        <p>
          Contact form submissions are stored securely using Supabase (PostgreSQL) with row-level
          security enabled. Data is transmitted over HTTPS.
        </p>
        <h2 className="text-xl font-medium text-[var(--color-text-primary)] mt-8">Your Rights</h2>
        <p>
          You have the right to request access to, correction of, or deletion of your personal data.
          Contact us at{' '}
          <a href="mailto:contact@eladsaadon.dev" className="text-[var(--color-accent)] hover:underline">
            contact@eladsaadon.dev
          </a>
        </p>
      </div>
      <div className="mt-12">
        <Link href="/" className="text-sm text-[var(--color-accent)] hover:underline">
          ← Back to Home
        </Link>
      </div>
    </div>
  );
}
