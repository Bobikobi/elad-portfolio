'use client';
import { useRef, useMemo, useEffect, useState } from 'react';
import { useFrame, useThree } from '@react-three/fiber';
import { Html, useCursor } from '@react-three/drei';
import * as THREE from 'three';
import { useRouter } from 'next/navigation';
import { useScene } from '@/lib/sceneStore';
import { planetPositions, planetRadii, PLANET_PAGES } from '@/lib/planetPositions';
import { PLANET_SECTION, sectionPath, SECTIONS } from '@/lib/sections';
import { useI18n } from '@/lib/i18n';
import Sun from '../solar/Sun';
import AsteroidBelt from '../solar/AsteroidBelt';

const _wp = new THREE.Vector3();
const _ndc = new THREE.Vector3();
const DEG2RAD = Math.PI / 180;

// --- A1: focused-planet texture tiering ------------------------------------------------
// The overview keeps its 2K base map (small on screen); once a page-planet is FOCUSED
// (ORBIT, ~2/3 of the frame) we lazily upgrade it — mid (half-res webp) on a mid GPU, hi
// (native 8K/4K webp) on a strong desktop GPU, and NOT at all on mobile (coarse pointer
// stays 2K). Load is fetch → createImageBitmap → gl.initTexture (pre-upload, no arrival
// stall) → a ~0.5s crossfade via a mix uniform, so the disc is never naked/black/popping.
// Only one planet is ever focused, so at most one hi texture is resident; it is disposed
// on leave (budget: max one 8K resident — verified via renderer.info in dev).
type HiTier = 'base' | 'mid' | 'hi';
const DEV = process.env.NODE_ENV !== 'production';
const HI_FADE = 0.5; // s

let _white1: THREE.DataTexture | null = null;
function white1(): THREE.DataTexture {
  if (!_white1) {
    _white1 = new THREE.DataTexture(new Uint8Array([255, 255, 255, 255]), 1, 1, THREE.RGBAFormat);
    _white1.needsUpdate = true;
  }
  return _white1;
}

function hiTierFor(): HiTier {
  if (typeof window === 'undefined') return 'base';
  if (window.matchMedia('(pointer: coarse)').matches) return 'base'; // mobile stays 2K
  return useScene.getState().quality === 'high' ? 'hi' : 'mid';
}

/** Fetch + decode a tier texture off the critical path and pre-upload it to the GPU so the
 *  material swap never stalls the flight. flipY handled to match the base TextureLoader map. */
