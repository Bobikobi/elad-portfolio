'use client';
import { motion, useInView } from 'framer-motion';
import { useRef } from 'react';

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
          background: 'linear-gradient(90deg, var(--color-gradient-start), var(--color-gradient-end))',
          boxShadow: '0 0 12px rgba(139,92,246,0.7), 0 0 24px rgba(139,92,246,0.3)',
        }}
      />
      <motion.div
        initial={{ scaleX: 0, opacity: 0 }}
        animate={inView ? { scaleX: 1, opacity: 1 } : {}}
        transition={{ duration: 1.2, ease: [0.25, 0.4, 0, 1], delay: 0.1 }}
        className="h-px flex-1 origin-left"
        style={{
          background: 'linear-gradient(90deg, rgba(139,92,246,0.3), transparent)',
        }}
      />
    </div>
  );
}
