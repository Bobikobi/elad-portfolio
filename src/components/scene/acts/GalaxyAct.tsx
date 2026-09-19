'use client';
import { useScene } from '@/lib/sceneStore';
import Galaxy from '../galaxy/Galaxy';
import GalaxyDetail from '../galaxy/GalaxyDetail';
import GalaxyNebulae from '../galaxy/GalaxyNebulae';
import Dust from '../galaxy/Dust';
import DiveFade from '../galaxy/DiveFade';

/**
 * Act 1 content: the living galaxy, its foreground dust, and the dive's fade to black.
 * The shared sky (gradient + star sphere + nebulae) lives in SceneRoot, so it persists
 * across the act swap. Camera + post FX also live in SceneRoot.
 *
 * CROSSING removed two members of this act: `DiveField`, 4,200 billboarded stars stretched
 * along their own screen velocity, and `TransitVeils`, ten additive Hubble stills flown
 * through the corridor. Both existed only during the dive — both were invisible at rest —
 * and together they took the frame from the galaxy's own 76 mean luminance to 148, with 30%
 * of the picture above level 200 and a red-green split of 28 that exists nowhere else on
 * the site. They are what a clean-eyes judgement called fireworks laid over a picture. The
 * dive now travels through darkness instead: `DiveFade`.
 */
export default function GalaxyAct() {
  const high = useScene((s) => s.quality) === 'high';
  return (
    <>
      <Galaxy count={high ? 200000 : 40000} />
      {/* Lightweight (~40 sprites) - kept regardless of tier so they never flash
          out when PerformanceMonitor dips quality during the heavy first frames. */}
      <GalaxyDetail />
      {/* A6: real Hubble HII pockets embedded in the arms (one-universe family). */}
      <GalaxyNebulae />
      <DiveFade />
      <Dust count={high ? 70 : 30} />
    </>
  );
}
