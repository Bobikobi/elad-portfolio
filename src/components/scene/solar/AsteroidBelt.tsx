'use client';
import { useMemo, useRef, useLayoutEffect, useEffect } from 'react';
import { useFrame, useThree } from '@react-three/fiber';
import * as THREE from 'three';
import { HUD_AVAILABLE } from '../DebugHud';
import {
  chromeCount,
  chromeKeep,
  chromeMaskGLSL,
  chromeRects,
  updateChromeRects,
} from '@/lib/chromeMask';

const _dbs = new THREE.Vector2();
const _m = new THREE.Matrix4();
const _p = new THREE.Vector3();
const _q = new THREE.Quaternion();
const _s = new THREE.Vector3();
const _e = new THREE.Euler();
const _c = new THREE.Color();

// The belt lives between Mars (orbit 4.25) and Jupiter (6.3): a fine, dense ring, not a
// necklace of boulders. Radii are drawn from a soft gaussian around the centre so the
// belt has a dense core that thins at both edges (its real cross-section), and angles
// cluster into a few streams (Kirkwood-gap clumping) with dust between them.
//
// R5.3 — the annulus is HARD-CLAMPED to a corridor that cannot reach either neighbour's
// sphere. The old spread reached 6.10, while Jupiter's surface starts at 6.30 − 0.64 =
// 5.66: rocks were being seeded INSIDE the giant and poked back out through its skin as
// specks crawling over the disc. Radius never changes after seeding and everything orbits
// as one rigid group, so a purely radial guarantee holds for all time.
const BELT_R = 5.1; // ring centre
const BELT_HALF = 0.3; // half-width of the dense zone
const CLUSTERS = 5;
const MARS_REACH = 4.25 + 0.3; // Mars orbit + radius
const JUPITER_REACH = 6.3 - 0.64; // Jupiter orbit − radius
const R_MIN = MARS_REACH + 0.2; // 4.75
const R_MAX = JUPITER_REACH - 0.2; // 5.46

// ── B1: the size law ────────────────────────────────────────────────────────────────
// The belt used to read as a necklace of gold boulders. Two reasons, both fixed here.
//
// (1) SIZE. The old law (`0.014 + rand^5 * 0.11`) put its MEDIAN grain at ~4px and its
//     tail at ~28px in the overview frame — every rock was a legible object. At the
//     overview pose the near edge of the belt is ~5.6 units from the lens, which is
//     ~215 drawing px per world unit, so "sub-3px everywhere" means a radius under
//     0.007. The law below is a power law of exponent 18 over a 0.030 span, which puts
//     ~90% of the bodies under that line and caps the rarest chunk at ~13px.
// (2) BRIGHTNESS. See ROCK_COLORS.
const R0 = 0.0016; // smallest grain
const R_SPAN = 0.03; // largest chunk = R0 + R_SPAN
const R_POW = 18; // power law — overwhelmingly dust
/** At or above this radius a body is worth a lit, shaded mesh; below it, it is dust. */
const MESH_MIN = 0.007;

// Near-camera dissolve. In the close ORBIT frame the camera sits ~2.6 units from the
// focused planet, so belt rocks drifting between it and the lens rendered as crude
// low-poly boulders filling the frame. They now dissolve as they approach: a stable
// screen-space dither `discard` on the mesh layer, so the material stays OPAQUE and
// fully depth-tested against the planets — a fade would have needed transparency, which
// is exactly what breaks depth ordering. The dust layer is already transparent, so it
// gets the same curve as a real alpha fade.
const NEAR_GONE = 1.1; // fully dissolved closer than this (world units)
const NEAR_FULL = 3.4; // fully solid beyond this

// Rocky palette — cool basalt greys through warm carbonaceous browns, and DARK. The old
// palette sat around 42% sRGB; at the belt's distance the sun delivers an irradiance of
// ~25, so a 42% rock leaves the shader at a radiance over 1.0, clips through the tone
// mapper and then trips the bloom threshold. That is the entire reason the belt read as
// gold: it was blowing out, not reflecting. At ~20% sRGB the same rock lands near 0.25
// radiance — a rock lit by a star, which is what it is.
const ROCK_COLORS = ['#37312c', '#413a32', '#2c2723', '#4a3f34', '#252220', '#544738'];
// Dust catches the same light but is seen in bulk, so it is tinted a touch warmer.
const DUST_COLORS = ['#7d6a55', '#8e7a61', '#6b5c4c', '#9a8365'];

