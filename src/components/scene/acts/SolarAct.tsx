'use client';
import { useRef, useMemo, useEffect, useState } from 'react';
import { useFrame } from '@react-three/fiber';
import { Html, useCursor } from '@react-three/drei';
import * as THREE from 'three';
import { useRouter } from 'next/navigation';
import { useScene } from '@/lib/sceneStore';
import { planetPositions, planetRadii, PLANET_PAGES } from '@/lib/planetPositions';
import { PLANET_SECTION, sectionPath } from '@/lib/sections';
import { useI18n } from '@/lib/i18n';
import Sun from '../solar/Sun';
import AsteroidBelt from '../solar/AsteroidBelt';

const _wp = new THREE.Vector3();
const _ndc = new THREE.Vector3();
const DEG2RAD = Math.PI / 180;

/** A radial ring strip (colour + alpha vs radius) on a 1-D canvas — mapped radially by
 *  the rebuilt RingGeometry UVs. Bright tan bands, a dark Cassini-style gap, soft edges. */
function makeRingTexture(): THREE.Texture {
  const w = 1024;
  const cnv = document.createElement('canvas');
  cnv.width = w;
  cnv.height = 1;
  const ctx = cnv.getContext('2d')!;
  const smooth = (a: number, b: number, x: number) => {
    const t = Math.min(1, Math.max(0, (x - a) / (b - a)));
    return t * t * (3 - 2 * t);
  };
  for (let x = 0; x < w; x++) {
    const u = x / (w - 1); // 0 inner .. 1 outer
    const edges = smooth(0, 0.05, u) * (1 - smooth(0.93, 1, u));
    const cassini = 1 - 0.9 * Math.exp(-Math.pow((u - 0.5) / 0.025, 2)); // dark gap
    const encke = 1 - 0.5 * Math.exp(-Math.pow((u - 0.78) / 0.012, 2));
    const bands = 0.78 + 0.22 * Math.sin(u * 90) * Math.sin(u * 23);
    const a = Math.min(1, edges * cassini * encke * (0.55 + 0.45 * bands));
    const shade = 0.72 + 0.28 * (0.5 + 0.5 * Math.sin(u * 40 + 1));
    ctx.fillStyle = `rgba(${(226 * shade) | 0}, ${(206 * shade) | 0}, ${(158 * shade) | 0}, ${a.toFixed(3)})`;
    ctx.fillRect(x, 0, 1, 1);
  }
  const tx = new THREE.CanvasTexture(cnv);
  tx.colorSpace = THREE.SRGBColorSpace;
  tx.anisotropy = 8;
  return tx;
}

/** One planet on a tilted circular orbit — real texture + atmospheric rim light. */
interface PlanetSpec {
  key: string;
  tex: string;
  rim: string;
  orbit: number;
  size: number;
  speed: number;
  phase: number;
  tilt?: number;
  rings?: boolean;
  moons?: number;
  /** Optional cool multiplier on the body to counter the warm sun (Earth). */
  bodyColor?: string;
}

function Moons({ count, planetSize }: { count: number; planetSize: number }) {
  const group = useRef<THREE.Group>(null);
  const moons = useMemo(
    () => Array.from({ length: count }, (_, i) => ({
      // Hug the planet so at the close ORBIT vantage the moons stay a tight system
      // around it (not scattered across the frame / over the content column).
      r: planetSize * (1.4 + i * 0.12),
      size: planetSize * (0.09 + Math.random() * 0.06),
      speed: 0.5 - i * 0.03,
      phase: Math.random() * 6.28,
      tilt: (Math.random() - 0.5) * 0.5,
    })),
    [count, planetSize]
  );
  useFrame((state) => {
    const t = state.clock.elapsedTime;
    group.current?.children.forEach((m, i) => {
      const o = moons[i];
      const a = o.phase + t * o.speed;
      m.position.set(Math.cos(a) * o.r, Math.sin(a) * o.r * Math.sin(o.tilt), Math.sin(a) * o.r * Math.cos(o.tilt));
    });
  });
  return (
    <group ref={group}>
      {moons.map((o, i) => (
        <mesh key={i}>
          <sphereGeometry args={[o.size, 16, 16]} />
          <meshStandardMaterial color="#b8b2a8" roughness={0.9} />
        </mesh>
      ))}
    </group>
  );
}