async function loadHiRes(key: string, tier: HiTier, gl: THREE.WebGLRenderer): Promise<THREE.Texture | null> {
  const res = await fetch(`/textures/hi/${key}.${tier}.webp`);
  if (!res.ok) return null;
  const bitmap = await createImageBitmap(await res.blob(), { imageOrientation: 'flipY' });
  const tex = new THREE.Texture(bitmap);
  tex.flipY = false; // bitmap already flipped → matches the base map's orientation
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.anisotropy = Math.min(8, gl.capabilities.getMaxAnisotropy());
  tex.wrapS = THREE.RepeatWrapping; // match the base map (A2 band shear)
  tex.needsUpdate = true;
  gl.initTexture(tex);
  return tex;
}

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
  /** A2: gas-giant "living bands". `flow` = domain-warp turbulence amplitude on the
   *  albedo UV; `shear` = per-unit-time latitudinal band shear (adjacent bands oppose).
   *  `haze` = Mars drifting dust-haze amount. `earth` = enable the cloud + night-lights
   *  layers. All zero/undefined ⇒ a static rocky body. */
  flow?: number;
  shear?: number;
  haze?: number;
  earth?: boolean;
  /** A3: atmospheric limb-scattering hue + idle strength (~0.4 subtle). Falls back to
   *  `rim` when `atmo` is absent; airless bodies use a low strength. */
  atmo?: string;
  atmoStrength?: number;
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
  { key: 'mercury', tex: '/textures/mercury.jpg', rim: '#b0a08c', orbit: 1.95, size: 0.16, speed: 0.0205, phase: 0.6, atmoStrength: 0.12 },
  { key: 'venus', tex: '/textures/venus.jpg', rim: '#e8c98a', orbit: 2.55, size: 0.26, speed: 0.0170, phase: 3.7, atmo: '#f6e6b0', atmoStrength: 0.6 },
  // Earth gets a gentle cool multiplier to counter the warm sun (reads blue/white,
  // not gold); the close-orbit over-exposure is handled by per-planet ORBIT exposure
  // in CameraRig (inner planets sit so close to the sun the lit disc would otherwise
  // clip to gold regardless of albedo).
  { key: 'earth', tex: '/textures/earth.jpg', rim: '#7dbaff', orbit: 3.35, size: 0.40, speed: 0.0150, phase: 1.7, tilt: 0.41, bodyColor: '#cfe0ff', earth: true, atmo: '#a8d0ff', atmoStrength: 0.5 },
  { key: 'mars', tex: '/textures/mars.jpg', rim: '#e07a4a', orbit: 4.25, size: 0.30, speed: 0.0128, phase: 5.0, tilt: 0.44, haze: 0.12, atmo: '#e0a882', atmoStrength: 0.28 },
  { key: 'jupiter', tex: '/textures/jupiter.jpg', rim: '#d8b98a', orbit: 6.3, size: 0.64, speed: 0.0105, phase: 2.5, moons: 4, flow: 0.012, shear: 0.005, atmo: '#d8e8ff', atmoStrength: 0.5 },
  { key: 'saturn', tex: '/textures/saturn.jpg', rim: '#e6cf9a', orbit: 8.0, size: 0.58, speed: 0.0090, phase: 5.9, tilt: 0.47, rings: true, moons: 8, flow: 0.009, shear: 0.0035, atmo: '#f0dcae', atmoStrength: 0.45 },
  { key: 'uranus', tex: '/textures/uranus.jpg', rim: '#9fe0e6', orbit: 9.4, size: 0.44, speed: 0.0074, phase: 3.0, tilt: 1.7, flow: 0.005, shear: 0.0015, atmo: '#c8f2f4', atmoStrength: 0.45 },
  { key: 'neptune', tex: '/textures/neptune.jpg', rim: '#5a78ff', orbit: 10.6, size: 0.42, speed: 0.0062, phase: 0.4, flow: 0.008, shear: 0.003, atmo: '#7f9dff', atmoStrength: 0.5 },
];

/** Zodiacal light — a faint gold dust glow lying in the ecliptic plane, catching
 *  the sun. One flat disc (2 tris) with a soft radial band; fills the "full system"
 *  feeling cheaply without adding geometry. */
const zodiacFrag = /* glsl */ `
  varying vec2 vUv;
  void main() {
    vec2 c = vUv - 0.5;
    float r = length(c) * 2.0;                       // 0 centre .. 1 edge
    float band = smoothstep(0.05, 0.30, r) * (1.0 - smoothstep(0.38, 0.7, r));
    gl_FragColor = vec4(vec3(1.0, 0.84, 0.55) * band, band * 0.05);
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

// A3: atmospheric limb scattering. A two-tone fresnel on a slightly-larger BackSide shell
// (sun at world origin): a broad haze in the atmosphere hue plus a thin, whiter bright
// line at the very limb (forward scatter), living on the DAY side and fading through the
// terminator into night. This is what separates a "textured ball" from a "world".
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
    float f = 1.0 - max(dot(vV, vN), 0.0);              // 0 disc centre .. 1 silhouette limb
    float glow = pow(f, 3.0);                            // broad atmospheric haze
    float edge = pow(f, 9.0);                            // thin bright scattering line at the limb
    vec3 L = normalize(-vWPos);                          // toward the sun at origin
    float lit = smoothstep(-0.25, 0.35, dot(normalize(vWN), L)); // day-side, softly through the terminator
    vec3 col = uColor + vec3(0.55) * edge;               // two-tone: hue + whiter forward-scatter edge
    float a = (glow * 0.75 + edge) * lit * uIntensity;
    gl_FragColor = vec4(col, a);
  }
`;