/**
 * Asteroid belt between Mars and Jupiter, in TWO layers cut from ONE size distribution:
 *
 * - bodies at or above {@link MESH_MIN} are real lit rocks in a single InstancedMesh
 *   (one draw call, lumpy per-axis scale, baked tumble, per-instance tint);
 * - everything below it — about nine in ten — is dust, rendered as clamped 1-2.6px
 *   additive points with forward-scattering brightness, so the ring reads as a fine
 *   glowing band rather than as countable objects.
 *
 * It is a size-based LOD, not a second belt: the split threshold is the point where a
 * body stops being resolvable, and both layers share the seeding, the orbit group, the
 * near-camera dissolve and the chrome mask.
 */
export default function AsteroidBelt({ count = 12000 }: { count?: number }) {
  const meshRef = useRef<THREE.InstancedMesh>(null);
  const gl = useThree((s) => s.gl);
  const camera = useThree((s) => s.camera);

  const belt = useMemo(() => {
    // Gaussian-ish radius via averaging two uniforms (triangular) → dense core, thin edges.
    const gauss = () => Math.random() + Math.random() - 1; // ~[-1,1], peaked at 0
    const rocks: {
      angle: number; radius: number; y: number; size: number;
      lump: [number, number, number]; color: string; rx: number; ry: number; rz: number;
    }[] = [];
    const dust: { angle: number; radius: number; y: number; size: number; color: string; phase: number; rate: number }[] = [];

    for (let i = 0; i < count; i++) {
      // Clumped angle: pick a stream centre, spread within it; a fraction scatter freely
      // as inter-stream dust so the clumps don't look like hard spokes.
      const stream = Math.floor(Math.random() * CLUSTERS) * ((Math.PI * 2) / CLUSTERS);
      const clumped = Math.random() < 0.72;
      const angle = clumped ? stream + gauss() * 0.55 : Math.random() * Math.PI * 2;
      const raw = BELT_R + gauss() * BELT_HALF + (clumped ? 0 : gauss() * 0.18);
      const radius = Math.min(R_MAX, Math.max(R_MIN, raw)); // never inside a neighbour
      const y = gauss() * 0.16; // thin vertical spread → a disc, not a tube
      const size = R0 + Math.pow(Math.random(), R_POW) * R_SPAN;

      if (size >= MESH_MIN) {
        rocks.push({
          angle, radius, y, size,
          lump: [0.7 + Math.random() * 0.6, 0.7 + Math.random() * 0.6, 0.7 + Math.random() * 0.6],
          color: ROCK_COLORS[(Math.random() * ROCK_COLORS.length) | 0],
          rx: Math.random() * 6.28, ry: Math.random() * 6.28, rz: Math.random() * 6.28,
        });
      } else {
        dust.push({
          angle, radius, y, size,
          color: DUST_COLORS[(Math.random() * DUST_COLORS.length) | 0],
          phase: Math.random() * 6.28,
          rate: 0.5 + Math.random() * 1.6,
        });
      }
    }
    return { rocks, dust };
  }, [count]);

  /** Packed attribute buffers for the dust layer. */
  const dustGeo = useMemo(() => {
    const n = belt.dust.length;
    const pos = new Float32Array(n * 3);
    const col = new Float32Array(n * 3);
    const siz = new Float32Array(n);
    const twk = new Float32Array(n * 2);
    for (let i = 0; i < n; i++) {
      const d = belt.dust[i];
      pos[i * 3] = Math.cos(d.angle) * d.radius;
      pos[i * 3 + 1] = d.y;
      pos[i * 3 + 2] = Math.sin(d.angle) * d.radius;
      _c.set(d.color);
      col[i * 3] = _c.r; col[i * 3 + 1] = _c.g; col[i * 3 + 2] = _c.b;
      siz[i] = d.size;
      twk[i * 2] = d.phase; twk[i * 2 + 1] = d.rate;
    }
    const g = new THREE.BufferGeometry();
    g.setAttribute('position', new THREE.BufferAttribute(pos, 3));
    g.setAttribute('aColor', new THREE.BufferAttribute(col, 3));
    g.setAttribute('aSize', new THREE.BufferAttribute(siz, 1));
    g.setAttribute('aTwinkle', new THREE.BufferAttribute(twk, 2));
    g.boundingSphere = new THREE.Sphere(new THREE.Vector3(), R_MAX + 1);
    return g;
  }, [belt]);
  useEffect(() => () => dustGeo.dispose(), [dustGeo]);

  const dustUniforms = useMemo(
    () => ({
      uTime: { value: 0 },
      uProjScale: { value: 600 },
      uChrome: chromeRects,
      uChromeN: chromeCount,
    }),
    []
  );

  useLayoutEffect(() => {
    const mesh = meshRef.current;
    if (!mesh) return;
    belt.rocks.forEach((r, i) => {
      _p.set(Math.cos(r.angle) * r.radius, r.y, Math.sin(r.angle) * r.radius);
      _e.set(r.rx, r.ry, r.rz);
      _q.setFromEuler(_e);
      _s.set(r.size * r.lump[0], r.size * r.lump[1], r.size * r.lump[2]);
      _m.compose(_p, _q, _s);
      mesh.setMatrixAt(i, _m);
      mesh.setColorAt(i, _c.set(r.color));
    });
    mesh.count = belt.rocks.length;
    mesh.instanceMatrix.needsUpdate = true;
    if (mesh.instanceColor) mesh.instanceColor.needsUpdate = true;
  }, [belt]);

  // Verification handles (same HUD_AVAILABLE gate as the debug HUD, so they are stripped
  // from the production bundle). `__belt` publishes what was SEEDED; `__beltProbe()`
  // answers what the CURRENT frame actually shows — projected sizes and, crucially, the
  // mask value at every body that lands under a piece of chrome.
  useEffect(() => {
    if (!HUD_AVAILABLE || typeof window === 'undefined') return;
    const all = [
      ...belt.rocks.map((r) => ({ ...r, reach: r.size * Math.max(...r.lump) })),
      ...belt.dust.map((d) => ({ ...d, reach: d.size })),
    ];
    let rMin = Infinity;
    let rMax = -Infinity;
    for (const b of all) {
      if (b.radius - b.reach < rMin) rMin = b.radius - b.reach;
      if (b.radius + b.reach > rMax) rMax = b.radius + b.reach;
    }
    const w = window as unknown as Record<string, unknown>;
    w.__belt = {
      total: all.length,
      rocks: belt.rocks.length,
      dust: belt.dust.length,
      rMin, rMax,
      marsReach: MARS_REACH,
      jupiterReach: JUPITER_REACH,
      nearGone: NEAR_GONE,
      nearFull: NEAR_FULL,
      meshMin: MESH_MIN,
    };

    const group = () => meshRef.current?.parent ?? null;
    w.__beltProbe = () => {
      const g = group();
      if (!g) return null;
      g.updateWorldMatrix(true, false);
      camera.updateMatrixWorld();
      const size = gl.getDrawingBufferSize(new THREE.Vector2());
      const half = size.y * 0.5;
      const projScale = camera.projectionMatrix.elements[5] * half; // px per world unit at 1 unit
      const v = new THREE.Vector3();
      const px: number[] = [];
      let onScreen = 0;
      let insideChrome = 0;
      let worstKeep = 0;
      for (const b of all) {
        v.set(Math.cos(b.angle) * b.radius, b.y, Math.sin(b.angle) * b.radius);
        v.applyMatrix4(g.matrixWorld);
        const world = v.clone();
        v.project(camera);
        const dist = world.distanceTo(camera.position);
        const near = Math.min(1, Math.max(0, (dist - NEAR_GONE) / (NEAR_FULL - NEAR_GONE)));
        const diameter = (2 * b.reach * projScale) / dist;
        if (v.z > 1 || Math.abs(v.x) > 1 || Math.abs(v.y) > 1 || near <= 0) continue;
        onScreen++;
        px.push(diameter);
        const fx = (v.x * 0.5 + 0.5) * size.x;
        const fy = (v.y * 0.5 + 0.5) * size.y; // gl_FragCoord space (bottom-up)
        let masked = false;
        for (let i = 0; i < chromeCount.value; i++) {
          const r = chromeRects.value[i];
          if (fx >= r.x && fx <= r.z && fy >= r.y && fy <= r.w) { masked = true; break; }
        }
        if (masked) {
          insideChrome++;
          worstKeep = Math.max(worstKeep, chromeKeep(fx, fy));
        }
      }
      px.sort((a, b2) => a - b2);
      const q = (f: number) => (px.length ? px[Math.min(px.length - 1, Math.floor(px.length * f))] : 0);
      return {
        onScreen,
        medianPx: +q(0.5).toFixed(2),
        p90Px: +q(0.9).toFixed(2),
        maxPx: +(px[px.length - 1] ?? 0).toFixed(2),
        subThreePct: +((px.filter((d) => d < 3).length / Math.max(1, px.length)) * 100).toFixed(1),
        chromeRects: chromeCount.value,
        insideChrome,
        worstKeepInsideChrome: +worstKeep.toFixed(4),
      };
    };
    return () => { delete w.__beltProbe; };
  }, [belt, camera, gl]);

  // Near-camera dissolve + chrome mask, injected into the standard material so the rocks
  // keep real lighting, real depth-writes and the single draw call. `vViewPosition` is
  // already a varying on MeshStandardMaterial, so this costs one length() and a hash per
  // fragment.
  const onBeforeCompile = useMemo(
    () => (shader: THREE.WebGLProgramParametersWithUniforms) => {
      shader.uniforms.uChrome = chromeRects;
      shader.uniforms.uChromeN = chromeCount;
      shader.fragmentShader = shader.fragmentShader.replace(
        'void main() {',
        `${chromeMaskGLSL}\nvoid main() {`
      );
      shader.fragmentShader = shader.fragmentShader.replace(
        '#include <clipping_planes_fragment>',
        `#include <clipping_planes_fragment>
         {
           float _camD = length( vViewPosition );
           float _keep = smoothstep( ${NEAR_GONE.toFixed(2)}, ${NEAR_FULL.toFixed(2)}, _camD )
                       * chromeKeep( gl_FragCoord.xy );
           if ( _keep < 0.999 ) {
             float _h = fract( sin( dot( gl_FragCoord.xy, vec2(12.9898, 78.233) ) ) * 43758.5453 );
             if ( _h > _keep ) discard;
           }
         }`
      );
    },
    []
  );

  const groupRef = useRef<THREE.Group>(null);
  useFrame((state, dt) => {
    if (groupRef.current) groupRef.current.rotation.y += dt * 0.025;
    updateChromeRects(state.gl);
    dustUniforms.uTime.value = state.clock.elapsedTime;
    // px per world unit at one unit of depth — kept live so the clamp survives a DPR
    // change from AdaptiveDpr (cost may vary per tier; the reading must not).
    dustUniforms.uProjScale.value =
      state.camera.projectionMatrix.elements[5] * 0.5 * state.gl.getDrawingBufferSize(_dbs).y;
  });

  return (
    <group ref={groupRef}>
      <instancedMesh
        ref={meshRef}
        args={[undefined, undefined, Math.max(1, belt.rocks.length)]}
        frustumCulled={false}
      >
        <icosahedronGeometry args={[1, 0]} />
        {/* No `color` prop: the per-instance instanceColor (setColorAt) multiplies the
            default white base, so each rock keeps its own tint from one draw call.
            Opaque + depthWrite (the default) is deliberate: it is what makes the belt
            depth-test correctly against every planet. */}
        <meshStandardMaterial roughness={0.95} metalness={0.0} flatShading onBeforeCompile={onBeforeCompile} />
      </instancedMesh>

      {/* Dust: the nine-in-ten of the belt that is too small to be an object. Additive and
          depth-TESTED (never depth-written) so a planet still occludes it, but a dense
          stretch of it glows the way a real dust band catches sunlight. */}
      <points geometry={dustGeo} frustumCulled={false}>
        <shaderMaterial
          uniforms={dustUniforms}
          vertexShader={dustVert}
          fragmentShader={dustFrag}
          transparent
          depthWrite={false}
          blending={THREE.AdditiveBlending}
        />
      </points>
    </group>
  );
}

