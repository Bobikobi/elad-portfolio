'use client';
import { useMemo, useRef, useEffect } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import { useScene } from '@/lib/sceneStore';
import { planetPositions } from '@/lib/planetPositions';
import { featherSprite, spikeSprite } from '@/lib/spaceMaterials';

/**
 * A4 — reference-grade per-world backdrop. When a world is FOCUSED, real Hubble nebula
 * billboards (public-domain, from /textures/nebula) hang far behind the planet in that
 * world's own palette — its visual identity — with a few tinted diffraction stars. The
 * layers sit at different lateral depths so orbiting the planet parallaxes them; the group
 * eases to stay behind the planet along the view direction. Additive + depth-tested so the
 * planet (and its rim/atmosphere) always occlude it — nebulosity fills the open space
 * beside the hero, never over it. Fades with the departure meter.
 *
 * B4 — two changes. Every billboard is feathered in the shader now (see `featherSprite`),
 * because "the texture is soft" is not the same as "the quad's edge cannot be seen": a
 * border alpha of 2/255 is invisible in an image viewer and a flat lit rectangle once the
 * same quad is 60 units wide, additive over a near-black sky and lifted by a grade. And
 * the layers were far too faint to be a backdrop, which is why the worlds read as faded —
 * so opacity and layer count both go up.
 */
const clamp01 = (x: number) => (x < 0 ? 0 : x > 1 ? 1 : x);

interface WorldSky {
  imgs: [string, string, string, string];
  tint: string;
  stars: string[];
}
const WORLD_NEBULA: Record<string, WorldSky> = {
  earth: { imgs: ['helix', 'veil', 'ring', 'bubble'], tint: '#9cc4ff', stars: ['#bcd8ff', '#ffffff', '#8fb8ff'] }, // cool blue
  jupiter: { imgs: ['orion', 'eagle', 'lagoon', 'trifid'], tint: '#ffcf9a', stars: ['#ffe6c0', '#ffd9a0', '#fff2dd'] }, // warm amber
  saturn: { imgs: ['eagle', 'trifid', 'crab', 'lagoon'], tint: '#f0d7a0', stars: ['#ffedc4', '#f5e0b0', '#ffffff'] }, // gold
  mars: { imgs: ['tarantula', 'lagoon', 'veil', 'crab'], tint: '#ff9f82', stars: ['#ffb89a', '#ff8a6a', '#ffd0bb'] }, // rust
  belt: { imgs: ['bubble', 'ring', 'helix', 'veil'], tint: '#9fe6d6', stars: ['#c4fff0', '#9fe0e6', '#ffffff'] }, // teal
};
const BELT_POS = new THREE.Vector3(1.4, 0.2, 0);
const BACK_DIST = 46;
// Parallax layers: lateral offset (world axes → parallax on orbit), scale, base opacity,
// plus a drift period and phase so no two layers ever move or breathe together (B4+).
const LAYERS: { off: [number, number, number]; scale: number; op: number; drift: number; phase: number }[] = [
  { off: [6, 4, 0], scale: 64, op: 0.78, drift: 41, phase: 0.0 },
  { off: [-30, 12, -12], scale: 46, op: 0.56, drift: 57, phase: 1.9 },
  { off: [26, -10, -20], scale: 52, op: 0.48, drift: 71, phase: 3.4 },
  { off: [-8, -22, -30], scale: 58, op: 0.34, drift: 89, phase: 5.1 },
];

const _cam = new THREE.Vector3();
const _pp = new THREE.Vector3();
const _dir = new THREE.Vector3();
const _target = new THREE.Vector3();

export default function WorldBackdrop() {
  const focused = useScene((s) => s.focusedPlanet);
  const cfg = focused ? WORLD_NEBULA[focused] : null;
  const spike = useMemo(spikeSprite, []);
  const texes = useMemo(() => {
    if (!cfg) return null;
    const loader = new THREE.TextureLoader();
    return cfg.imgs.map((n) => {
      const t = loader.load(`/textures/nebula/${n}.webp`);
      t.colorSpace = THREE.SRGBColorSpace;
      return t;
    });
  }, [cfg]);
  useEffect(() => () => texes?.forEach((t) => t.dispose()), [texes]);

  const group = useRef<THREE.Group>(null);
  const started = useRef(false);
  const fade = useRef(0);

  useFrame((state, dt) => {
    const g = group.current;
    if (!g) return;
    const t = state.clock.elapsedTime;
    const dep = focused ? clamp01(useScene.getState().departure) : 0;
    const want = cfg ? 1 - dep : 0;
    fade.current += (want - fade.current) * Math.min(1, dt * 2.5);
    if (cfg) {
      const live = focused !== 'belt' ? planetPositions.get(focused as string) : null;
      _pp.copy(live ?? BELT_POS);
      _cam.copy(state.camera.position);
      _dir.subVectors(_pp, _cam).normalize();
      _target.copy(_pp).addScaledVector(_dir, BACK_DIST);
      if (!started.current) {
        g.position.copy(_target);
        started.current = true;
      } else {
        const k = Math.min(1, dt * 1.5);
        g.position.x += (_target.x - g.position.x) * k;
        g.position.y += (_target.y - g.position.y) * k;
        g.position.z += (_target.z - g.position.z) * k;
      }
    } else {
      started.current = false;
    }
    for (const c of g.children) {
      const spr = c as THREE.Sprite;
      const base = (spr.userData.op as number) ?? 0.4;
      // B4+: each layer breathes on its own long period and drifts on its own phase, so
      // no two ever pulse together and a frame is never a repeat of one 5s earlier.
      const drift = (spr.userData.drift as number) ?? 60;
      const phase = (spr.userData.phase as number) ?? 0;
      const breathe =
        1 + 0.14 * Math.sin((t / drift) * Math.PI * 2 + phase)
          + 0.06 * Math.sin((t / (drift * 0.37)) * Math.PI * 2 + phase * 1.7);
      (spr.material as THREE.SpriteMaterial).opacity = base * fade.current * breathe;
      const o = spr.userData.off as [number, number, number] | undefined;
      if (o) {
        spr.position.x = o[0] + Math.sin((t / drift) * Math.PI * 2 + phase) * 2.6;
        spr.position.y = o[1] + Math.cos((t / (drift * 1.31)) * Math.PI * 2 + phase) * 1.9;
      }
      spr.visible = fade.current > 0.01;
    }
  });

  if (!cfg || !texes) return null;
  return (
    <group ref={group} name="worldBackdrop">
      {LAYERS.map((L, i) => (
        <sprite key={i} position={L.off} scale={[L.scale, L.scale * 0.7, 1]} userData={{ op: L.op, drift: L.drift, phase: L.phase, off: L.off }}>
          <spriteMaterial map={texes[i]} color={cfg.tint} transparent opacity={0} depthWrite={false} blending={THREE.AdditiveBlending} toneMapped={false} onBeforeCompile={featherSprite} />
        </sprite>
      ))}
      {cfg.stars.map((col, i) => (
        <sprite key={`s${i}`} position={[(i - 1) * 22 + 4, 14 - i * 10, -6 - i * 4]} scale={[3.2, 3.2, 1]} userData={{ op: 0.7, drift: 23 + i * 7, phase: i * 2.1 }}>
          <spriteMaterial map={spike} color={col} transparent opacity={0} depthWrite={false} blending={THREE.AdditiveBlending} toneMapped={false} />
        </sprite>
      ))}
    </group>
  );
}
