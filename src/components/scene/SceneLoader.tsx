'use client';
import { useEffect, useRef, useState } from 'react';
import { useScene } from '@/lib/sceneStore';

/**
 * First-paint loader v2 (R5.8) — a space-void screen shown until the WebGL scene has
 * drawn a real frame, with a hard ceiling so a slow GPU never holds the visitor hostage.
 *
 * Everything here is pure DOM + CSS: a diagonal shooting star crossing the void every
 * few seconds, and three short lines that rotate through Hebrew, English and Russian.
 * NOTHING in this component may touch the GPU or React state per frame — the loader is
 * on screen precisely while the browser is busy compiling shaders and uploading textures,
 * so any work it does is work stolen from the thing the visitor is waiting for. The star
 * is a CSS keyframe (compositor-only: transform + opacity) and the copy advances on a
 * 2.4s interval, three renders per cycle.
 */

const LINES: { he: string; en: string; ru: string }[] = [
  { he: 'מכיילים את המנועים', en: 'Calibrating the engines', ru: 'Калибруем двигатели' },
  { he: 'מציתים את הכוכבים', en: 'Lighting the stars', ru: 'Зажигаем звёзды' },
  { he: 'מתווים מסלול לגלקסיה', en: 'Plotting a course to the galaxy', ru: 'Прокладываем курс к галактике' },
];
const LANGS = ['he', 'en', 'ru'] as const;
const STEP_MS = 2400;

export default function SceneLoader() {
  const ready = useScene((s) => s.sceneReady);
  const [hidden, setHidden] = useState(false);
  const [step, setStep] = useState(0);
  const startedAt = useRef(0);

  useEffect(() => {
    const ceiling = setTimeout(() => setHidden(true), 3000);
    return () => clearTimeout(ceiling);
  }, []);
  useEffect(() => {
    if (!ready) return;
    const t = setTimeout(() => setHidden(true), 450);
    return () => clearTimeout(t);
  }, [ready]);

  // Rotate the copy. One interval, one small render every 2.4s — never per frame.
  useEffect(() => {
    if (hidden) return;
    startedAt.current = performance.now();
    const id = setInterval(() => setStep((s) => s + 1), STEP_MS);
    return () => clearInterval(id);
  }, [hidden]);

  if (hidden) return null;

  // The line and the language advance together, so each beat is a different sentence in
  // a different script — the site says "trilingual" before a single page has painted.
  const line = LINES[step % LINES.length];
  const lang = LANGS[step % LANGS.length];

  return (
    <div
      className="fixed inset-0 z-[60] overflow-hidden transition-opacity duration-500"
      style={{ background: '#050714', opacity: ready ? 0 : 1, pointerEvents: ready ? 'none' : 'auto' }}
      aria-hidden="true"
    >
      {/* Shooting stars — three staggered diagonal streaks, one crossing every ~2.5s. */}
      <span className="loader-meteor" style={{ animationDelay: '0s' }} />
      <span className="loader-meteor loader-meteor--b" style={{ animationDelay: '2.5s' }} />
      <span className="loader-meteor loader-meteor--c" style={{ animationDelay: '5s' }} />

      <div className="absolute inset-0 flex flex-col items-center justify-center gap-6 px-8 text-center">
        <span className="scene-loader-ring" />
        <p
          key={step}
          lang={lang}
          dir={lang === 'he' ? 'rtl' : 'ltr'}
          className="loader-line text-[13px] tracking-[0.18em] text-[var(--color-star-white)]/55"
          style={{ fontFamily: 'var(--font-body, var(--font-hebrew))' }}
        >
          {line[lang]}
        </p>
      </div>
    </div>
  );
}