// v2 "poster camera": bright, close framing. Distances compressed hard and planets
// large so each reads as a real textured ball; the page-planets (earth/mars/jupiter/
// saturn) sit inside ~radius 8 so ≥3 stay fully in frame while outer decorative
// planets crop at the edges by design. Orbits are SLOW (full revolution ~5-10 min:
// speed ≈ 2π/period) so any exit/return is a rare, graceful event; phases staggered
// so the idle frame never lines the planets up. No orbit rings (no glowing hoops).
const PLANETS: PlanetSpec[] = [
  { key: 'mercury', tex: '/textures/mercury.jpg', rim: '#b0a08c', orbit: 1.95, size: 0.16, speed: 0.0205, phase: 0.6 },
  { key: 'venus', tex: '/textures/venus.jpg', rim: '#e8c98a', orbit: 2.55, size: 0.26, speed: 0.0170, phase: 3.7 },
  // Earth gets a gentle cool multiplier to counter the warm sun (reads blue/white,
  // not gold); the close-orbit over-exposure is handled by per-planet ORBIT exposure
  // in CameraRig (inner planets sit so close to the sun the lit disc would otherwise
  // clip to gold regardless of albedo).
  { key: 'earth', tex: '/textures/earth.jpg', rim: '#7dbaff', orbit: 3.35, size: 0.40, speed: 0.0150, phase: 1.7, tilt: 0.41, bodyColor: '#cfe0ff' },
  { key: 'mars', tex: '/textures/mars.jpg', rim: '#e07a4a', orbit: 4.25, size: 0.30, speed: 0.0128, phase: 5.0, tilt: 0.44 },
  { key: 'jupiter', tex: '/textures/jupiter.jpg', rim: '#d8b98a', orbit: 6.3, size: 0.64, speed: 0.0105, phase: 2.5, moons: 4 },
  { key: 'saturn', tex: '/textures/saturn.jpg', rim: '#e6cf9a', orbit: 8.0, size: 0.58, speed: 0.0090, phase: 5.9, tilt: 0.47, rings: true, moons: 8 },
  { key: 'uranus', tex: '/textures/uranus.jpg', rim: '#9fe0e6', orbit: 9.4, size: 0.44, speed: 0.0074, phase: 3.0, tilt: 1.7 },
  { key: 'neptune', tex: '/textures/neptune.jpg', rim: '#5a78ff', orbit: 10.6, size: 0.42, speed: 0.0062, phase: 0.4 },
];

/** Zodiacal light — a faint gold dust glow lying in the ecliptic plane, catching
 *  the sun. One flat disc (2 tris) with a soft radial band; fills the "full system"
 *  feeling cheaply without adding geometry. */
const zodiacFrag = /* glsl */ `
  varying vec2 vUv;
  void main() {
    vec2 c = vUv - 0.5;
    float r = length(c) * 2.0;                       // 0 centre .. 1 edge
    float band = smoothstep(0.05, 0.28, r) * (1.0 - smoothstep(0.42, 0.85, r));
    gl_FragColor = vec4(vec3(1.0, 0.84, 0.55) * band, band * 0.09);
  }
`;
const zodiacVert = /* glsl */ `
  varying vec2 vUv;
  void main() { vUv = uv; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }
`;
function ZodiacalDust() {
  return (
    <mesh rotation={[-Math.PI / 2, 0, 0]}>
      <planeGeometry args={[36, 36]} />
      <shaderMaterial vertexShader={zodiacVert} fragmentShader={zodiacFrag} transparent blending={THREE.AdditiveBlending} depthWrite={false} side={THREE.DoubleSide} />
    </mesh>
  );
}

