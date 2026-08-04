'use client';
import { useEffect, useState } from 'react';

/**
 * True when scroll-driven / canvas-driven motion should be skipped entirely.
 * Covers both `prefers-reduced-motion` AND the site's own AccessibilityWidget
 * "Stop Animations" toggle (`.a11y-stop-animations` on <html>) — neither of
 * which reaches a canvas rAF loop or a framer-motion useTransform value on
 * its own, since both are CSS-only mechanisms.
 */
export function useMotionDisabled(): boolean {
  const [disabled, setDisabled] = useState(false);

  useEffect(() => {
    const mql = window.matchMedia('(prefers-reduced-motion: reduce)');
    const root = document.documentElement;

    const update = () => {
      setDisabled(mql.matches || root.classList.contains('a11y-stop-animations'));
    };
    update();

    mql.addEventListener('change', update);
    const observer = new MutationObserver(update);
    observer.observe(root, { attributes: true, attributeFilter: ['class'] });

    return () => {
      mql.removeEventListener('change', update);
      observer.disconnect();
    };
  }, []);

  return disabled;
}
