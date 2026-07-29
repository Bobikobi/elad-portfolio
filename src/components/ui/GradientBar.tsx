'use client';
import { motion, useInView } from 'framer-motion';
import { useRef } from 'react';

/**
 * The section rule that opens every legacy page — 25 of them, so it is the single most
 * repeated decorative element on the site.
 *
 * It was also the last hold-out of the retired tunnel palette, and it hid in plain sight
 * the same way the selection colour did (B9): the *tokens* it referenced looked migrated
 * (`--color-gradient-*`), but both glows were hard-coded `rgba(139,92,246,…)` — tunnel
 * violet, literal, three times over — and the gradient tokens themselves still resolve to
 * the old orange→cyan sweep. A two-hue sweep is the tunnel's grammar anyway; the cosmic
 * language has ONE accent.
 *
 * So: core gold with a gold bloom for the lit segment, and the chrome-surface hairline for
 * the tail, at the same star-white alpha the floating chrome uses for its borders. Every
 * colour here now comes from a cosmic token.
 */
export default function GradientBar() {
  const ref = useRef(null);
  const inView = useInView(ref, { once: true });
  return (
    <div ref={ref} className="relative mb-8 flex items-center gap-3">
      <motion.div
        initial={{ width: 0, opacity: 0 }}
        animate={inView ? { width: 48, opacity: 1 } : {}}
        transition={{ duration: 0.9, ease: [0.25, 0.4, 0, 1] }}
        className="h-[3px] rounded-full"
        style={{
          background:
            'linear-gradient(90deg, var(--color-core-gold), color-mix(in srgb, var(--color-core-gold) 55%, transparent))',
          // The same two-stop gold bloom the chrome launchers carry, so a heading rule and a
          // floating widget read as lit by one source.
          boxShadow:
            '0 0 12px color-mix(in srgb, var(--color-core-gold) 55%, transparent), 0 0 24px color-mix(in srgb, var(--color-core-gold) 22%, transparent)',
        }}
      />
      <motion.div
        initial={{ scaleX: 0, opacity: 0 }}
        animate={inView ? { scaleX: 1, opacity: 1 } : {}}
        transition={{ duration: 1.2, ease: [0.25, 0.4, 0, 1], delay: 0.1 }}
        className="h-px flex-1 origin-left"
        style={{
          background:
            'linear-gradient(90deg, color-mix(in srgb, var(--color-star-white) 18%, transparent), transparent)',
        }}
      />
    </div>
  );
}