// Kept for Pass B (Layout v2), where it returns as the reference poster's "cropped
// giant" with CORRECT sun lighting. Unmounted for now: at the poster pose it faced the
// camera with its far (unlit) side → a black sphere. Flip to true only once relit.
const SHOW_FOREGROUND_ANCHOR = false;

/** Foreground anchor — one big, near-static decorative planet cropped into a bottom
 *  corner (steals the "cropped giant" from the reference poster). It instantly makes
 *  the frame feel full and deep. Darker + desaturated so hierarchy stays clear; NOT
 *  clickable, no label. Lit by the sun so it has its own terminator. Lives outside
 *  the orbiting root group (world-fixed), drifting a hair. */
function ForegroundAnchor() {
  const ref = useRef<THREE.Group>(null);
  const tex = useMemo(() => {
    const tx = new THREE.TextureLoader().load('/textures/jupiter.jpg');
    tx.colorSpace = THREE.SRGBColorSpace;
    tx.anisotropy = 8;
    return tx;
  }, []);
  useEffect(() => () => { tex.dispose(); }, [tex]);
  useFrame((state, dt) => {
    if (ref.current) {
      ref.current.rotation.y += dt * 0.02;
      // barely-there drift so it feels alive but never distracts
      ref.current.position.x = -4.9 + Math.sin(state.clock.elapsedTime * 0.05) * 0.12;
      ref.current.position.y = -3.1 + Math.cos(state.clock.elapsedTime * 0.04) * 0.1;
    }
  });
  return (
    <group ref={ref} position={[-4.9, -3.1, 4.6]}>
      <mesh>
        <sphereGeometry args={[2.35, 64, 64]} />
        {/* darker + desaturated (grey tint) → clearly subordinate to the page-planets */}
        <meshStandardMaterial map={tex} color="#6a6a72" roughness={0.95} metalness={0.02} />
      </mesh>
    </group>
  );
}

// Fresnel rim that hugs the SUN-LIT limb (sun sits at the world origin), not a full
// hoop around the silhouette. Intensity is a uniform: idle 0.35, hover 0.9.
const rimVert = /* glsl */ `
  varying vec3 vN; varying vec3 vV; varying vec3 vWPos; varying vec3 vWN;
  void main() {
    vec4 mv = modelViewMatrix * vec4(position,1.0);
    vV = normalize(-mv.xyz);
    vN = normalize(normalMatrix*normal);
    vec4 wp = modelMatrix * vec4(position,1.0);
    vWPos = wp.xyz;
    vWN = normalize(mat3(modelMatrix) * normal);
    gl_Position = projectionMatrix*mv;
  }
`;
const rimFrag = /* glsl */ `
  uniform vec3 uColor; uniform float uIntensity;
  varying vec3 vN; varying vec3 vV; varying vec3 vWPos; varying vec3 vWN;
  void main() {
    float f = pow(1.0 - max(dot(vV, vN), 0.0), 3.0);   // view-fresnel (limb)
    vec3 L = normalize(-vWPos);                          // toward the sun at origin
    float lit = clamp(dot(normalize(vWN), L), 0.0, 1.0);// 0 night .. 1 lit
    float rim = f * (0.15 + 0.85 * lit) * uIntensity;   // stays on the lit side
    gl_FragColor = vec4(uColor, rim);
  }
`;