const dustVert = /* glsl */ `
  uniform float uTime;
  uniform float uProjScale;
  attribute vec3 aColor;
  attribute float aSize;
  attribute vec2 aTwinkle;   // x = phase, y = rate
  varying vec3 vColor;
  varying float vAlpha;

  void main() {
    vec4 mv = modelViewMatrix * vec4( position, 1.0 );
    gl_Position = projectionMatrix * mv;

    float dist = max( 0.001, -mv.z );
    // Clamp is the whole point: a dust grain must never grow into a legible object as
    // the camera closes on it. Below 1px it would only alias, so the floor holds it at 1.
    gl_PointSize = clamp( aSize * 2.0 * uProjScale / dist, 1.0, 2.6 );

    // Forward scattering: the sun sits at this group's origin, so its view-space position
    // is the translation column of the view matrix. Dust between us and the star glows;
    // dust on our side of it is dim. This is what gives the ring a lit near-edge.
    vec3 sunView = ( viewMatrix * vec4( 0.0, 0.0, 0.0, 1.0 ) ).xyz;
    vec3 toEye = normalize( -mv.xyz );
    vec3 lightDir = normalize( mv.xyz - sunView );
    float forward = max( dot( toEye, lightDir ), 0.0 );
    float scatter = 0.35 + 0.65 * pow( forward, 2.2 );

    float near = smoothstep( ${NEAR_GONE.toFixed(2)}, ${NEAR_FULL.toFixed(2)}, dist );
    float twinkle = 0.78 + 0.22 * sin( uTime * aTwinkle.y + aTwinkle.x );

    vColor = aColor;
    vAlpha = 0.22 * scatter * near * twinkle;
  }
`;

const dustFrag = /* glsl */ `
  ${chromeMaskGLSL}
  varying vec3 vColor;
  varying float vAlpha;
  void main() {
    // Soft round grain — no hard sprite edge anywhere in this scene (B13).
    float a = smoothstep( 0.5, 0.08, distance( gl_PointCoord, vec2( 0.5 ) ) );
    float keep = chromeKeep( gl_FragCoord.xy );
    float alpha = a * vAlpha * keep;
    if ( alpha < 0.002 ) discard;
    gl_FragColor = vec4( vColor, alpha );
    #include <tonemapping_fragment>
    #include <colorspace_fragment>
  }
`;
