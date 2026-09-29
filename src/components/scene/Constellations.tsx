'use client';
import { useEffect, useMemo, useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import { CONSTELLATIONS, POLARIS } from '@/lib/constellations';
import { makeSparkleMaterial } from '@/lib/spaceMaterials';
import { useScene } from '@/lib/sceneStore';
import { ORR, orrGeom } from '@/lib/orrery';
import { useI18n } from '@/lib/i18n';
import { HUD_AVAILABLE } from './DebugHud';
import RealSky from './RealSky';

/**
 * The real sky behind the solar system (Elad, 2026-09-27): constellation stars always, their
 * stick figures near-invisible until the pointer finds one, then the lines glow and the name
 * appears. Polaris is a hero star with rays.
 *
 * ORIENTATION. The sky shares the solar root's ecliptic tilt, so the zodiac really runs along
 * the plane the planets orbit in. It is turned over, though: the overview camera sits on the
 * scene's +Y side of that plane and looks down through it, so real ecliptic NORTH is mapped to
 * the scene's -Y. Put the right way up, the Dippers and Polaris would be behind the camera at
 * every pose the drag allows. It is a rotation (e1 -> +X, e2 -> +Z, north -> -Y, det +1), not a
 * mirror, so every figure keeps its real handedness. SKY_LON then turns the sky about the
 * pole; 210 deg was chosen under the old ±62 deg yaw limit to frame the most figures at rest,
 * and is kept so the resting frame does not change. The overview now turns a full 360 about the
 * ecliptic's normal, so all twelve zodiac figures are in (Elad, 2026-09-28), in their real order
 * round the band the planets orbit in, with the naked-eye sky (RealSky) behind them.
 *
 * World-fixed: not a child of the spinning solar root (the sky does not turn with the system).
 */
const SKY_R = 160;           // beyond the seeded star field (84..148), inside the far plane (200)
const SKY_TILT = 0.42;       // must match SolarAct's solarRoot rotation.x
const SKY_LON = 210;         // deg - see ORIENTATION
const LINE_REST = 0.035;   // line opacity at rest - criterion: <= 12% brightness (measured p95 over the line pixels)
const LINE_HOT = 0.62;       // hovered
const HIT_MOUSE = 14;        // px from a segment that counts as hovering it
const HIT_TOUCH = 28;
const DEG = Math.PI / 180;

function skyPoint(lon: number, lat: number, out: THREE.Vector3) {
  const l = (lon - SKY_LON) * DEG, b = lat * DEG;
  return out.set(Math.cos(l) * Math.cos(b), -Math.sin(b), Math.sin(l) * Math.cos(b)).multiplyScalar(SKY_R);
}

/** Pointer + label hand-off between the in-canvas driver and the DOM overlay (no re-renders). */
const shared = {
  x: -1e4, y: -1e4, touch: false, down: false,
  tap: null as null | { x: number; y: number },
  label: null as HTMLDivElement | null,
  names: CONSTELLATIONS.map((c) => c.name.en),
};

const STAR_VS = /* glsl */ `
  attribute float aSize;
  attribute float aAlpha;
  uniform float uDpr;
  uniform float uBoost;
  attribute float aFig;
  uniform float uHot;
  varying float vAlpha;
  void main() {
    float hot = abs(aFig - uHot) < 0.5 ? 1.0 : 0.0;
    vAlpha = aAlpha * (1.0 + hot * uBoost);
    gl_PointSize = aSize * uDpr * (1.0 + hot * 0.35);
    gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
  }`;
const STAR_FS = /* glsl */ `
  varying float vAlpha;
  void main() {
    float d = length(gl_PointCoord - 0.5) * 2.0;
    float a = smoothstep(1.0, 0.0, d);
    gl_FragColor = vec4(vec3(1.0, 0.95, 0.86) * vAlpha * a * a, 1.0);
  }`;

export default function Constellations() {
  const group = useRef<THREE.Group>(null);
  const hot = useRef(-1);
  const tapUntil = useRef(0);
  const lit = useRef(-1); // the figure a tap lit (touch)
  const vis = useRef(0);

  const { stars, lines, world, polaris } = useMemo(() => {
    const pos: number[] = [], size: number[] = [], alpha: number[] = [], fig: number[] = [];
    const world: THREE.Vector3[][] = [];
    const lines = CONSTELLATIONS.map((c, ci) => {
      const pts = c.stars.map(([lon, lat]) => skyPoint(lon, lat, new THREE.Vector3()));
      world.push(pts);
      c.stars.forEach(([, , mag], si) => {
        if (c.id === POLARIS.id && si === POLARIS.index) return; // drawn as a sprite
        pos.push(...pts[si].toArray());
        size.push(THREE.MathUtils.clamp(1.6 + (4.6 - mag) * 1.15, 1.6, 6));
        alpha.push(THREE.MathUtils.clamp(0.32 + (4.6 - mag) * 0.24, 0.3, 1.1));
        fig.push(ci);
      });
      const g = new THREE.BufferGeometry().setFromPoints(c.segs.flatMap(([a, b]) => [pts[a], pts[b]]));
      const m = new THREE.LineBasicMaterial({
        color: new THREE.Color(1.0, 0.82, 0.55), transparent: true, opacity: 0,
        blending: THREE.AdditiveBlending, depthWrite: false, toneMapped: false,
      });
      return new THREE.LineSegments(g, m);
    });
    const sg = new THREE.BufferGeometry();
    sg.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
    sg.setAttribute('aSize', new THREE.Float32BufferAttribute(size, 1));
    sg.setAttribute('aAlpha', new THREE.Float32BufferAttribute(alpha, 1));
    sg.setAttribute('aFig', new THREE.Float32BufferAttribute(fig, 1));
    const sm = new THREE.ShaderMaterial({
      vertexShader: STAR_VS, fragmentShader: STAR_FS,
      uniforms: { uDpr: { value: 1 }, uBoost: { value: 0 }, uHot: { value: -1 } },
      transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, toneMapped: false,
    });
    const stars = new THREE.Points(sg, sm);
    const p = world[CONSTELLATIONS.findIndex((c) => c.id === POLARIS.id)][POLARIS.index];
    const polaris = { pos: p.clone(), mat: makeSparkleMaterial({ color: '#fff4e0', rayLen: 0.24, secondary: 1, rate: 0.5, opacity: 1 }) };
    return { stars, lines, world, polaris };
  }, []);

  useEffect(() => () => {
    stars.geometry.dispose(); (stars.material as THREE.Material).dispose();
    lines.forEach((l) => { l.geometry.dispose(); (l.material as THREE.Material).dispose(); });
    polaris.mat.dispose();
  }, [stars, lines, polaris]);

  useEffect(() => {
    let sx = 0, sy = 0;
    const move = (e: PointerEvent) => { shared.x = e.clientX; shared.y = e.clientY; shared.touch = e.pointerType !== 'mouse'; };
    const down = (e: PointerEvent) => { move(e); shared.down = true; sx = e.clientX; sy = e.clientY; };
    const up = (e: PointerEvent) => {
      shared.down = false;
      if (e.pointerType !== 'mouse' && (e.target as HTMLElement)?.tagName === 'CANVAS' && Math.hypot(e.clientX - sx, e.clientY - sy) < 8)
        shared.tap = { x: e.clientX, y: e.clientY };
      if (e.pointerType !== 'mouse') { shared.x = shared.y = -1e4; }
    };
    const leave = () => { shared.x = shared.y = -1e4; };
    window.addEventListener('pointermove', move, { passive: true });
    window.addEventListener('pointerdown', down);
    window.addEventListener('pointerup', up);
    document.documentElement.addEventListener('pointerleave', leave);
    return () => {
      window.removeEventListener('pointermove', move);
      window.removeEventListener('pointerdown', down);
      window.removeEventListener('pointerup', up);
      document.documentElement.removeEventListener('pointerleave', leave);
    };
  }, []);

  const _p = useMemo(() => new THREE.Vector3(), []);
  const scr = useMemo(() => world.map((f) => f.map(() => new THREE.Vector2())), [world]);
  useFrame((state, dt) => {
    const g = group.current;
    if (!g) return;
    const s = useScene.getState();
    const overview = s.act === 'solar' && !s.focusedPlanet;
    vis.current = THREE.MathUtils.damp(vis.current, overview ? 1 : 0, 3, dt);
    // Mobile orrery: the swipe turns the whole sky about the ecliptic normal by the same angle
    // it swings the carousel planets round the sun (lib/orrery orrSlot: -SP per stop in the
    // root frame; a +Y turn lowers a point's angle, hence the sign), so the camera and the sun
    // read as still while the universe rotates past them (Elad, 2026-09-29). This group shares
    // solarRoot's 0.42 tilt, so its local Y is the plane normal. A focused world or a desktop
    // session holds whatever angle was reached, like the planets' own accumulators.
    if (s.tourMode && !s.focusedPlanet) g.rotation.y = s.tourPos * ORR.SP * orrGeom().dir;
    g.updateMatrixWorld();
    const { width: W, height: H } = state.size;
    const cam = state.camera;

    // Project every figure (about 90 points) - the hit test and the label both need it.
    const onScreen: boolean[] = [];
    for (let ci = 0; ci < world.length; ci++) {
      let any = false;
      for (let i = 0; i < world[ci].length; i++) {
        _p.copy(world[ci][i]).applyMatrix4(g.matrixWorld).project(cam);
        scr[ci][i].set((_p.x * 0.5 + 0.5) * W, (-_p.y * 0.5 + 0.5) * H);
        if (_p.z < 1 && Math.abs(_p.x) < 1 && Math.abs(_p.y) < 1) any = true;
      }
      onScreen.push(any);
    }
    const nearest = (x: number, y: number, maxPx: number) => {
      let best = -1, bd = maxPx;
      CONSTELLATIONS.forEach((c, ci) => {
        if (!onScreen[ci]) return;
        for (const [a, b] of c.segs) {
          const A = scr[ci][a], B = scr[ci][b];
          const ex = B.x - A.x, ey = B.y - A.y;
          const t = THREE.MathUtils.clamp(((x - A.x) * ex + (y - A.y) * ey) / Math.max(1e-6, ex * ex + ey * ey), 0, 1);
          const d = Math.hypot(A.x + ex * t - x, A.y + ey * t - y);
          if (d < bd) { bd = d; best = ci; }
        }
      });
      return best;
    };

    const now = state.clock.elapsedTime;
    let next = -1;
    if (vis.current > 0.5) {
      if (shared.tap) {
        const hit = nearest(shared.tap.x, shared.tap.y, HIT_TOUCH);
        // A tap that landed on a planet belongs to the planet.
        // A tapped figure stays lit until the next tap lands anywhere else, or it turns out of
        // frame with the swipe (Elad, 2026-09-29: the name used to vanish on a timer instead).
        if (hit >= 0 && !s.hoveredBody) { lit.current = hit; tapUntil.current = Infinity; }
        else tapUntil.current = 0;
        shared.tap = null;
      }
      if (now < tapUntil.current && !s.hoveredBody && onScreen[lit.current]) next = lit.current;
      else {
        tapUntil.current = 0; // a body's card took over, or the figure left the frame
        if (!shared.touch && !shared.down && !s.hoveredBody) next = nearest(shared.x, shared.y, HIT_MOUSE);
      }
    } else shared.tap = null;
    hot.current = next;

    const k = 1 - Math.exp(-10 * dt);
    // Reached through the scene graph (children: stars, the figures, Polaris) - the memoised
    // objects themselves are render inputs and must not be mutated from here.
    const figs = g.children.slice(1, 1 + CONSTELLATIONS.length) as THREE.LineSegments[];
    figs.forEach((l, ci) => {
      const m = l.material as THREE.LineBasicMaterial;
      const target = (ci === next ? LINE_HOT : LINE_REST) * vis.current;
      m.opacity += (target - m.opacity) * k;
    });
    const sm = (g.children[0] as THREE.Points).material as THREE.ShaderMaterial;
    sm.uniforms.uDpr.value = state.gl.getPixelRatio();
    sm.uniforms.uHot.value = next;
    sm.uniforms.uBoost.value = next >= 0 ? 0.6 * vis.current : 0;

    const el = shared.label;
    if (el) {
      if (next >= 0) {
        // Centred over the figure's on-screen stars, above the highest one, kept inside the
        // viewport (below the header) so a half-framed figure still shows its name.
        let sx = 0, n = 0, y = Infinity;
        for (let i = 0; i < world[next].length; i++) {
          _p.copy(world[next][i]).applyMatrix4(g.matrixWorld).project(cam);
          if (_p.z >= 1 || Math.abs(_p.x) >= 1 || Math.abs(_p.y) >= 1) continue;
          sx += scr[next][i].x; n++; y = Math.min(y, scr[next][i].y);
        }
        const x = THREE.MathUtils.clamp(n ? sx / n : W / 2, 80, W - 80);
        y = THREE.MathUtils.clamp(n ? y : H / 2, 120, H); // 120: pill clears the ~64px header
        el.textContent = shared.names[next];
        el.style.transform = `translate(${x.toFixed(1)}px, ${(y - 16).toFixed(1)}px) translate(-50%, -100%)`;
        el.style.opacity = '1';
      } else el.style.opacity = '0';
    }
    if (HUD_AVAILABLE) {
      _p.set(1, 0, 0).transformDirection(g.matrixWorld);
      (window as unknown as Record<string, unknown>).__constellations = {
        hot: next, yaw: g.rotation.y, probe: _p.toArray(),
        figs: CONSTELLATIONS.map((c, ci) => ({ id: c.id, on: onScreen[ci], pts: scr[ci].map((v) => [Math.round(v.x), Math.round(v.y)]), segs: c.segs })),
      };
    }
  });

  return (
    <group ref={group} rotation={[SKY_TILT, 0, 0]} name="constellations">
      <primitive object={stars} />
      {lines.map((l, i) => <primitive key={i} object={l} />)}
      <sprite position={polaris.pos} scale={[9, 9, 1]} material={polaris.mat} />
      {/* Last child: the figure lookups above index g.children from the front. */}
      <RealSky lon0={SKY_LON} />
    </group>
  );
}

/** The name pill. Lives outside the canvas (the canvas wrapper is aria-hidden). */
export function ConstellationLabel() {
  const { locale } = useI18n();
  useEffect(() => {
    shared.names = CONSTELLATIONS.map((c) => c.name[locale as 'he' | 'en' | 'ru'] ?? c.name.en);
  }, [locale]);
  return (
    <div className="pointer-events-none fixed inset-0 z-20 overflow-hidden" aria-hidden="true">
      <div
        ref={(el) => { shared.label = el; }}
        data-constellation-label
        className="absolute left-0 top-0 whitespace-nowrap rounded-full border border-[var(--color-core-gold)]/40 bg-[rgba(5,7,20,0.72)] px-3 py-1 text-[12px] font-medium leading-none tracking-[0.08em] text-[var(--color-core-gold)] transition-opacity duration-200"
        style={{ opacity: 0 }}
      />
    </div>
  );
}
