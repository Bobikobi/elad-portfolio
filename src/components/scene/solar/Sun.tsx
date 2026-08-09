'use client';
import { useEffect, useMemo, useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import { useScene } from '@/lib/sceneStore';
import { softSprite, flameSprite, streakSprite, CORE_GOLD } from '@/lib/spaceMaterials';
import { makeRng, SEED } from '@/lib/rng';

// Shared compact value-noise (used by both the surface colour and the edge wobble).
const NOISE_GLSL = /* glsl */ `
  float hash(vec3 p){ p = fract(p*0.3183099+0.1); p*=17.0; return fract(p.x*p.y*p.z*(p.x+p.y+p.z)); }
  float noise(vec3 x){ vec3 i=floor(x), f=fract(x); f=f*f*(3.0-2.0*f);
    return mix(mix(mix(hash(i+vec3(0,0,0)),hash(i+vec3(1,0,0)),f.x),
                   mix(hash(i+vec3(0,1,0)),hash(i+vec3(1,1,0)),f.x),f.y),
               mix(mix(hash(i+vec3(0,0,1)),hash(i+vec3(1,0,1)),f.x),
                   mix(hash(i+vec3(0,1,1)),hash(i+vec3(1,1,1)),f.x),f.y),f.z); }
  float fbm(vec3 p){ float v=0.0, a=0.5; for(int i=0;i<4;i++){ v+=a*noise(p); p*=2.0; a*=0.5; } return v; }
  // SUN-2 granulation. TWO octaves, not four: this is sampled at ten times the surface
  // frequency, and fbm's remaining octaves would land at ~70 cycles per radius - finer than
  // the disc has pixels at any framing the sun is seen at, which is not detail, it is noise
  // for the sampler to alias.
  float grain(vec3 p){ return noise(p) * 0.62 + noise(p * 2.0) * 0.38; }
`;

// Slightly wobbling edge — the silhouette breathes so it's not a hard circle.
const sunVert = /* glsl */ `
  uniform float uTime;
  varying vec3 vPos;
  varying vec3 vNormal;
  ${NOISE_GLSL}
  void main() {
    vPos = position;
    vNormal = normalize(normalMatrix * normal);
    float d = fbm(normalize(position) * 3.0 + vec3(0.0, uTime * 0.12, 0.0));
    // 0.09 -> 0.13. With the bloom no longer smeared across the limb the silhouette is
    // measured against the geometry itself rather than the glow around it, and the same
    // displacement that read as 1.55% of the radius through the haze reads as 1.16%
    // without it. The edge did not get calmer; it stopped being flattered.
    vec3 displaced = position + normal * (d - 0.5) * 0.13;
    gl_Position = projectionMatrix * modelViewMatrix * vec4(displaced, 1.0);
  }
`;
// Two-octave flowing plasma. HDR (>1) output so Bloom + God Rays catch it.
const sunFrag = /* glsl */ `
  uniform float uTime;
  uniform float uPulse;
  varying vec3 vPos;
  varying vec3 vNormal;
  ${NOISE_GLSL}
  void main() {
    // SUN-2, and this is the change that decides whether it reads as a star at all.
    //
    // At 2.4 the base octave completes about seven cycles across the disc: continent-sized
    // soft blotches. Looking at the crop rather than the statistic is what caught it - the
    // sun read as a pale moon, mottled at a scale no photograph of a star has, and no amount
    // of exposure or fine grain fixes a structure that is simply the wrong size. Doubled, it
    // is about fourteen, and the weight moves to the finer of the two so the big shapes stop
    // dominating the face.
    vec3 p = vPos * 4.6;
    float slow = fbm(p + vec3(0.0, uTime*0.05, 0.0));               // big slow swirls
    float fast = fbm(p*2.6 - vec3(0.0, uTime*0.16, uTime*0.05));    // fast granules
    float n = slow*0.45 + fast*0.55;
    // SUN-2. The surface had the large blotches and nothing else - measured, its
    // high-frequency energy was 1.3 luminance units against 6.5 for the large structure, and
    // that is what makes a photographed sun read as smooth instead of boiling. A detail
    // octave at 10x the surface frequency, drifting SLOWLY and across the other two rather
    // than with them, so the three do not read as one sheet sliding.
    // Kept at the SAME absolute frequency it had before the base was doubled - 62 times the
    // surface position, not 26 times a base that has itself moved - or the two octaves would
    // have converged and there would be no separation between the cells and their grain.
    float gr = grain(p*13.6 + vec3(uTime*0.09, -uTime*0.06, uTime*0.04));
    n += (gr - 0.5) * 0.17;
    // B3: these were mixed for a frame that had NO tone mapper, where anything over 1
    // simply clamped and (1.0, 0.5, 0.11) stayed vividly gold. ACES desaturates its
    // highlights toward white on the way up, so the same values came out pale butter.
    // Pushing the source far more saturated keeps the star burning gold AFTER the curve —
    // measured, the mid tone now lands at sRGB (254, 218, 124) instead of a washed cream —
    // while the HDR magnitude stays high, which is what Bloom and God Rays read.
    vec3 dark = vec3(0.60, 0.13, 0.015);
    vec3 mid  = vec3(1.00, 0.30, 0.030);
    vec3 hot  = vec3(1.00, 0.74, 0.300);
    // SUN-2: the lanes between the cells go deeper and the ramp starts earlier, so the dark
    // stop is actually reached somewhere on the disc instead of being a limit the surface
    // approaches. The HOT stop is untouched - B3 measured the gold that survives ACES at
    // exactly these values, and the tone-map discipline is not what this stage is changing.
    // The ramp's windows move UP. n centres near 0.5, so with the old windows almost the
    // whole disc sat at or past the mid stop and the surface came out one flat cream tone -
    // "not rich enough", and correctly so: a photographed sun is mostly deep amber with the
    // bright cells as a minority. Now most of the face lives between the dark and mid stops,
    // and the hot stop is reserved for the cells that have actually earned it.
    vec3 col = mix(dark, mid, smoothstep(0.34, 0.74, n));
    col = mix(col, hot, smoothstep(0.74, 0.94, n));
    // SUN-2 limb darkening. The exponent was 0.35, which holds the term above 0.9 across
    // most of the disc and then falls off a cliff in the last few percent of the radius: the
    // rendered limb measured 1.006x the centre's luminance, i.e. no sphericity at all. At
    // 0.6 the darkening is spread across the disc, which is the term that makes a flat
    // circle read as a ball.
    float ndv = max(dot(vNormal, vec3(0.0,0.0,1.0)), 0.0);
    // Depth 32% -> 48%. Measured on the preview, a 32% darkening arrived at the screen as a
    // 6% one: bloom spills off the bright interior and fills the limb back in. The term has
    // to be stronger than the result we want, because something downstream is subtracting
    // from it - which is a statement about the composite, not about physics.
    float limb = pow(ndv, 0.6);
    // Exposure, on the owner's ruling. At 2.2 every radial bin of the disc measured between
    // 205 and 230 of 255 - the top fifth of the range, where ACES compresses hardest and
    // desaturates toward white. The grain was being drawn and then flattened, a 32% limb
    // darkening was arriving as 2%, and the gold B3 locked was coming out chalk. Measured at
    // 1.4 the grain became visible and the mid tone's red-to-blue gap doubled; 1.5 keeps
    // that and gives back a little of the brightness.
    // Depth 48% -> 74%, and this needs saying plainly: the criterion was written in the
    // wrong colour space. A real sun's limb sits at 65-75% of its centre in LINEAR
    // intensity; the screenshot it is measured in is tone-mapped and display-encoded, where
    // that same ratio reads around 0.85, not 0.70. Measured here the curve is far more
    // compressive than gamma alone - a linear 0.72 came back as 0.91 - so hitting 0.85 on
    // screen needs about 0.57 linear, and that is where this number comes from.
    col *= (1.5 + uPulse) * mix(0.26, 1.0, limb);
    gl_FragColor = vec4(col, 1.0);
  }
`;

const SUN_R = 1.5;
const PROM_COUNT = 7;

// R2.2 milky-halo fix. A bisection (Debug HUD + corner luminance) showed the washed
// "milky halo" around the sun on arrival — worst on mobile — came from the additive gold
// corona SHELL (scale 1.28) being amplified by Bloom into a large pale disc, with the soft
// outer halo SPRITE (scale 4.4) secondary. Both off: Bloom alone gives a tight natural
// glow and the system sits in dark space (corners <10% lum, measured).
const SHOW_HALO_SPRITE = false;  // big soft gold disc (scale 4.4) - milky-halo contributor
const SHOW_CORONA_SHELL = false; // corona backside shell (scale 1.28) - primary milky-halo source
const SHOW_ANAMORPHIC = true;    // short horizontal gold streak - kept (subtle, not a wash)

/**
 * Solar prominences — flame arcs licking off the limb, each on its own irregular cycle so
 * some are erupting while others fade (spec: break in 10-25s cycles).
 *
 * B3: they used to read as orange petals stuck to the sun, for two reasons. The sprite was
 * the shared ROUND softSprite stretched 0.5 × 2.0 — an ellipse, not a flame — and the ring
 * lived in the sun's own local XY plane, so as the camera moved off that axis the "limb"
 * arcs slid inward over the disc and became lobes sitting on the face. Now: a tapered
 * flame texture whose base is at the limb, the group BILLBOARDS to the camera so the ring
 * always rides the silhouette from every vantage, and the colour/opacity sit close enough
 * to the sun's own hot rim that they read as part of it.
 */
function Prominences() {
  const group = useRef<THREE.Group>(null);
  const tex = useMemo(() => flameSprite(), []);
  const proms = useMemo(() => {
    const rnd = makeRng(SEED.prominences);
    return Array.from({ length: PROM_COUNT }, (_, i) => {
      const a = (i / PROM_COUNT) * Math.PI * 2 + rnd() * 0.5;
      return {
        a,
        x: Math.cos(a),
        y: Math.sin(a),
        len: 0.8 + rnd() * 1.1,
        speed: 0.06 + rnd() * 0.09,
        phase: rnd() * 6.28,
      };
    });
  }, []);
  useFrame((state) => {
    const t = state.clock.elapsedTime;
    const g = group.current;
    if (!g) return;
    // Billboard: the ring of arcs lives in the plane facing the camera, so every one of
    // them is on the silhouette no matter where the camera has flown to.
    g.quaternion.copy(state.camera.quaternion);
    for (let i = 0; i < proms.length; i++) {
      const pr = proms[i];
      // Irregular eruption envelope: mostly small, occasionally licks out far.
      const base = 0.5 + 0.5 * Math.sin(t * pr.speed + pr.phase);
      const burst = Math.max(0, Math.sin(t * pr.speed * 0.5 + pr.phase * 1.7) - 0.72) * 3.4;
      const e = Math.min(1.4, base * 0.5 + burst);
      const s = g.children[i] as THREE.Sprite;
      const l = SUN_R * (0.30 + pr.len * 0.34 * e);
      // The flame's BASE is at v=0, i.e. the bottom edge of the sprite, so the sprite's
      // centre has to sit half a length outboard for the base to land on the limb.
      const anchor = SUN_R * 0.985 + l * 0.5;
      s.position.set(pr.x * anchor, pr.y * anchor, 0);
      s.scale.set(SUN_R * (0.16 + 0.10 * e), l, 1);
      // SUN-2: the arcs sat at 0.05-0.25 on additive blending, against a rim the bloom has
      // already lit - close to invisible, so the limb read as a clean circle with nothing
      // happening on it. Raised enough to be seen against dark space at the silhouette,
      // still driven entirely by each arc's own eruption envelope.
      (s.material as THREE.SpriteMaterial).opacity = 0.08 + 0.30 * e;
      s.material.rotation = pr.a - Math.PI / 2;
    }
  });
  return (
    <group ref={group}>
      {proms.map((_, i) => (
        <sprite key={i}>
          {/* Close to the sun's own hot rim, not a separate orange - the arcs must read as
              the star's edge coming apart, never as decoration laid on top of it. */}
          <spriteMaterial map={tex} color={'#ffb469'} transparent opacity={0.1} blending={THREE.AdditiveBlending} depthWrite={false} toneMapped={false} />
        </sprite>
      ))}
    </group>
  );
}

/** The burning sun: displaced plasma surface (HDR for Bloom/God Rays), fresnel
 *  corona, soft gold halo, living prominences and a slow pulse. Registers its mesh
 *  as the God Rays source. Its gold = the galaxy core's gold (one continuity). */
export default function Sun() {
  const meshRef = useRef<THREE.Mesh>(null);
  const streakRef = useRef<THREE.Sprite>(null);
  const setSunMesh = useScene((s) => s.setSunMesh);
  const tex = useMemo(() => softSprite(), []);
  const streakTex = useMemo(() => streakSprite(), []);
  const uniforms = useMemo(() => ({ uTime: { value: 0 }, uPulse: { value: 0 } }), []);
  // Driven through the live material — a memoised object is frozen to the React Compiler.
  const sunMat = useRef<THREE.ShaderMaterial>(null);
  const prevCam = useRef(new THREE.Vector3());
  const speed = useRef(0);

  useEffect(() => {
    setSunMesh(meshRef.current);
    return () => setSunMesh(null);
  }, [setSunMesh]);

  useFrame((state, dt) => {
    const u = sunMat.current?.uniforms;
    let pulse = 0;
    if (u) {
      u.uTime.value += dt;
      // Breathe on irregular slow noise + rare flare pulse (spec: sun is alive).
      const t = u.uTime.value;
      pulse = 0.15 * Math.sin(t * 0.6) + 0.1 * Math.sin(t * 0.23 + 1.3) + Math.max(0, Math.sin(t * 0.11) - 0.9) * 3.0;
      u.uPulse.value = pulse;
    }
    if (meshRef.current) meshRef.current.rotation.y += dt * 0.03;

    // Camera speed in world units per second, damped. Drives the streak: light stretches
    // when the frame moves and eases back on braking.
    const v = dt > 1e-4 ? prevCam.current.distanceTo(state.camera.position) / dt : 0;
    prevCam.current.copy(state.camera.position);
    speed.current += (Math.min(v, 12) - speed.current) * Math.min(1, dt * 2.5);
    const s = streakRef.current;
    if (s) {
      const stretch = 1 + speed.current * 0.22;
      s.scale.set(7 * stretch, 0.6 + speed.current * 0.02, 1);
      (s.material as THREE.SpriteMaterial).opacity = 0.10 + Math.min(0.16, speed.current * 0.035) + pulse * 0.05;
    }
  });

  return (
    <group name="sun">
      {/* B3: the starlight was #ffd9a0 - linear (1.00, 0.69, 0.35), i.e. it delivers
          three times as much red as blue. On a body that is already red, Mars, the red
          channel saturated while blue never got off the floor: that is what "neon
          yellow" was made of. A G star is close to white; the gold identity of this
          system comes from the sun's own emissive surface and its bloom, both of which
          are toneMapped:false and untouched by this. */}
      <pointLight position={[0, 0, 0]} intensity={650} distance={90} decay={2} color="#fff0dc" />
      {/* Plasma surface (the God Rays source) */}
      <mesh ref={meshRef}>
        <sphereGeometry args={[SUN_R, 96, 96]} />
        <shaderMaterial ref={sunMat} vertexShader={sunVert} fragmentShader={sunFrag} uniforms={uniforms} toneMapped={false} />
      </mesh>
      <Prominences />
      {/* Fresnel-ish corona shell */}
      {SHOW_CORONA_SHELL && (
        <mesh scale={1.28}>
          <sphereGeometry args={[SUN_R, 32, 32]} />
          <meshBasicMaterial color={CORE_GOLD} transparent opacity={0.12} side={THREE.BackSide} blending={THREE.AdditiveBlending} depthWrite={false} toneMapped={false} />
        </mesh>
      )}
      {/* Soft outer halo sprite - hugs the corona. Kept tight + low opacity so it reads
          as corona bloom, not a milky haze washing the frame (F3, worst on small/mobile
          viewports where the same sprite covers more of the frame). */}
      {SHOW_HALO_SPRITE && (
        <sprite scale={[4.4, 4.4, 1]}>
          <spriteMaterial map={tex} color={CORE_GOLD} transparent opacity={0.1} blending={THREE.AdditiveBlending} depthWrite={false} toneMapped={false} />
        </sprite>
      )}
      {/* B5: the anamorphic streak. Was the round sprite stretched 8 x 0.28 - an ellipse,
          which has a waist, so it read as a bar laid across the sun instead of light
          bleeding sideways out of it. Now a purpose-drawn streak (thickest and brightest
          at the centre, thinning to nothing at both tips) whose length and brightness are
          driven by how fast the camera is moving: a lens flares harder when the frame is
          moving, and a constant streak is a decal. */}
      {SHOW_ANAMORPHIC && (
        <sprite ref={streakRef} scale={[7, 0.6, 1]}>
          <spriteMaterial map={streakTex} color={'#ffd9a0'} transparent opacity={0.13} blending={THREE.AdditiveBlending} depthWrite={false} toneMapped={false} />
        </sprite>
      )}
    </group>
  );
}
