'use client';
import { useEffect, useMemo, useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import { softSprite } from '@/lib/spaceMaterials';
import { makeRng, SEED } from '@/lib/rng';
import { useScene } from '@/lib/sceneStore';

// Three things to fly past on the way down, each visible only inside its own scroll window
// (zero at rest, so the at-rest frame and its C4a baseline are untouched) and each a pure
// function of scroll, so scrolling back retraces every encounter. Positions are 0.5-0.7
// units to the LEFT of the camera path (CameraRig DIVE_*), a little ahead of where the
// camera is at the window's middle, so each grows and then leaves through the left edge.
// The concept is Astra's (forked dust pillars, a cluster with separate cores, a dying star's
// broken shell); the numbers were placed against the sampled path.

const smoothstep = (a: number, b: number, x: number) => {
  const t = Math.min(1, Math.max(0, (x - a) / (b - a)));
  return t * t * (3 - 2 * t);
};
/** 0 -> 1 over [a, b], flat to [c, d], back to 0 by d. */
const window4 = (a: number, b: number, c: number, d: number, x: number) => smoothstep(a, b, x) * (1 - smoothstep(c, d, x));

function canvasTex(w: number, h: number, draw: (g: CanvasRenderingContext2D) => void) {
  const c = document.createElement('canvas');
  c.width = w;
  c.height = h;
  draw(c.getContext('2d')!);
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  return t;
}

function pillarsTexture() {
  return canvasTex(256, 384, (g) => {
    const cols = [
      { x: 60, w: 46, top: 150 },
      { x: 128, w: 54, top: 60 },
      { x: 196, w: 40, top: 200 },
    ];
    for (const p of cols) {
      g.save();
      g.shadowColor = 'rgba(255,150,90,0.95)';
      g.shadowBlur = 16;
      g.shadowOffsetX = 5;
      const body = g.createLinearGradient(p.x - p.w / 2, 0, p.x + p.w / 2, 0);
      body.addColorStop(0, 'rgba(6,5,16,0.96)');
      body.addColorStop(1, 'rgba(28,14,26,0.96)');
      g.fillStyle = body;
      g.beginPath();
      g.moveTo(p.x - p.w / 2 - 8, 384);
      g.quadraticCurveTo(p.x - p.w / 2, p.top + 60, p.x - p.w / 3, p.top + 14);
      g.quadraticCurveTo(p.x, p.top - 12, p.x + p.w / 3, p.top + 14);
      g.quadraticCurveTo(p.x + p.w / 2, p.top + 60, p.x + p.w / 2 + 8, 384);
      g.closePath();
      g.fill();
      g.restore();
    }
    const fade = g.createLinearGradient(0, 300, 0, 384);
    fade.addColorStop(0, 'rgba(0,0,0,0)');
    fade.addColorStop(1, 'rgba(0,0,0,1)');
    g.globalCompositeOperation = 'destination-out';
    g.fillStyle = fade;
    g.fillRect(0, 300, 256, 84);
  });
}

function shellTexture() {
  return canvasTex(256, 256, (g) => {
    const rnd = makeRng(SEED.diveObjects);
    g.translate(128, 128);
    const gap0 = Math.PI * 0.3;
    const gap1 = Math.PI * 0.92; // ~110 degree missing wedge
    for (let i = 0; i < 260; i++) {
      const a = rnd() * Math.PI * 2;
      if (a > gap0 && a < gap1) continue;
      const r = 78 + (rnd() - 0.5) * 22;
      const len = 6 + rnd() * 20;
      g.strokeStyle = rnd() < 0.5 ? `rgba(90,220,210,${0.15 + rnd() * 0.3})` : `rgba(255,110,170,${0.12 + rnd() * 0.25})`;
      g.lineWidth = 1 + rnd() * 3;
      g.beginPath();
      g.arc(0, 0, r, a, a + len / r);
      g.stroke();
    }
    const halo = g.createRadialGradient(0, 0, 0, 0, 0, 60);
    halo.addColorStop(0, 'rgba(255,255,255,0.95)');
    halo.addColorStop(0.15, 'rgba(210,230,255,0.5)');
    halo.addColorStop(1, 'rgba(120,160,255,0)');
    g.fillStyle = halo;
    g.fillRect(-128, -128, 256, 256);
  });
}

const PILLARS_AT = new THREE.Vector3(0.12, 1.0, 6.0);
const CLUSTER_AT = new THREE.Vector3(2.21, 0.5, 2.76);
const SHELL_AT = new THREE.Vector3(2.84, 0.25, 1.74);

export default function DiveObjects() {
  const pillarMat = useRef<THREE.SpriteMaterial>(null);
  const shellMat = useRef<THREE.SpriteMaterial>(null);
  const clusterMat = useRef<THREE.PointsMaterial>(null);
  const coreMats = useRef<(THREE.SpriteMaterial | null)[]>([]);
  const soft = useMemo(() => softSprite(), []);
  const pillars = useMemo(() => pillarsTexture(), []);
  const shell = useMemo(() => shellTexture(), []);
  useEffect(() => () => { pillars.dispose(); shell.dispose(); }, [pillars, shell]);

  const cluster = useMemo(() => {
    const rnd = makeRng(SEED.diveObjects + 1);
    const gauss = () => (rnd() + rnd() + rnd() - 1.5) * 0.9;
    const N = 900;
    const pos = new Float32Array(N * 3);
    for (let i = 0; i < N; i++) {
      pos[i * 3] = CLUSTER_AT.x + gauss() * 0.22;
      pos[i * 3 + 1] = CLUSTER_AT.y + gauss() * 0.22;
      pos[i * 3 + 2] = CLUSTER_AT.z + gauss() * 0.22;
    }
    const geo = new THREE.BufferGeometry();
    geo.setAttribute('position', new THREE.BufferAttribute(pos, 3));
    const cores = Array.from({ length: 5 }, (_, i) => ({
      pos: new THREE.Vector3(CLUSTER_AT.x + gauss() * 0.11, CLUSTER_AT.y + gauss() * 0.11, CLUSTER_AT.z + gauss() * 0.11),
      color: ['#ffffff', '#bcd3ff', '#ffe2b0', '#ffffff', '#cfe0ff'][i],
      size: 0.1 + rnd() * 0.06,
    }));
    return { geo, cores };
  }, []);

  useFrame(() => {
    const sp = useScene.getState().scrollProgress;
    if (pillarMat.current) pillarMat.current.opacity = window4(0.24, 0.3, 0.4, 0.46, sp);
    const k = window4(0.4, 0.46, 0.56, 0.62, sp);
    if (clusterMat.current) clusterMat.current.opacity = k * 0.9;
    coreMats.current.forEach((m) => { if (m) m.opacity = k; });
    if (shellMat.current) shellMat.current.opacity = window4(0.55, 0.61, 0.7, 0.76, sp);
  });

  return (
    <group>
      <sprite position={PILLARS_AT} scale={[1.0, 1.5, 1]} renderOrder={3}>
        <spriteMaterial ref={pillarMat} map={pillars} transparent opacity={0} depthWrite={false} toneMapped={false} />
      </sprite>
      <points geometry={cluster.geo} raycast={() => null} frustumCulled={false}>
        <pointsMaterial ref={clusterMat} map={soft} size={0.03} sizeAttenuation color="#dbe6ff" transparent opacity={0} depthWrite={false} blending={THREE.AdditiveBlending} />
      </points>
      {cluster.cores.map((c, i) => (
        <sprite key={i} position={c.pos} scale={[c.size * 3, c.size * 3, 1]}>
          <spriteMaterial ref={(m) => { coreMats.current[i] = m; }} map={soft} color={c.color} transparent opacity={0} depthWrite={false} blending={THREE.AdditiveBlending} toneMapped={false} />
        </sprite>
      ))}
      <sprite position={SHELL_AT} scale={[0.8, 0.8, 1]}>
        <spriteMaterial ref={shellMat} map={shell} transparent opacity={0} depthWrite={false} blending={THREE.AdditiveBlending} toneMapped={false} />
      </sprite>
    </group>
  );
}