// --- A2: Earth cloud shell + night-lights (day/night) ---------------------------------
// Both layers ride the surface's spin (children of the albedo mesh); clouds add a hair of
// extra rotation so they drift over the ground. `vWN`/`vWPos` give the sun-facing factor
// (sun at world origin) so lights show on the dark hemisphere and clouds shade at the
// terminator — the pair is what turns a blue ball into a living planet.
const earthVert = /* glsl */ `
  varying vec2 vUv; varying vec3 vWN; varying vec3 vWPos;
  void main() {
    vUv = uv;
    vec4 wp = modelMatrix * vec4(position, 1.0);
    vWPos = wp.xyz;
    vWN = normalize(mat3(modelMatrix) * normal);
    gl_Position = projectionMatrix * viewMatrix * wp;
  }
`;
const earthNightFrag = /* glsl */ `
  uniform sampler2D uMap; varying vec2 vUv; varying vec3 vWN; varying vec3 vWPos;
  void main() {
    float lit = dot(normalize(vWN), normalize(-vWPos));
    float night = smoothstep(0.08, -0.2, lit);          // 1 on the dark hemisphere
    vec3 lights = texture2D(uMap, vUv).rgb;
    gl_FragColor = vec4(lights * 2.0, night);           // additive; alpha gates to night (survives the low ORBIT exposure)
  }
`;
const earthCloudFrag = /* glsl */ `
  uniform sampler2D uMap; varying vec2 vUv; varying vec3 vWN; varying vec3 vWPos;
  void main() {
    float c = texture2D(uMap, vUv).r;                    // cloud density (grayscale)
    float lit = clamp(dot(normalize(vWN), normalize(-vWPos)), 0.0, 1.0);
    float shade = 0.12 + 0.9 * lit;                      // clouds go dark past the terminator
    float a = smoothstep(0.16, 0.7, c) * 0.9;
    gl_FragColor = vec4(vec3(shade), a);
  }
`;

function EarthLayers({ radius }: { radius: number }) {
  const clouds = useRef<THREE.Mesh>(null);
  const cloudTex = useMemo(() => {
    const tx = new THREE.TextureLoader().load('/textures/earth_clouds.webp');
    tx.colorSpace = THREE.SRGBColorSpace; tx.anisotropy = 8; return tx;
  }, []);
  const nightTex = useMemo(() => {
    const tx = new THREE.TextureLoader().load('/textures/earth_night.webp');
    tx.colorSpace = THREE.SRGBColorSpace; tx.anisotropy = 8; return tx;
  }, []);
  useEffect(() => () => { cloudTex.dispose(); nightTex.dispose(); }, [cloudTex, nightTex]);
  const cloudUniforms = useMemo(() => ({ uMap: { value: cloudTex } }), [cloudTex]);
  const nightUniforms = useMemo(() => ({ uMap: { value: nightTex } }), [nightTex]);
  useFrame((_, dt) => { if (clouds.current) clouds.current.rotation.y += dt * 0.045; });
  const skip = () => null; // overlays are visual only — never intercept planet taps
  return (
    <>
      <mesh scale={1.002} raycast={skip}>
        <sphereGeometry args={[radius, 64, 64]} />
        <shaderMaterial vertexShader={earthVert} fragmentShader={earthNightFrag} uniforms={nightUniforms} transparent blending={THREE.AdditiveBlending} depthWrite={false} />
      </mesh>
      <mesh ref={clouds} scale={1.02} raycast={skip}>
        <sphereGeometry args={[radius, 64, 64]} />
        <shaderMaterial vertexShader={earthVert} fragmentShader={earthCloudFrag} uniforms={cloudUniforms} transparent depthWrite={false} />
      </mesh>
    </>
  );
}

