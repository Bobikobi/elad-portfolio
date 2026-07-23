'use client';
import { EffectComposer, Bloom, Vignette, Noise, GodRays, HueSaturation } from '@react-three/postprocessing';
import { useScene } from '@/lib/sceneStore';

/**
 * Post FX (one fullscreen pass). Runs uninterrupted across the act swap (one camera,
 * one look) so the two scene-graphs read as one world.
 *
 * Bloom threshold is ACT-DEPENDENT — this is the difference between "space" and
 * "purple fog": the galaxy act is a dim additive point cloud, so thresholding it
 * flickers → threshold 0. The solar act has textured planets + an HDR (>1) sun; a
 * zero threshold there blooms the entire dark-indigo sky into a uniform purple haze
 * and blurs every star into mush. So in solar we raise the threshold to ~0.7 — only
 * the burning sun and lit planet limbs bloom, the sky stays deep and the stars crisp.
 */
export default function Effects() {
  const act = useScene((s) => s.act);
  const sunMesh = useScene((s) => s.sunMesh);
  const high = useScene((s) => s.quality) === 'high';
  const focused = useScene((s) => s.focusedPlanet);
  const solar = act === 'solar';
  // God Rays belong to the OVERVIEW where the sun is the hero. In a focused world
  // (ORBIT) the sun is framed off-screen; leaving God Rays on would streak its glare
  // back in from the edge and re-dominate the frame (F1). So: overview only.
  const godRays = solar && !focused && sunMesh && high;

  return (
    <EffectComposer multisampling={0}>
      {godRays ? (
        <GodRays sun={sunMesh} samples={high ? 60 : 30} density={0.82} decay={0.92} weight={0.085} exposure={0.16} clampMax={0.72} blur />
      ) : (
        <></>
      )}
      <Bloom
        mipmapBlur
        intensity={solar ? 0.6 : 0.5}
        luminanceThreshold={solar ? 0.72 : 0}
        luminanceSmoothing={solar ? 0.22 : 0}
        radius={solar ? 0.45 : 0.5}
      />
      {/* Global grade: a gentle saturation lift — colour on the planets without touching
          any texture. Kept LOW in solar (was 0.14) because the higher lift pushed the dim
          sky violet, which the vignette then framed as a milky "lavender oval" (F1). */}
      {solar ? <HueSaturation saturation={0.06} /> : <></>}
      {/* Very subtle film grain + vignette — the glue that binds the depth layers. */}
      <Noise premultiply opacity={0.045} />
      {/* Deeper vignette in the solar act pulls the corners to deep space (spec: <10%
          brightness at the edges) while the sun keeps the centre warm. */}
      <Vignette offset={solar ? 0.32 : 0.28} darkness={solar ? 0.87 : 0.62} />
    </EffectComposer>
  );
}
