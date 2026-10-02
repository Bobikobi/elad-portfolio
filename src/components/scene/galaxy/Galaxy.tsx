'use client';
import { useMemo, useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import { galaxyVertexShader, galaxyFragmentShader } from './shaders';
import { makeRng, SEED } from '@/lib/rng';

/** Same curve as GLSL smoothstep, on the CPU side. */
const smoothstep = (a: number, b: number, x: number) => {
  const t = Math.min(1, Math.max(0, (x - a) / (b - a)));
  return t * t * (3 - 2 * t);
};

interface GalaxyProps {
  count?: number;
}

// Design system: ivory core → cosmic-blue mid → galaxy-indigo arm edges.
//
// GALAXY-REST: four tightly-wound branches read as concentric rings, not arms (measured: the
// four-fold angular component m4 = 0.18). Two broad arms with a quarter of the winding read as
// arms, and the per-point angular spread below is what makes them broad and irregular instead
// of four thin wires. The core is ivory rather than gold because it is the only warm thing left
// in the frame and gold at this density smeared across 41% of the picture.
// GALAXY-REST round 3: the owner, twice, "the galaxy is too small, spread it wider". The
// projected disc was never the problem - a circle at radius 4 already spans 1550 px of a
// 1440 px frame. What made it read as a small blob in the middle was the RIM FADE: it
// started at 0.48 of the radius and was complete at 0.88, so half the disc's radius carried
// no light and the visible galaxy ended around 0.68 of it. The fade starts later and runs to
// the very rim now, the radius grows with it, and the radial law pushes points outward so
// the larger disc is not paid for by thinning the arms.
const PARAMS = {
  radius: 6.3,
  rimStart: 0.62, // share of the radius where the cloud begins to dissolve
  rimEnd: 1.0,
  radialPower: 0.72, // < 1 pushes points outward; at 0.9 the outer arms went thin as the disc grew
  branches: 2,
  spin: 0.42,
  randomness: 0.22,
  randomnessPower: 2.8,
  armSpread: 0.42, // radians of angular scatter at the rim: broad arms, not wires
  bulgeShare: 0.14, // points drawn into the compact core instead of the disc
  bulgeRadius: 0.85,
  laneOffset: 0.36, // where the dust lane runs across the arm, as a share of the arm's half-width
  laneWidth: 0.22,
  laneDepth: 0.9, // how much of a point's light the lane takes
  discDim: 0.56, // arms read grey-blue instead of white, and stop merging into the core
  bulgeGain: 2.1, // the core is the one thing allowed to saturate
  coreColor: '#FFF4E2', // ivory
  midColor: '#4D8DFF', // --cosmic-blue
  edgeColor: '#6D5AE6', // --galaxy-indigo
  // #82 stage 2 - richness from structure, not light. Three more populations share the disc's
  // budget: a diffuse disc between the arms, star clusters strung along them, and an old warm
  // inner disc; dust filaments then take light out of all of it.
  diffuseShare: 0.1, // disc points spread around the whole disc, not on an arm
  diffuseDim: 0.3,
  knotShare: 0.14, // disc points gathered into clusters along the arms
  knots: 140,
  knotSize: 0.13,
  dustDepth: 1.0, // how much light a dust filament takes
  resolvedShare: 0.25,
  resolvedGain: 2.6,
  // Owner, 2026-10-02: black lanes read as a dark object pasted on the sky. Lanes are a deep
  // indigo of the sky's hue (the sky itself, #23275B, flattened the lanes: fine 3.19, lane 4.67).
  dustColor: '#0D0F33',
  dustLayer: 1.15, // how much of what lies behind a filament the dark layer takes; above 1 the filament core goes fully dark
  // Dust only in silhouette against arm light (share of the brightest binned light): between
  // the arms and past the rim the sky shows through. Disc darker than the sky 42.8% -> 10.2%.
  dustLitFrom: 0.03,
  dustLitTo: 0.15,
  warmColor: '#FFA24A', // the old population: yellow at the core, cream out to the inner arms
  hiiColor: '#FF5FA8',
  warmReach: 0.64, // share of the radius where the inner disc has turned blue
};

/** Seeded 2D value noise on the integer lattice, 0..1, periodic in x with period `px`. */
function hash2(x: number, y: number): number {
  const h = Math.sin(x * 127.1 + y * 311.7) * 43758.5453;
  return h - Math.floor(h);
}
function noise2(x: number, y: number, px: number): number {
  const ix = Math.floor(x), iy = Math.floor(y);
  const fx = x - ix, fy = y - iy;
  const ux = fx * fx * (3 - 2 * fx), uy = fy * fy * (3 - 2 * fy);
  const x0 = ((ix % px) + px) % px, x1 = (x0 + 1) % px;
  const a = hash2(x0, iy), b = hash2(x1, iy), c = hash2(x0, iy + 1), d = hash2(x1, iy + 1);
  return a + (b - a) * ux + (c - a) * uy + (a - b - c + d) * ux * uy;
}

/**
 * How much light the dust leaves at disc position (x, z). The noise lives in the arms' own
 * frame - the angle less the winding, so a constant coordinate runs along an arm - with fewer
 * cells along the radius than around it, which stretches every filament along the arms the way
 * the dust in a real disc is sheared. Ridged, so it makes threads with gaps rather than a
 * blotchy dim, and mottled by a third noise so no thread is the same depth along its length.
 * The cells repeat a whole number of times around the disc, so there is no seam.
 * Tried first: isotropic cells about a unit across in the unwound plane - the threads curled
 * into closed loops and read as ink marbling instead of dust.
 */
function dustKeep(x: number, z: number): number {
  const r = Math.hypot(x, z);
  const turn = (Math.atan2(z, x) - r * PARAMS.spin) / (Math.PI * 2);
  const a = turn - Math.floor(turn);
  const ridge = (n: number) => 1 - Math.abs(2 * n - 1);
  const big = ridge(noise2(a * 26, r * 0.75 + 3, 26));
  const fine = ridge(noise2(a * 64, r * 1.9 + 11, 64));
  const hair = ridge(noise2(a * 120, r * 3.4 + 41, 120));
  const mottle = noise2(a * 40, r * 1.4 + 29, 40);
  const d = Math.max(smoothstep(0.42, 0.84, big), 0.85 * smoothstep(0.62, 0.93, fine), 0.6 * smoothstep(0.7, 0.95, hair)) * (0.45 + 0.55 * mottle);
  return 1 - PARAMS.dustDepth * d;
}

/**
 * The dust as a texture over the disc plane, the same `dustKeep` map the points are thinned by.
 * Additive points can only leave light out, and leaving it out of an arm that many points
 * overlap barely shows (#82 stage 2 measured the lanes at 4% of the galaxy either way); the
 * sky glow under the disc is not the cloud's to remove at all. So the filaments are also drawn
 * as a dark layer, normal-blended after the cloud, which takes light out of whatever lies
 * behind it the way real dust does.
 */
const DUST_TEX = 512;
const LIGHT_GRID = 128;
/**
 * `light` is the disc's starlight binned on a LIGHT_GRID square over the same [-R, R] plane.
 * Dust shows only in silhouette against it: over the sky between the arms the layer drew a dark
 * lens round the whole galaxy, a black shape that read as pasted on the indigo sky (owner,
 * 2026-10-02: "the black around it looks separate from space - the colour gaps").
 */
function dustTexture(light: Float32Array): THREE.DataTexture {
  const R = PARAMS.radius;
  const n = LIGHT_GRID;
  // Two box-blur passes each way (radius 2 cells, ~0.2 units): the arm, not each point.
  let a: Float32Array = light, b: Float32Array = new Float32Array(n * n);
  for (let pass = 0; pass < 4; pass++) {
    const horiz = pass % 2 === 0;
    for (let j = 0; j < n; j++)
      for (let i = 0; i < n; i++) {
        let sum = 0, w = 0;
        for (let k = -2; k <= 2; k++) {
          const ii = horiz ? i + k : i, jj = horiz ? j : j + k;
          if (ii < 0 || jj < 0 || ii >= n || jj >= n) continue;
          sum += a[jj * n + ii]; w++;
        }
        b[j * n + i] = sum / w;
      }
    [a, b] = [b, a];
  }
  const lit = Array.from(a).filter((v) => v > 0).sort((x, y) => x - y);
  const top = lit[Math.floor(lit.length * 0.95)] || 1;
  const data = new Uint8Array(DUST_TEX * DUST_TEX);
  for (let j = 0; j < DUST_TEX; j++) {
    const z = ((j + 0.5) / DUST_TEX) * 2 * R - R;
    const gj = Math.min(n - 1, Math.floor(((j + 0.5) / DUST_TEX) * n));
    for (let i = 0; i < DUST_TEX; i++) {
      const x = ((i + 0.5) / DUST_TEX) * 2 * R - R;
      const gi = Math.min(n - 1, Math.floor(((i + 0.5) / DUST_TEX) * n));
      const gate = smoothstep(PARAMS.dustLitFrom, PARAMS.dustLitTo, a[gj * n + gi] / top);
      data[j * DUST_TEX + i] = Math.round((1 - dustKeep(x, z)) * gate * 255);
    }
  }
  const tex = new THREE.DataTexture(data, DUST_TEX, DUST_TEX, THREE.RedFormat, THREE.UnsignedByteType);
  tex.magFilter = THREE.LinearFilter;
  tex.minFilter = THREE.LinearFilter;
  tex.needsUpdate = true;
  return tex;
}

const dustVertex = /* glsl */ `
  varying vec2 vXZ;
  varying vec3 vWorld;
  void main() {
    vXZ = position.xz;
    vec4 w = modelMatrix * vec4(position, 1.0);
    vWorld = w.xyz;
    gl_Position = projectionMatrix * viewMatrix * w;
  }
`;
const dustFragment = /* glsl */ `
  uniform sampler2D uDust;
  uniform float uRadius;
  uniform float uDepth;
  uniform float uFade;
  uniform vec3 uSky;
  varying vec2 vXZ;
  varying vec3 vWorld;
  void main() {
    float d = texture2D(uDust, vXZ / (2.0 * uRadius) + 0.5).r;
    float t = length(vXZ) / uRadius;
    // None in the bulge's heart or past the rim, where there is no disc to carry it; gone near
    // the lens, so the dive never flies into a dark sheet.
    float a = d * uDepth * smoothstep(0.06, 0.2, t) * (1.0 - smoothstep(0.62, 0.95, t));
    a *= smoothstep(0.8, 2.5, distance(cameraPosition, vWorld)) * uFade;
    gl_FragColor = vec4(uSky, a);
  }
`;

/** Procedural spiral galaxy as a single additive point cloud, spun in the vertex shader. */
export default function Galaxy({ count = 200000 }: GalaxyProps) {
  const matRef = useRef<THREE.ShaderMaterial>(null);
  const pixelRatio = typeof window !== 'undefined' ? Math.min(window.devicePixelRatio, 1.5) : 1;

  const geometry = useMemo(() => {
    const positions = new Float32Array(count * 3);
    const colors = new Float32Array(count * 3);
    const scales = new Float32Array(count);
    const randomness = new Float32Array(count * 3);
    const dims = new Float32Array(count);
    const light = new Float32Array(LIGHT_GRID * LIGHT_GRID);

    const core = new THREE.Color(PARAMS.coreColor);
    const mid = new THREE.Color(PARAMS.midColor);
    const edge = new THREE.Color(PARAMS.edgeColor);
    const warm = new THREE.Color(PARAMS.warmColor);
    const hii = new THREE.Color(PARAMS.hiiColor);
    const tmp = new THREE.Color();
    const rnd = makeRng(SEED.galaxy);

    // Cluster centres on the arms' spines, drawn first so the disc below keeps one sequence.
    const knotAt = Array.from({ length: PARAMS.knots }, (_, k) => {
      const r = 1.1 + rnd() * (PARAMS.radius * PARAMS.rimStart - 1.1);
      const b = ((k % PARAMS.branches) / PARAMS.branches) * Math.PI * 2;
      const a = b + r * PARAMS.spin + (rnd() - 0.5) * PARAMS.armSpread * (0.25 + r / PARAMS.radius) + Math.sin(r * 2.7 + b * 1.7) * 0.16;
      return [Math.cos(a) * r, Math.sin(a) * r];
    });

    for (let i = 0; i < count; i++) {
      const i3 = i * 3;
      const bulge = i % 100 < PARAMS.bulgeShare * 100;
      const pop = bulge ? 0 : rnd();
      const diffuse = pop < PARAMS.diffuseShare;
      const knot = !diffuse && pop < PARAMS.diffuseShare + PARAMS.knotShare;
      // The disc keeps the old radial law; the bulge is a separate, much tighter population,
      // which is what makes the core a point instead of the inner half of the disc.
      let radius = bulge
        ? Math.pow(rnd(), 2.6) * PARAMS.bulgeRadius
        : 0.35 + Math.pow(rnd(), PARAMS.radialPower) * (PARAMS.radius - 0.35);
      const branchAngle = ((i % PARAMS.branches) / PARAMS.branches) * Math.PI * 2;
      const spinAngle = radius * PARAMS.spin;
      // Angular scatter across the arm, widening outward, with a cube law so the arm has a
      // dense spine and thin edges. Plus a slow radial wobble so no arm is a clean curve.
      const t = radius / PARAMS.radius;
      const u = Math.pow(rnd(), 3) * (rnd() < 0.5 ? 1 : -1);
      const spread = bulge || diffuse ? (rnd() - 0.5) * Math.PI * 2 : u * PARAMS.armSpread * (0.25 + t);
      const wobble = bulge || diffuse ? 0 : Math.sin(radius * 2.7 + branchAngle * 1.7) * 0.16;
      let angle = branchAngle + spinAngle + spread + wobble;
      let knotId = -1;
      if (knot) {
        // A cluster: a tight Gaussian-ish ball around one of the centres on the spines.
        knotId = Math.floor(rnd() * PARAMS.knots);
        const c = knotAt[knotId];
        const s = PARAMS.knotSize * Math.sqrt(-2 * Math.log(1 - rnd() * 0.999));
        const th = rnd() * Math.PI * 2;
        const x = c[0] + Math.cos(th) * s, z = c[1] + Math.sin(th) * s;
        radius = Math.hypot(x, z);
        angle = Math.atan2(z, x);
      }

      // Dust lane: a band at a fixed angular offset inside each arm, taking most of the light
      // from the points that fall in it. Additive blending cannot darken, so a lane can only be
      // made by NOT drawing there.
      // Position across the arm, in units of the arm's own half-width, so the lane keeps its
      // proportions from the core to the rim instead of being a fixed angle.
      const half = PARAMS.armSpread * (0.25 + t);
      const across = spread / half;
      // One lane per arm, on the trailing side only. A lane on BOTH sides of both arms is four
      // dark features around the ring, which is exactly the four-fold signature G4 exists to
      // remove: it took m4 from 0.087 back to 0.196. A real dust lane is one-sided anyway.
      const inLane = !bulge && !diffuse && !knot && Math.abs(across - PARAMS.laneOffset) < PARAMS.laneWidth;
      const laneKeep = inLane ? 1 - PARAMS.laneDepth : 1;

      const rand = () =>
        Math.pow(rnd(), PARAMS.randomnessPower) * (rnd() < 0.5 ? 1 : -1) * PARAMS.randomness * radius;

      // The scatter in the disc plane is part of the position, so it turns with the pattern.
      // In aRandomness it was added after the spin, a fixed offset in world space, which slid
      // every point around its place as the disc turned and smeared any structure finer than
      // the scatter - the dust filaments first of all.
      const x = Math.cos(angle) * radius + rand();
      const z = Math.sin(angle) * radius + rand();
      positions[i3] = x;
      positions[i3 + 1] = 0;
      positions[i3 + 2] = z;

      // Real 3D thickness: a spherical bulge near the core, a thin disc in the arms.
      randomness[i3 + 1] = rand() * (0.25 + 1.1 * Math.exp(-radius * 0.85));

      // Three-stage gradient: the old warm population (yellow core, cream inner disc) gives way
      // to blue arms by warmReach, which turn indigo toward the rim. It was ivory into blue from
      // the centre, which left the core the only warm thing and the inner arms white.
      const tr = radius / PARAMS.radius;
      if (bulge) tmp.copy(warm).lerp(core, Math.min(1, tr / (PARAMS.bulgeRadius / PARAMS.radius)) * 0.3);
      else {
        tmp.copy(mid).lerp(edge, Math.max(0, tr - 0.5) * 2);
        if (tr < PARAMS.warmReach) tmp.lerp(warm, 1 - smoothstep(0.3, PARAMS.warmReach, tr));
      }
      // Every third cluster is a star-forming one, lit pink by its hydrogen.
      if (knotId % 3 === 0) tmp.lerp(hii, 0.75);
      colors[i3] = tmp.r;
      colors[i3 + 1] = tmp.g;
      colors[i3 + 2] = tmp.b;

      // A few resolved stars: small and bright, so the disc has grain and not only glow.
      const resolved = !bulge && rnd() < PARAMS.resolvedShare;
      scales[i] = resolved ? 0.35 + rnd() * 0.2 : 0.5 + rnd() * 0.8;
      // Rim fade: the old cloud had a hard outer edge that the frame cut off, so the galaxy ran
      // off three borders. The outer third of the radius fades out instead, and the fade now
      // runs all the way to the rim rather than finishing at 0.88 - a cloud that still carries
      // light at the frame's edge but is visibly FALLING there is what "dissolving into black"
      // means; stopping early is how the galaxy ended up small and centred.
      const rim = 1 - smoothstep(PARAMS.rimStart, PARAMS.rimEnd, t);
      const pDim = diffuse ? PARAMS.diffuseDim : PARAMS.discDim;
      dims[i] = bulge ? PARAMS.bulgeGain : laneKeep * rim * pDim * dustKeep(x, z) * (resolved ? PARAMS.resolvedGain : 1);
      if (!bulge) {
        const gi = Math.floor(((x + PARAMS.radius) / (2 * PARAMS.radius)) * LIGHT_GRID);
        const gj = Math.floor(((z + PARAMS.radius) / (2 * PARAMS.radius)) * LIGHT_GRID);
        if (gi >= 0 && gj >= 0 && gi < LIGHT_GRID && gj < LIGHT_GRID) light[gj * LIGHT_GRID + gi] += laneKeep * rim * pDim;
      }
    }

    const geo = new THREE.BufferGeometry();
    geo.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    geo.setAttribute('aColor', new THREE.BufferAttribute(colors, 3));
    geo.setAttribute('aScale', new THREE.BufferAttribute(scales, 1));
    geo.setAttribute('aRandomness', new THREE.BufferAttribute(randomness, 3));
    geo.setAttribute('aDim', new THREE.BufferAttribute(dims, 1));
    return { geo, dustTex: dustTexture(light) };
  }, [count]);

  const uniforms = useMemo(
    () => ({
      uTime: { value: 0 },
      uSize: { value: 40 },
      uPixelRatio: { value: pixelRatio },
    }),
    [pixelRatio]
  );

  const dustRef = useRef<THREE.Mesh>(null);
  const galaxyCentre = useMemo(() => new THREE.Vector3(), []);
  const dust = useMemo(() => {
    const geo = new THREE.PlaneGeometry(2 * PARAMS.radius, 2 * PARAMS.radius);
    geo.rotateX(-Math.PI / 2);
    return { geo, uniforms: { uDust: { value: geometry.dustTex }, uRadius: { value: PARAMS.radius }, uDepth: { value: PARAMS.dustLayer }, uFade: { value: 1 }, uSky: { value: new THREE.Color(PARAMS.dustColor) } } };
  }, [geometry]);

  useFrame(({ camera }, dt) => {
    if (!matRef.current) return;
    const u = matRef.current.uniforms.uTime;
    u.value += dt;
    const mesh = dustRef.current;
    if (!mesh) return;
    // The vertex shader turns the cloud by uTime * 0.045 about y; the dust turns with it.
    mesh.rotation.y = u.value * 0.045;
    // The welcome shot sits ~9.9 from the centre. The dust is for that view: on the dive the
    // whole frame is disc, and with full dust the passage sank below a mean of 20 for 300ms.
    const d = camera.position.distanceTo(mesh.getWorldPosition(galaxyCentre));
    (mesh.material as THREE.ShaderMaterial).uniforms.uFade.value = THREE.MathUtils.smoothstep(d, 6.5, 9.2);
  });

  // Points never raycast (perf trap); frustumCulled off so the custom-geometry
  // bounding sphere can't cull the galaxy at steep dive angles.
  return (
    <points geometry={geometry.geo} raycast={() => null} frustumCulled={false}>
      <shaderMaterial
        ref={matRef}
        vertexShader={galaxyVertexShader}
        fragmentShader={galaxyFragmentShader}
        uniforms={uniforms}
        transparent
        depthWrite={false}
        blending={THREE.AdditiveBlending}
      />
      <mesh ref={dustRef} geometry={dust.geo} renderOrder={1} raycast={() => null}>
        <shaderMaterial
          vertexShader={dustVertex}
          fragmentShader={dustFragment}
          uniforms={dust.uniforms}
          transparent
          depthWrite={false}
          side={THREE.DoubleSide}
          toneMapped={false}
        />
      </mesh>
    </points>
  );
}
