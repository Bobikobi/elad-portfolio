'use client';
import { useScene } from '@/lib/sceneStore';
import Galaxy from '../galaxy/Galaxy';
import GalaxyDetail from '../galaxy/GalaxyDetail';
import Dust from '../galaxy/Dust';
import DiveField from '../galaxy/DiveField';

/**
 * Act 1 content: the living galaxy, its foreground dust, and the volumetric dive
 * field. The shared sky (gradient + star sphere + nebulae) lives in SceneRoot, so
 * it persists across the act swap. Camera + post FX also live in SceneRoot.
 */
export default function GalaxyAct() {
  const high = useScene((s) => s.quality) === 'high';
  return (
    <>
      <Galaxy count={high ? 200000 : 40000} />
      {/* Lightweight (~40 sprites) — kept regardless of tier so they never flash
          out when PerformanceMonitor dips quality during the heavy first frames. */}
      <GalaxyDetail />
      <DiveField count={high ? 4200 : 1500} />
      <Dust count={high ? 70 : 30} />
    </>
  );
}
