'use client';

import { useEffect, useRef, useState } from 'react';
import { useInView } from 'framer-motion';

interface AnimatedCounterProps {
  target: number;
  suffix?: string;
  duration?: number;
}

export function AnimatedCounter({ target, suffix = '', duration = 2000 }: AnimatedCounterProps) {
  // Starts AT the target so the server-rendered markup carries the real number — the count-up
  // is decoration, and a crawler or a no-JS visitor must never be shown a 0.
  const [count, setCount] = useState(target);
  // A run-once latch, not state: nothing renders differently because of it, and as state it
  // was being set synchronously inside the effect (the `set-state-in-effect` error) purely to
  // stop the effect re-entering itself — a re-render to communicate with the next render.
  const hasAnimated = useRef(false);
  const ref = useRef<HTMLSpanElement>(null);
  const isInView = useInView(ref, { once: true, margin: '-50px' });

  useEffect(() => {
    if (!isInView || hasAnimated.current) return;
    hasAnimated.current = true;

    const startTime = performance.now();
    // The old code also called setCount(0) synchronously here. It is unnecessary: the first
    // animation frame lands at progress ~0 and writes 0 anyway, one frame later, off the
    // effect. So the reset is no longer a render of its own.
    let raf = 0;
    const animate = (now: number) => {
      const progress = Math.min((now - startTime) / duration, 1);
      const eased = 1 - Math.pow(1 - progress, 3);
      setCount(progress < 1 ? Math.floor(eased * target) : target);
      if (progress < 1) raf = requestAnimationFrame(animate);
    };

    raf = requestAnimationFrame(animate);
    // …and it is cancelled on unmount, which it never was: a counter scrolled into view and
    // then navigated away from kept ticking and setting state on a dead component.
    return () => cancelAnimationFrame(raf);
  }, [isInView, target, duration]);

  return (
    <span ref={ref}>
      {count}
      {suffix}
    </span>
  );
}