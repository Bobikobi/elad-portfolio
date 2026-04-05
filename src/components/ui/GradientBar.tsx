'use client';
import { motion, useInView } from 'framer-motion';
import { useRef } from 'react';

export default function GradientBar() {
  const ref = useRef(null);
  const inView = useInView(ref, { once: true });
  return (
    <motion.div
      ref={ref}
      initial={{ width: 0 }}
      animate={inView ? { width: 80 } : {}}
      transition={{ duration: 0.8, ease: [0.25, 0.4, 0, 1] }}
      className="h-1 rounded-full bg-gradient-to-r from-[var(--color-gradient-start)] to-[var(--color-gradient-end)] mb-6"
    />
  );
}