function Planet({ spec }: { spec: PlanetSpec }) {
  const { t, locale } = useI18n();
  const router = useRouter();
  const gl = useThree((s) => s.gl);
  const focused = useScene((s) => s.focusedPlanet);
  const group = useRef<THREE.Group>(null);
  const spinGroup = useRef<THREE.Group>(null);
  const mesh = useRef<THREE.Mesh>(null);
  const angle = useRef(spec.phase);
  const labelRef = useRef<HTMLButtonElement>(null);
  // A1 hi-res crossfade state (page planets only).
  const hiShader = useRef<THREE.WebGLProgramParametersWithUniforms | null>(null);
  const hiTex = useRef<THREE.Texture | null>(null);
  const hiTarget = useRef(0); // 0 = show base, 1 = show hi
  const [hovered, setHovered] = useState(false);
  const page = PLANET_PAGES[spec.key];
  // Clicking a planet navigates to its section route; the URL is the source of
  // truth and CosmicStage's bridge flies the camera there.
  const open = () => {
    // A drag-to-rotate gesture (T6) ends with a pointerup on a planet too — don't let
    // it navigate. The threshold flag is set by DragControls.
    if (useScene.getState().dragMoved) return;
    const section = PLANET_SECTION[spec.key];
    if (section) router.push(sectionPath(section, locale));
  };
  useCursor(hovered && !!page);

  const texture = useMemo(() => {
    const tx = new THREE.TextureLoader().load(spec.tex);
    tx.colorSpace = THREE.SRGBColorSpace;
    tx.anisotropy = 8;
    tx.wrapS = THREE.RepeatWrapping; // let the A2 band shear scroll U seamlessly
    return tx;
  }, [spec.tex]);
  // Albedo material. Page planets get a mix-in hi-res sampler (A1): the base 2K map is
  // always the floor; `uHiMap`/`uHiMix` crossfade the focused hi-res texture in on top of
  // it in the exact same UV space, so upgrade/downgrade is a fade, never a pop.
  const material = useMemo(() => {
    const m = new THREE.MeshStandardMaterial({ map: texture, color: spec.bodyColor ?? '#ffffff', roughness: 0.9, metalness: 0.02 });
    m.onBeforeCompile = (shader) => {
      shader.uniforms.uHiMap = { value: white1() };
      shader.uniforms.uHiMix = { value: 0 };
      shader.uniforms.uTime = { value: 0 };
      shader.uniforms.uFlow = { value: spec.flow ?? 0 };   // A2 gas-giant band turbulence
      shader.uniforms.uShear = { value: spec.shear ?? 0 }; // A2 latitudinal band shear
      shader.uniforms.uHaze = { value: spec.haze ?? 0 };   // A2 Mars dust haze
      shader.fragmentShader =
        `uniform sampler2D uHiMap; uniform float uHiMix, uTime, uFlow, uShear, uHaze;
         float _h(vec2 p){ return fract(sin(dot(p, vec2(127.1,311.7))) * 43758.5453); }
         float _n(vec2 p){ vec2 i=floor(p), f=fract(p); vec2 u=f*f*(3.0-2.0*f);
           return mix(mix(_h(i),_h(i+vec2(1,0)),u.x), mix(_h(i+vec2(0,1)),_h(i+vec2(1,1)),u.x), u.y); }
        ` + shader.fragmentShader;
      shader.fragmentShader = shader.fragmentShader.replace(
        '#include <map_fragment>',
        `#ifdef USE_MAP
           vec2 flowUv = vMapUv;
           if ( uFlow > 0.0 ) {
             // Latitudinal band shear — adjacent bands scroll in opposite directions
             // (wraps via RepeatWrapping); plus two-octave domain-warp turbulence so the
             // bands swirl, not just slide. Reads over ~20-30s.
             float bandDir = sin( vMapUv.y * 20.0 );
             flowUv.x += bandDir * uShear * uTime;
             float t = uTime * 0.03;
             float w = ( _n( vec2( vMapUv.x * 4.0 - t,       vMapUv.y * 10.0 ) ) - 0.5 ) * 0.6
                     + ( _n( vec2( vMapUv.x * 8.0 + t * 1.7, vMapUv.y * 16.0 ) ) - 0.5 ) * 0.4;
             flowUv.x += w * uFlow;
             flowUv.y += w * uFlow * 0.35;
           }
           vec4 sampledDiffuseColor = texture2D( map, flowUv );
           diffuseColor *= sampledDiffuseColor;
           // A1: crossfade the hi-res map in (same warped UV + material tint).
           diffuseColor.rgb = mix( diffuseColor.rgb, texture2D( uHiMap, flowUv ).rgb * diffuse, uHiMix );
           if ( uHaze > 0.0 ) {
             // Mars: a faint warm dust-haze drifting slowly across the disc.
             float hz = _n( vec2( vMapUv.x * 3.0 + uTime * 0.01, vMapUv.y * 5.0 - uTime * 0.006 ) );
             diffuseColor.rgb += vec3(0.55, 0.32, 0.18) * ( hz - 0.4 ) * uHaze;
           }
         #endif`
      );
      hiShader.current = shader;
    };
    return m;
  }, [texture, spec.bodyColor, spec.flow, spec.shear, spec.haze]);
  useEffect(() => () => material.dispose(), [material]);
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
  const atmoStrength = spec.atmoStrength ?? 0.4;
  const rimUniforms = useMemo(
    () => ({ uColor: { value: new THREE.Color(spec.atmo ?? spec.rim) }, uIntensity: { value: atmoStrength } }),
    [spec.atmo, spec.rim, atmoStrength]
  );

  useEffect(() => {
    if (page) {
      planetPositions.set(spec.key, new THREE.Vector3());
      planetRadii.set(spec.key, spec.size);
    }
    return () => { texture.dispose(); ringTex?.dispose(); ringGeo?.dispose(); hiTex.current?.dispose(); planetPositions.delete(spec.key); planetRadii.delete(spec.key); };
  }, [texture, ringTex, ringGeo, page, spec.key, spec.size]);

  // A1: lazily upgrade this planet's albedo the moment it becomes the focused world, and
  // fade+dispose it on leave (the crossfade + dispose run in the frame loop below).
  useEffect(() => {
    if (!page || focused !== spec.key) { hiTarget.current = 0; return; }
    const tier = hiTierFor();
    if (tier === 'base') return; // mobile keeps the 2K base
    let cancelled = false;
    loadHiRes(spec.key, tier, gl).then((tex) => {
      if (!tex) return;
      if (cancelled) { tex.dispose(); return; }
      hiTex.current?.dispose();
      hiTex.current = tex;
      if (hiShader.current) hiShader.current.uniforms.uHiMap.value = tex;
      hiTarget.current = 1;
      if (DEV) console.log(`[tex] ${spec.key} ${tier} resident — textures=${gl.info.memory.textures}`);
    });
    return () => { cancelled = true; hiTarget.current = 0; };
  }, [focused, page, spec.key, gl]);

  useFrame((state, dt) => {
    angle.current += dt * spec.speed;
    // Atmosphere strength eases toward its idle value, brightening on hover (a fade, not a switch).
    const rimTarget = hovered && page ? atmoStrength * 1.8 : atmoStrength;
    const uI = rimUniforms.uIntensity;
    uI.value += (rimTarget - uI.value) * Math.min(1, dt * 6);
    // A2: drive the flow/haze animation (all planets that compiled the shader).
    if (hiShader.current) hiShader.current.uniforms.uTime.value = state.clock.elapsedTime;
    // A1: crossfade the hi-res map toward its target; once fully faded out, free the GPU
    // texture (budget: at most one hi texture resident, since only one world is focused).
    if (page && hiShader.current) {
      const u = hiShader.current.uniforms.uHiMix;
      const step = dt / HI_FADE;
      u.value += Math.sign(hiTarget.current - u.value) * Math.min(Math.abs(hiTarget.current - u.value), step);
      if (hiTarget.current === 0 && u.value <= 0.001 && hiTex.current) {
        hiTex.current.dispose();
        hiTex.current = null;
        hiShader.current.uniforms.uHiMap.value = white1();
        if (DEV) console.log(`[tex] ${spec.key} disposed — textures=${gl.info.memory.textures}`);
      }
    }
    if (group.current) {
      group.current.position.set(Math.cos(angle.current) * spec.orbit, 0, Math.sin(angle.current) * spec.orbit);
      if (page) {
        group.current.getWorldPosition(_wp);
        planetPositions.get(spec.key)?.copy(_wp);
        if (labelRef.current) {
          // Overview pills belong ONLY to the solar overview — hide every label the
          // moment a world is focused (ORBIT), else it floats as an orphan over the panel.
          const { focusedPlanet: focused, coverage } = useScene.getState();
          if (focused) {
            labelRef.current.style.opacity = '0';
            labelRef.current.style.pointerEvents = 'none';
          } else {
            // Overview: hide the label when its planet is partially cropped by the
            // frame edge (a pill floating at the edge reads as broken), AND fade it out
            // while the swap mask is covering (T3) so the pills never pop through the
            // crossover — the DOM sits above the canvas, so the 3D wash can't hide them.
            const cam = state.camera as THREE.PerspectiveCamera;
            _ndc.copy(_wp).project(cam);
            const dist = cam.position.distanceTo(_wp);
            const rY = spec.size / (dist * Math.tan((cam.fov * DEG2RAD) / 2));
            const rX = rY / (state.size.width / state.size.height);
            const cropped = _ndc.z > 1 || Math.abs(_ndc.x) + rX > 0.98 || Math.abs(_ndc.y) + rY > 0.98;
            const covFade = Math.max(0, Math.min(1, 1 - (coverage - 0.12) / 0.38)); // 1 → 0 over cov 0.12..0.5
            labelRef.current.style.opacity = (cropped ? 0 : covFade).toString();
            labelRef.current.style.pointerEvents = cropped || covFade < 0.5 ? 'none' : 'auto';
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
        <mesh ref={mesh} {...bind} material={material}>
          <sphereGeometry args={[spec.size, 64, 64]} />
          {/* A2: Earth's cloud + night-lights shells ride the surface spin. */}
          {spec.earth && <EarthLayers radius={spec.size} />}
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
            type="button"
            aria-label={t(page.labelKey)}
            onClick={open}
            onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); open(); } }}
            onFocus={() => setHovered(true)}
            onBlur={() => setHovered(false)}
            onPointerOver={() => setHovered(true)}
            onPointerOut={() => setHovered(false)}
            className="pointer-events-auto cursor-pointer whitespace-nowrap rounded-full border border-white/20 bg-[rgba(5,7,20,0.78)] px-3.5 py-1.5 text-[13px] font-medium leading-none text-[var(--color-star-white)] shadow-[0_4px_18px_rgba(5,7,20,0.55)] transition-colors duration-200 hover:border-[var(--color-core-gold)]/70 hover:text-[var(--color-core-gold)] focus:outline-none focus-visible:border-[var(--color-core-gold)] focus-visible:text-[var(--color-core-gold)] focus-visible:ring-2 focus-visible:ring-[var(--color-core-gold)] focus-visible:ring-offset-2 focus-visible:ring-offset-[rgba(5,7,20,0.9)]"
            style={{ fontFamily: 'var(--font-body, var(--font-hebrew))' }}
          >
            {t(page.labelKey)}
          </button>
        </Html>
      )}
    </group>
  );
}

