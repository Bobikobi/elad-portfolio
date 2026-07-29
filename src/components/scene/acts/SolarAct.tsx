'use client';
import { useRef, useMemo, useEffect, useState } from 'react';
import { useFrame, useThree } from '@react-three/fiber';
import { useCursor } from '@react-three/drei';
import * as THREE from 'three';
import { useRouter } from 'next/navigation';
import { useScene } from '@/lib/sceneStore';
import { planetPositions, planetRadii, PLANET_PAGES } from '@/lib/planetPositions';
import { PLANET_SECTION, sectionPath } from '@/lib/sections';
import { BODY_FACTS } from '@/lib/bodyFacts';
import { useI18n } from '@/lib/i18n';
import { HUD_AVAILABLE } from '../DebugHud';
import Sun from '../solar/Sun';
import AsteroidBelt from '../solar/AsteroidBelt';
import WorldBackdrop from '../solar/WorldBackdrop';
import ZodiacalDust from '../solar/ZodiacalDust';

const _wp = new THREE.Vector3();
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

// A3 / B13: atmospheric limb scattering, driven by the IMPACT PARAMETER rather than by a
// fresnel term.
//
// The old version shaded a BackSide shell with `1 - dot(view, normal)`. On a back face the
// outward normal points away from the camera, so that expression is 1 over the entire far
// hemisphere: the whole visible annulus came out at full brightness and then stopped dead
// at the shell's own silhouette. That is a hard-edged outline ring, which is what the
// planets were wearing — read as "grey edges" around the disc.
//
// What an atmosphere actually does is fall off with height above the surface, so the value
// to shade with is `b`, the perpendicular distance from the planet's centre to the view
// ray. It is exactly the height of the sightline's closest approach. An exponential in
// (b − planetR) gives a real scale-height falloff, and a smoothstep to zero before the
// shell's silhouette guarantees the geometry's own edge can never be visible.
const ATMO_SHELL = 1.12; // shell radius as a multiple of the planet radius
const rimVert = /* glsl */ `
  varying vec3 vWPos; varying vec3 vWN; varying vec3 vCenter; varying float vScale;
  void main() {
    vec4 wp = modelMatrix * vec4(position, 1.0);
    vWPos = wp.xyz;
    vWN = normalize(mat3(modelMatrix) * normal);
    vCenter = (modelMatrix * vec4(0.0, 0.0, 0.0, 1.0)).xyz;
    vScale = length(modelMatrix[0].xyz);   // carries the hover scale-up too
    gl_Position = projectionMatrix * viewMatrix * wp;
  }
`;
const rimFrag = /* glsl */ `
  uniform vec3 uColor; uniform float uIntensity; uniform float uBaseR;
  varying vec3 vWPos; varying vec3 vWN; varying vec3 vCenter; varying float vScale;
  void main() {
    float shellR  = uBaseR * vScale;                     // vScale already holds ATMO_SHELL
    float planetR = shellR / ${ATMO_SHELL.toFixed(2)};   // …so the surface is one factor in

    // Height of this sightline's closest approach to the planet centre.
    vec3 D = normalize(vWPos - cameraPosition);
    vec3 OC = vCenter - cameraPosition;
    float b = length(OC - D * dot(OC, D));
    float x = clamp((b - planetR) / max(shellR - planetR, 1e-4), 0.0, 1.0);

    float haze = exp(-x * 2.8);            // broad atmospheric glow hugging the limb
    float edge = exp(-x * 11.0);           // thin, whiter forward-scattering line
    float cut  = 1.0 - smoothstep(0.62, 1.0, x);  // zero well inside the geometry's edge

    vec3 L = normalize(-vWPos);            // toward the sun at the origin
    float lit = smoothstep(-0.25, 0.35, dot(normalize(vWN), L)); // softly through the terminator

    vec3 col = uColor + vec3(0.5) * edge;
    float a = (haze * 0.55 + edge * 0.8) * cut * lit * uIntensity;
    gl_FragColor = vec4(col, a);
    #include <tonemapping_fragment>
    #include <colorspace_fragment>
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
    gl_FragColor = vec4(lights * 1.2, night);           // additive; alpha gates to night
    // B3: the lights were multiplied by 2.0 and laid additively over an already-bright
    // disc. Tone mapping is applied for the whole frame in the composer now
    // (ExposureToneMap), so the chunk below is inert while a composer owns the render —
    // it is kept only so this shader stays correct if it is ever drawn direct-to-canvas.
    #include <tonemapping_fragment>
    #include <colorspace_fragment>
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
    #include <tonemapping_fragment>
    #include <colorspace_fragment>
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

// --- R5.7: Earth's Moon ----------------------------------------------------------------
// A real lunar albedo map on a body at the TRUE size ratio (0.2725 × Earth), on an orbit
// that is visibly INCLINED to the ecliptic — a coplanar moon reads as a bead sliding
// along a wire, an inclined one immediately reads as a second world in orbit. The
// distance is compressed hard (the real 60 Earth radii would put it off-frame at every
// vantage) but the tidal lock is honest: the same face is always turned toward Earth.
// Lives inside Earth's orbit group but OUTSIDE its spin group, so it neither inherits
// Earth's axial tilt nor the hover scale-up.
const MOON_RATIO = 0.2725; // real Moon/Earth radius ratio
const MOON_DIST = 2.9; // Earth radii (compressed from 60 so it stays in the ORBIT frame)
const MOON_INCL = 22 * DEG2RAD; // exaggerated from 5.1° so the inclination reads
const MOON_PERIOD = 26; // s per revolution — slow enough to feel orbital, not spun

const _mwp = new THREE.Vector3();
const _mdir = new THREE.Vector3();
const _mrel = new THREE.Vector3();
const _mearth = new THREE.Vector3();

function EarthMoon({ planetSize }: { planetSize: number }) {
  const pivot = useRef<THREE.Group>(null);
  const body = useRef<THREE.Mesh>(null);
  const tex = useMemo(() => {
    const tx = new THREE.TextureLoader().load('/textures/moon.jpg');
    tx.colorSpace = THREE.SRGBColorSpace;
    tx.anisotropy = 8;
    return tx;
  }, []);
  useEffect(() => () => { tex.dispose(); }, [tex]);
  const r = planetSize * MOON_DIST;
  useFrame((state) => {
    const a = (state.clock.elapsedTime / MOON_PERIOD) * Math.PI * 2;
    if (pivot.current) pivot.current.rotation.y = a;
    // Tidal lock. The mesh is a CHILD of the pivot, so it already inherits the pivot's yaw
    // — which is exactly the lock: one rotation per revolution, in the same sense, keeping
    // the same face turned inward. Counter-rotating it by -a (as this did) cancels that
    // inheritance and pins the Moon's orientation in world space, so over one orbit it
    // presents every face to Earth in turn: the precise opposite of the claim. Measured on
    // the alias as faceDot swinging across 0.97 of its full range per revolution.
    // Its local -X side is what points at Earth, and -X is the centre of an equirectangular
    // lunar map, so the near side is the face on show.

    // Verification handle (HUD_AVAILABLE gate — stripped from production). Ratio and
    // inclination are geometry, and tidal lock is a relationship that only exists while
    // the thing is moving, so publish the live numbers rather than the constants.
    if (HUD_AVAILABLE && body.current) {
      const w = window as unknown as { __moon?: unknown };
      const earth = planetPositions.get('earth');
      if (earth) {
        body.current.getWorldPosition(_mwp);
        body.current.getWorldDirection(_mdir); // the mesh's local +Z in world space
        _mrel.copy(_mwp).sub(earth);
        w.__moon = {
          rel: [_mrel.x, _mrel.y, _mrel.z],
          dist: _mrel.length(),
          radius: planetSize * MOON_RATIO,
          earthRadius: planetSize,
          // Cosine of the angle between the face the Moon presents and the direction back
          // to Earth. Tidally locked ⇒ this stays constant as it goes round.
          faceDot: _mdir.dot(_mearth.copy(_mrel).normalize()),
        };
      }
    }
  });
  return (
    <group rotation={[MOON_INCL, 0, 0]}>
      <group ref={pivot}>
        {/* Opaque + depth-written like every other body, so it occludes and is occluded
            correctly against Earth and the belt. */}
        <mesh ref={body} position={[r, 0, 0]} raycast={() => null}>
          <sphereGeometry args={[planetSize * MOON_RATIO, 32, 32]} />
          <meshStandardMaterial map={tex} roughness={0.98} metalness={0.0} />
        </mesh>
      </group>
    </group>
  );
}

function Planet({ spec }: { spec: PlanetSpec }) {
  const { locale } = useI18n();
  const router = useRouter();
  const gl = useThree((s) => s.gl);
  const focused = useScene((s) => s.focusedPlanet);
  const group = useRef<THREE.Group>(null);
  const spinGroup = useRef<THREE.Group>(null);
  const mesh = useRef<THREE.Mesh>(null);
  const angle = useRef(spec.phase);
  // A1 hi-res crossfade state (page planets only).
  const hiShader = useRef<THREE.WebGLProgramParametersWithUniforms | null>(null);
  const hiTex = useRef<THREE.Texture | null>(null);
  const hiTarget = useRef(0); // 0 = show base, 1 = show hi
  const [hovered, setHovered] = useState(false);
  const page = PLANET_PAGES[spec.key];
  // R5.6 — the four bodies that are NOT section routes still answer the pointer: they
  // raise a glass tooltip (name + a real astronomy fact + the wink). The tooltip's DOM
  // lives in PlanetLabelsOverlay; here we only publish WHICH body is under the pointer.
  const decorative = !page && !!BODY_FACTS[spec.key];
  // Clicking a planet navigates to its section route; the URL is the source of
  // truth and CosmicStage's bridge flies the camera there.
  const open = () => {
    // A drag-to-rotate gesture (T6) ends with a pointerup on a planet too — don't let
    // it navigate. The threshold flag is set by DragControls.
    if (useScene.getState().dragMoved) return;
    const section = PLANET_SECTION[spec.key];
    if (section) router.push(sectionPath(section, locale));
  };
  useCursor(hovered && (!!page || decorative));

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
    () => ({
      uColor: { value: new THREE.Color(spec.atmo ?? spec.rim) },
      uIntensity: { value: atmoStrength },
      // The geometry radius, NOT the shell radius: the mesh's own `scale={ATMO_SHELL}` is
      // already inside modelMatrix, so vScale carries it (and the hover scale-up too).
      uBaseR: { value: spec.size },
    }),
    [spec.atmo, spec.rim, atmoStrength, spec.size]
  );

  // EVERY body publishes its live world position + radius now, not just the four page
  // planets: the label driver needs the decorative bodies too in order to hang their
  // tooltips on them (R5.6).
  useEffect(() => {
    planetPositions.set(spec.key, new THREE.Vector3());
    planetRadii.set(spec.key, spec.size);
    return () => {
      texture.dispose(); ringTex?.dispose(); ringGeo?.dispose(); hiTex.current?.dispose();
      planetPositions.delete(spec.key); planetRadii.delete(spec.key);
      if (useScene.getState().hoveredBody === spec.key) useScene.getState().setHoveredBody(null);
    };
  }, [texture, ringTex, ringGeo, spec.key, spec.size]);

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
      // Publish the live world position. The label driver (priority 2) reads it LATER in
      // this same frame, so pills are never a frame behind the body they name (R5.4).
      group.current.getWorldPosition(_wp);
      planetPositions.get(spec.key)?.copy(_wp);
    }
    if (mesh.current) mesh.current.rotation.y += dt * 0.3;
  });

  const bind =
    page || decorative
      ? {
          onClick: (e: { stopPropagation: () => void }) => {
            e.stopPropagation();
            if (page) open();
            // Touch has no hover: a tap on a decorative body toggles its tooltip.
            else if (!useScene.getState().dragMoved) {
              const s = useScene.getState();
              s.setHoveredBody(s.hoveredBody === spec.key ? null : spec.key);
            }
          },
          // Only the page planets take their hover from the raycaster (it drives the scale
          // + atmosphere lift, where a dropped frame of hover costs nothing). A DECORATIVE
          // body's tooltip is driven by the hysteresis in PlanetLabelDriver instead: raw
          // enter/leave chatters on a small disc that orbits under a still cursor, and two
          // writers for one piece of state would only fight each other.
          onPointerOver: (e: { stopPropagation: () => void }) => {
            e.stopPropagation();
            setHovered(true);
          },
          onPointerOut: () => {
            setHovered(false);
          },
        }
      : {};

  return (
    <group ref={group} name={`planet:${spec.key}`}>
      <group ref={spinGroup} rotation={[0, 0, spec.tilt ?? 0]} scale={hovered && page ? 1.12 : 1}>
        <mesh ref={mesh} {...bind} material={material}>
          <sphereGeometry args={[spec.size, 64, 64]} />
          {/* A2: Earth's cloud + night-lights shells ride the surface spin. */}
          {spec.earth && <EarthLayers radius={spec.size} />}
        </mesh>
        {/* Atmospheric rim light (heightened realism, tinted from the planet). */}
        <mesh scale={ATMO_SHELL} raycast={() => null}>
          <sphereGeometry args={[spec.size, 48, 48]} />
          <shaderMaterial vertexShader={rimVert} fragmentShader={rimFrag} uniforms={rimUniforms} transparent side={THREE.BackSide} blending={THREE.AdditiveBlending} depthWrite={false} />
        </mesh>
        {spec.rings && ringTex && ringGeo && (
          <mesh rotation={[Math.PI / 2.05, 0, 0]} geometry={ringGeo}>
            <meshBasicMaterial map={ringTex} transparent opacity={1} side={THREE.DoubleSide} depthWrite={false} />
          </mesh>
        )}
        {spec.moons && <Moons count={spec.moons} planetSize={spec.size} />}
      </group>
      {/* R5.7 — the real Moon, on its own inclined orbit outside Earth's spin group. */}
      {spec.earth && <EarthMoon planetSize={spec.size} />}
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
      <group ref={root} rotation={[0.42, 0, 0]} name="solarRoot">
        <Sun />
        <ZodiacalDust count={high ? 5200 : 1900} />
        {PLANETS.map((p) => (
          <Planet key={p.key} spec={p} />
        ))}
        {/* Cost-only tier split (the composition LAW): identical belt, fewer bodies. */}
        <AsteroidBelt count={high ? 17000 : 6000} />
      </group>
      {/* A4: per-world nebula backdrop (world-fixed, shows only while a world is focused). */}
      <WorldBackdrop />
      {/* Section pills, the belt marker and the decorative-body tooltips all live in the
          DOM overlay now (PlanetLabels) — see the note there on frame ordering. */}
      {/* World-fixed foreground giant — disabled until relit in Pass B (see flag). */}
      {SHOW_FOREGROUND_ANCHOR && <ForegroundAnchor />}
    </>
  );
}
