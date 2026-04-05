import Link from 'next/link';

export default function TermsPage() {
  return (
    <div className="mx-auto max-w-[800px] px-6 py-32">
      <h1 className="text-3xl font-semibold text-[var(--color-text-primary)] mb-8">
        Terms of Service / תנאי שימוש
      </h1>
      <div className="prose prose-invert prose-sm max-w-none text-[var(--color-text-secondary)] space-y-4">
        <p><strong>Effective date:</strong> April 2026</p>
        <h2 className="text-xl font-medium text-[var(--color-text-primary)] mt-8">Use of This Website</h2>
        <p>
          This website is a personal portfolio and business profile. By accessing it, you agree to
          use it in accordance with applicable laws and these terms.
        </p>
        <h2 className="text-xl font-medium text-[var(--color-text-primary)] mt-8">Intellectual Property</h2>
        <p>
          All content on this website, including but not limited to text, design, code, and graphics,
          is the property of Elad Saadon unless otherwise stated. You may not reproduce, distribute,
          or create derivative works without explicit permission.
        </p>
        <h2 className="text-xl font-medium text-[var(--color-text-primary)] mt-8">Limitation of Liability</h2>
        <p>
          This website is provided &quot;as is&quot; without warranties of any kind. Elad Saadon is not
          liable for any damages arising from the use of this website.
        </p>
        <h2 className="text-xl font-medium text-[var(--color-text-primary)] mt-8">Contact</h2>
        <p>
          For questions about these terms, contact{' '}
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
