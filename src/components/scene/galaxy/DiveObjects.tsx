'use client';
import { useEffect, useMemo, useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import { softSprite } from '@/lib/spaceMaterials';
import { makeRng, SEED } from '@/lib/rng';
import { useScene } from '@/lib/sceneStore';
import { DIVE_DESIGN, diveStarAt } from '@/lib/diveStar';
import { diveFrameAt } from '../CameraRig';
import { galaxyFrame } from './Galaxy';

// Three things to fly past on the way down, each visible only inside its own scroll window
// (zero at rest, so the at-rest frame and its C4a baseline are untouched) and each a pure
// function of scroll, so scrolling back retraces every encounter. Each sits ahead of where
// the camera is at its window's middle (CameraRig DIVE_*), off the line of sight below it and,
// for the later two, to its right, so each grows and then leaves through the lower edge.
// #82 stage 2 re-placed them on the locked dive's path at the same offsets in the camera's
// frame they had on the old one; the shell is lifted from y -0.44 to 0.15, out from under the
// disc it would otherwise be seen through.
// The concept is Astra's (forked dust pillars, a cluster with separate cores, a dying star's
// broken shell); the numbers were placed against the sampled path.
// 2026-10-06 (owner: the rings "show for too short a frame, so they read as a flash"): the
// cluster and the shell sat off to the right, crossed the frame in 0.3 s and 0.13 s, and at
// 16:10 the shell never entered it at all. Both are now laid on the dive itself (diveFrameAt):
// each sits just off the camera's path where it passes at scroll PASS, so it is in view from
// far off and grows as the camera closes in, ~0.6 s at 16:10 and 16:9 alike, and leaves through
// the frame's lower corner while still fully lit. Placed with the recorded path (objsim).
// Seen that long and that close they read as a white ball and a blue planet, so both are
// smaller (cluster 0.22 -> 0.15 spread, shell 0.8 -> 0.5) and dimmer than when they flashed by.
// Same day, the owner on that: they hang outside the galaxy, seen from the scroll's start where
// they should be in it. They now lie IN the disc (y 0.05), near where the dive ends, so they are
// part of the galaxy from the scroll's first moments - small, on the photo, by the knot - grow as
// the camera comes down, and pass under it out of the frame's lower edge as the curtain starts.
// Over the lit disc a 0.5 shell vanished (its rings under a pixel wide), so it is 1.2 across with
// rings half again as strong.

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
      g.strokeStyle = rnd() < 0.5 ? `rgba(90,220,210,${0.25 + rnd() * 0.45})` : `rgba(255,110,170,${0.2 + rnd() * 0.4})`;
      g.lineWidth = 1 + rnd() * 3;
      g.beginPath();
      g.arc(0, 0, r, a, a + len / r);
      g.stroke();
    }
    // The dying star itself, small: a 60 px halo lit the whole frame as the shell passed close
    // (the last galaxy frame 8 levels over the tunnel's first, C2 12.6 against a bar of 10).
    const halo = g.createRadialGradient(0, 0, 0, 0, 0, 24);
    halo.addColorStop(0, 'rgba(255,255,255,0.8)');
    halo.addColorStop(0.15, 'rgba(210,230,255,0.3)');
    halo.addColorStop(1, 'rgba(120,160,255,0)');
    g.fillStyle = halo;
    g.fillRect(-128, -128, 256, 256);
  });
}

const PILLARS_AT = new THREE.Vector3(0.49, 0.83, 5.83);
/**
 * Each lies in the disc, laid against the dive: from the point of the disc under the camera at
 * scroll `at`, `ahead` units further along its course and `side` units to its right (negative:
 * left). Placed with the recorded path (objsim): in frame from scroll 0.1 to the curtain at 16:10
 * and 16:9; the shell leaves through the lower left corner (on a phone held upright it stays
 * 0.7 s), the cluster under the knot through the bottom (phone 0.5 s), both on the lit disc
 * (radius 3.5 and 4.6 of 6.3; further along the course was past the photo's light).
 */
