import Link from 'next/link';

export default function AccessibilityPage() {
  return (
    <div className="mx-auto max-w-[800px] px-6 py-32">
      <h1 className="text-3xl font-semibold text-[var(--color-text-primary)] mb-8">
        Accessibility Statement / הצהרת נגישות
      </h1>
      <div className="prose prose-invert prose-sm max-w-none text-[var(--color-text-secondary)] space-y-4">
        <p>
          This website is committed to ensuring digital accessibility for people with disabilities.
          We are continually improving the user experience for everyone and applying the relevant
          accessibility standards.
        </p>
        <p>
          אתר זה מחויב להנגשה דיגיטלית לאנשים עם מוגבלויות. אנו פועלים באופן מתמיד לשיפור חוויית
          המשתמש ויישום תקני הנגישות הרלוונטיים.
        </p>
        <h2 className="text-xl font-medium text-[var(--color-text-primary)] mt-8">Standards / תקנים</h2>
        <p>This website aims to conform to WCAG 2.1 Level AA standards.</p>
        <h2 className="text-xl font-medium text-[var(--color-text-primary)] mt-8">Accessibility Features / תכונות נגישות</h2>
        <ul className="list-disc list-inside space-y-1">
          <li>Keyboard navigation support</li>
          <li>Screen reader compatibility</li>
          <li>Built-in accessibility widget with font scaling, contrast modes, link highlighting, animation control, and grayscale</li>
          <li>Skip-to-content link</li>
          <li>Semantic HTML structure</li>
          <li>Sufficient color contrast ratios</li>
          <li>Support for reduced motion preferences</li>
        </ul>
        <h2 className="text-xl font-medium text-[var(--color-text-primary)] mt-8">Contact / יצירת קשר</h2>
        <p>
          If you encounter accessibility issues on this site, please contact us at{' '}
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
