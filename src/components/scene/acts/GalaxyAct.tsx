'use client';
import { useScene } from '@/lib/sceneStore';
import Galaxy from '../galaxy/Galaxy';
import GalaxyDetail from '../galaxy/GalaxyDetail';
import GalaxyNebulae from '../galaxy/GalaxyNebulae';
import Dust from '../galaxy/Dust';
import DiveField from '../galaxy/DiveField';
import TransitVeils from '../galaxy/TransitVeils';
import StartupReveal from '../StartupReveal';

/**
 * Act 1 content: the living galaxy, its foreground dust, and the volumetric dive
 * field. The shared sky (gradient + star sphere + nebulae) lives in SceneRoot, so
 * it persists across the act swap. Camera + post FX also live in SceneRoot.
 */
export default function GalaxyAct() {
  const high = useScene((s) => s.quality) === 'high';
  return (
    <>
      <StartupReveal after={0}>
        <Galaxy count={high ? 200000 : 40000} />
      </StartupReveal>
      {/* Lightweight (~40 sprites) - kept regardless of tier so they never flash
          out when PerformanceMonitor dips quality during the heavy first frames. */}
      <StartupReveal after={1}>
        <GalaxyDetail />
      </StartupReveal>
      {/* A6: real Hubble HII pockets embedded in the arms (one-universe family). */}
      <StartupReveal after={2}>
        <GalaxyNebulae />
      </StartupReveal>
      <StartupReveal after={3}>
        <DiveField count={high ? 4200 : 1500} />
      </StartupReveal>
      {/* Photographic nebula veils along the corridor (T2.5) - ~10 soft sprites, cheap
          on any tier, kept regardless of quality so the dive always reads rich. */}
      <StartupReveal after={4}>
        <TransitVeils />
      </StartupReveal>
      <StartupReveal after={5}>
        <Dust count={high ? 70 : 30} />
      </StartupReveal>
    </>
  );
}