const SHELL = { at: 0.75, ahead: 2.0, side: -1.2 };
const CLUSTER = { at: 0.84, ahead: 1.5, side: 0 };
const ON_DISC = 0.05;
const _shift = new THREE.Vector3();
const _pos = new THREE.Vector3();
const _next = new THREE.Vector3();
const _look = new THREE.Vector3();
let laidSpin = NaN;
const clusterAt = new THREE.Vector3();
const shellAt = new THREE.Vector3();
function layOnDisc(o: { at: number; ahead: number; side: number }, out: THREE.Vector3, spin: number) {
  diveFrameAt(o.at, spin, _pos, _look);
  diveFrameAt(o.at + 0.02, spin, _next, _look);
  _next.sub(_pos).setY(0).normalize(); // the course over the disc
  out.set(_pos.x + _next.x * o.ahead - _next.z * o.side, ON_DISC, _pos.z + _next.z * o.ahead + _next.x * o.side);
}

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
      pos[i * 3] = gauss() * 0.15;
      pos[i * 3 + 1] = gauss() * 0.15;
      pos[i * 3 + 2] = gauss() * 0.15;
    }
    const geo = new THREE.BufferGeometry();
    geo.setAttribute('position', new THREE.BufferAttribute(pos, 3));
    const cores = Array.from({ length: 5 }, (_, i) => ({
      pos: new THREE.Vector3(gauss() * 0.11, gauss() * 0.11, gauss() * 0.11),
      color: ['#ffffff', '#bcd3ff', '#ffe2b0', '#ffffff', '#cfe0ff'][i],
      size: 0.1 + rnd() * 0.06,
    }));
    return { geo, cores };
  }, []);

  const clusterRef = useRef<THREE.Group>(null);
  const shellRef = useRef<THREE.Sprite>(null);
  const pillarRef = useRef<THREE.Sprite>(null);
  useFrame(() => {
    // The pillars are laid along the path as designed and moved by half its end's shift
    // (lib/diveStar; Bezier weight 0.51); the cluster and the shell on the path itself.
    if (clusterRef.current && shellRef.current && pillarRef.current) {
      const spin = galaxyFrame.spin;
      if (spin !== laidSpin) {
        laidSpin = spin;
        layOnDisc(CLUSTER, clusterAt, spin);
        layOnDisc(SHELL, shellAt, spin);
      }
      clusterRef.current.position.copy(clusterAt);
      shellRef.current.position.copy(shellAt);
      diveStarAt(spin, _shift);
      _shift.x -= DIVE_DESIGN[0];
      _shift.z -= DIVE_DESIGN[2];
      pillarRef.current.position.copy(PILLARS_AT).addScaledVector(_shift, 0.5);
    }
    const sp = useScene.getState().scrollProgress;
    if (pillarMat.current) pillarMat.current.opacity = window4(0.24, 0.3, 0.4, 0.46, sp);
    // Off at rest, so the welcome frame is untouched; in by scroll 0.2, while still small.
    const k = smoothstep(0.05, 0.2, sp);
    if (clusterMat.current) clusterMat.current.opacity = k * 0.4;
    coreMats.current.forEach((m) => { if (m) m.opacity = k * 0.7; });
    if (shellMat.current) shellMat.current.opacity = k;
  });

  return (
    <group>
      <sprite ref={pillarRef} position={PILLARS_AT} scale={[1.0, 1.5, 1]} renderOrder={3}>
        <spriteMaterial ref={pillarMat} map={pillars} transparent opacity={0} depthWrite={false} toneMapped={false} />
      </sprite>
      <group ref={clusterRef}>
      <points geometry={cluster.geo} raycast={() => null} frustumCulled={false}>
        <pointsMaterial ref={clusterMat} map={soft} size={0.022} sizeAttenuation color="#dbe6ff" transparent opacity={0} depthWrite={false} blending={THREE.AdditiveBlending} />
      </points>
      {cluster.cores.map((c, i) => (
        <sprite key={i} position={c.pos} scale={[c.size * 3, c.size * 3, 1]}>
          <spriteMaterial ref={(m) => { coreMats.current[i] = m; }} map={soft} color={c.color} transparent opacity={0} depthWrite={false} blending={THREE.AdditiveBlending} toneMapped={false} />
        </sprite>
      ))}
      </group>
      <sprite ref={shellRef} scale={[1.2, 1.2, 1]}>
        <spriteMaterial ref={shellMat} map={shell} transparent opacity={0} depthWrite={false} blending={THREE.AdditiveBlending} toneMapped={false} />
      </sprite>
    </group>
  );
}