function Planet({ spec }: { spec: PlanetSpec }) {
  const { t, locale } = useI18n();
  const router = useRouter();
  const group = useRef<THREE.Group>(null);
  const spinGroup = useRef<THREE.Group>(null);
  const mesh = useRef<THREE.Mesh>(null);
  const angle = useRef(spec.phase);
  const labelRef = useRef<HTMLButtonElement>(null);
  const [hovered, setHovered] = useState(false);
  const page = PLANET_PAGES[spec.key];
  // Clicking a planet navigates to its section route; the URL is the source of
  // truth and CosmicStage's bridge flies the camera there.
  const open = () => {
    const section = PLANET_SECTION[spec.key];
    if (section) router.push(sectionPath(section, locale));
  };
  useCursor(hovered && !!page);

  const texture = useMemo(() => {
    const tx = new THREE.TextureLoader().load(spec.tex);
    tx.colorSpace = THREE.SRGBColorSpace;
    tx.anisotropy = 8;
    return tx;
  }, [spec.tex]);
  // Procedural ring strip (colour + alpha vs radius), drawn to a 1-D canvas and mapped
  // radially. Deterministic and CSP-safe — avoids the saturn_ring.png alpha-layout that
  // sampled transparent under RingGeometry's UVs and made the rings vanish entirely.
  const ringTex = useMemo(() => (spec.rings ? makeRingTexture() : null), [spec.rings]);
  // Rebuild the ring UVs so U runs radially (inner→outer edge) to match the strip.
  const ringGeo = useMemo(() => {
    if (!spec.rings) return null;
    const inner = spec.size * 1.35;
    const outer = spec.size * 2.5;
    const g = new THREE.RingGeometry(inner, outer, 128, 1);
    const pos = g.attributes.position;
    const uv = g.attributes.uv;
    const v = new THREE.Vector3();
    for (let i = 0; i < pos.count; i++) {
      v.fromBufferAttribute(pos, i);
      uv.setXY(i, (v.length() - inner) / (outer - inner), 0.5);
    }
    uv.needsUpdate = true;
    return g;
  }, [spec.rings, spec.size]);
  const rimUniforms = useMemo(() => ({ uColor: { value: new THREE.Color(spec.rim) }, uIntensity: { value: 0.35 } }), [spec.rim]);

  useEffect(() => {
    if (page) {
      planetPositions.set(spec.key, new THREE.Vector3());
      planetRadii.set(spec.key, spec.size);
    }
    return () => { texture.dispose(); ringTex?.dispose(); ringGeo?.dispose(); planetPositions.delete(spec.key); planetRadii.delete(spec.key); };
  }, [texture, ringTex, ringGeo, page, spec.key, spec.size]);

  useFrame((state, dt) => {
    angle.current += dt * spec.speed;
    // Rim intensity eases toward idle 0.35 / hover 0.9 (a fade, not a switch).
    const rimTarget = hovered && page ? 0.9 : 0.35;
    const uI = rimUniforms.uIntensity;
    uI.value += (rimTarget - uI.value) * Math.min(1, dt * 6);
    if (group.current) {
      group.current.position.set(Math.cos(angle.current) * spec.orbit, 0, Math.sin(angle.current) * spec.orbit);
      if (page) {
        group.current.getWorldPosition(_wp);
        planetPositions.get(spec.key)?.copy(_wp);
        if (labelRef.current) {
          // Overview pills belong ONLY to the solar overview — hide every label the
          // moment a world is focused (ORBIT), else it floats as an orphan over the panel.
          const focused = useScene.getState().focusedPlanet;
          if (focused) {
            labelRef.current.style.opacity = '0';
            labelRef.current.style.pointerEvents = 'none';
          } else {
            // Overview: hide the label when its planet is partially cropped by the
            // frame edge (a pill floating at the edge reads as broken).
            const cam = state.camera as THREE.PerspectiveCamera;
            _ndc.copy(_wp).project(cam);
            const dist = cam.position.distanceTo(_wp);
            const rY = spec.size / (dist * Math.tan((cam.fov * DEG2RAD) / 2));
            const rX = rY / (state.size.width / state.size.height);
            const cropped = _ndc.z > 1 || Math.abs(_ndc.x) + rX > 0.98 || Math.abs(_ndc.y) + rY > 0.98;
            labelRef.current.style.opacity = cropped ? '0' : '1';
            labelRef.current.style.pointerEvents = cropped ? 'none' : 'auto';
          }
        }
      }
    }
    if (mesh.current) mesh.current.rotation.y += dt * 0.3;
  });

  const bind = page
    ? {
        onClick: (e: { stopPropagation: () => void }) => { e.stopPropagation(); open(); },
        onPointerOver: (e: { stopPropagation: () => void }) => { e.stopPropagation(); setHovered(true); },
        onPointerOut: () => setHovered(false),
      }
    : {};

  return (
    <group ref={group}>
      <group ref={spinGroup} rotation={[0, 0, spec.tilt ?? 0]} scale={hovered && page ? 1.12 : 1}>
        <mesh ref={mesh} {...bind}>
          <sphereGeometry args={[spec.size, 64, 64]} />
          <meshStandardMaterial map={texture} color={spec.bodyColor ?? '#ffffff'} roughness={0.9} metalness={0.02} />
        </mesh>
        {/* Atmospheric rim light (heightened realism, tinted from the planet). */}
        <mesh scale={1.05}>
          <sphereGeometry args={[spec.size, 32, 32]} />
          <shaderMaterial vertexShader={rimVert} fragmentShader={rimFrag} uniforms={rimUniforms} transparent side={THREE.BackSide} blending={THREE.AdditiveBlending} depthWrite={false} />
        </mesh>
        {spec.rings && ringTex && ringGeo && (
          <mesh rotation={[Math.PI / 2.05, 0, 0]} geometry={ringGeo}>
            <meshBasicMaterial map={ringTex} transparent opacity={1} side={THREE.DoubleSide} depthWrite={false} />
          </mesh>
        )}
        {spec.moons && <Moons count={spec.moons} planetSize={spec.size} />}
      </group>
      {/* No distanceFactor — the pill holds a constant, legible screen size (≥13px)
          at the poster distance instead of shrinking into the planet. */}
      {page && (
        <Html center position={[0, spec.size + 0.5, 0]} zIndexRange={[20, 0]}>
          <button
            ref={labelRef}
            onClick={open}
            onPointerOver={() => setHovered(true)}
            onPointerOut={() => setHovered(false)}
            className="pointer-events-auto whitespace-nowrap rounded-full border border-white/20 bg-[rgba(5,7,20,0.78)] px-3.5 py-1.5 text-[13px] font-medium leading-none text-[var(--color-star-white)] shadow-[0_4px_18px_rgba(5,7,20,0.55)] transition-colors duration-200 hover:border-[var(--color-core-gold)]/70 hover:text-[var(--color-core-gold)]"
            style={{ fontFamily: 'var(--font-body, var(--font-hebrew))' }}
          >
            {t(page.labelKey)}
          </button>
        </Html>
      )}
    </group>
  );
}

/**
 * Act 2: the solar system. M2 = basic reveal (sun + real central light + orbiting
 * bodies + Saturn rings + starfield). M3 adds textures, God Rays, moons, labels,
 * the living light and eclipse moments.
 */
export default function SolarAct() {
  const root = useRef<THREE.Group>(null);
  const high = useScene((s) => s.quality) === 'high';
  useFrame((_, dt) => {
    if (root.current) root.current.rotation.y += dt * 0.004;
  });
  return (
    <>
      <ambientLight intensity={0.06} />
      {/* Star sphere + nebulae come from the shared SceneRoot sky (one universe). */}
      <group ref={root} rotation={[0.42, 0, 0]}>
        <Sun />
        <ZodiacalDust />
        {PLANETS.map((p) => (
          <Planet key={p.key} spec={p} />
        ))}
        <AsteroidBelt count={high ? 900 : 300} />
      </group>
      {/* World-fixed foreground giant — disabled until relit in Pass B (see flag). */}
      {SHOW_FOREGROUND_ANCHOR && <ForegroundAnchor />}
    </>
  );
}