const TOUR_STOPS = SECTIONS.length;

/** T7b: the belt (Technologies) is a tour stop but — unlike the page-planets — has no
 *  clickable body. A world-fixed pill pinned to the belt-stop frame centre gives the tour
 *  the same tap-to-enter affordance as every other stop. Tour mode only (desktop overview
 *  is unchanged); shown only while the belt is the active stop. */
function BeltTourLabel() {
  const { t, locale } = useI18n();
  const router = useRouter();
  const tourMode = useScene((s) => s.tourMode);
  const act = useScene((s) => s.act);
  const focused = useScene((s) => s.focusedPlanet);
  const stop = useScene((s) => s.tourStop);
  const idx = ((stop % TOUR_STOPS) + TOUR_STOPS) % TOUR_STOPS;
  if (!tourMode || act !== 'solar' || focused || SECTIONS[idx]?.focus !== 'belt') return null;
  const open = () => {
    if (useScene.getState().dragMoved) return; // a swipe ended here — don't navigate
    router.push(sectionPath('technologies', locale));
  };
  return (
    <Html center position={[1.4, 0.9, 0]} zIndexRange={[20, 0]}>
      <button
        type="button"
        aria-label={t('nav.tech')}
        onClick={open}
        onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); open(); } }}
        className="pointer-events-auto cursor-pointer whitespace-nowrap rounded-full border border-white/20 bg-[rgba(5,7,20,0.78)] px-3.5 py-1.5 text-[13px] font-medium leading-none text-[var(--color-star-white)] shadow-[0_4px_18px_rgba(5,7,20,0.55)] transition-colors duration-200 hover:border-[var(--color-core-gold)]/70 hover:text-[var(--color-core-gold)] focus:outline-none focus-visible:border-[var(--color-core-gold)] focus-visible:text-[var(--color-core-gold)]"
        style={{ fontFamily: 'var(--font-body, var(--font-hebrew))' }}
      >
        {t('nav.tech')}
      </button>
    </Html>
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
        <AsteroidBelt count={high ? 1400 : 500} />
      </group>
      {/* T7b: tap-to-enter affordance for the belt tour stop (world-fixed, tour mode only). */}
      <BeltTourLabel />
      {/* World-fixed foreground giant — disabled until relit in Pass B (see flag). */}
      {SHOW_FOREGROUND_ANCHOR && <ForegroundAnchor />}
    </>
  );
}
