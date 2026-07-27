'use client';

const clamp = (x: number, a: number, b: number) => (x < a ? a : x > b ? b : x);

/** Shared departure indicator — an orbit arc that fills as the "scroll away to leave"
 *  meter builds. Rendered by every world so the gesture reads identically everywhere. */
export default function DepartureMeter({ value, label }: { value: number; label: string }) {
  const v = clamp(value, 0, 1);
  return (
    <div
      className="pointer-events-none absolute inset-x-0 bottom-[8dvh] flex flex-col items-center gap-2 transition-opacity duration-200"
      style={{ opacity: v }}
      aria-hidden={v < 0.05}
    >
      <svg width="46" height="24" viewBox="0 0 46 24" fill="none">
        <path d="M2 22 A 40 40 0 0 1 44 22" stroke="var(--color-core-gold)" strokeWidth="1" strokeOpacity="0.5" fill="none" />
        <circle cx={2 + 42 * v} cy={22 - 20 * Math.sin(Math.PI * v)} r="2.5" fill="var(--color-core-gold)" />
      </svg>
      <span className="text-[11px] tracking-[0.14em] text-[var(--color-core-gold)]/80">{label}</span>
    </div>
  );
}
