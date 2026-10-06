import * as THREE from 'three';
import { softSprite } from '@/lib/spaceMaterials';
import { HUD_AVAILABLE } from '../DebugHud';

/**
 * Soft round stars of a fixed world size, the look the owner picked out of the dive
 * (2026-10-05: the points that appear as the camera tilts "are prettier than the galaxy
 * itself"). Galaxy draws them over the whole disc from rest (sparkles) and DiveNeighbourhood
 * around the dive's arrival; both use this one material so the dive's stars are more of the
 * same, never a new kind of point.
 *
 * It is PointsMaterial's sprite (size attenuation on the CSS height, additive, the soft sprite),
 * drawn as an instanced quad (streakGeometry) so a moving star can stretch into its streak
 * (STREAK), with the things a points material cannot do per star:
 * - `aOn`: the reveal value at which this star starts to show, over `uSoft` of reveal. Stars
 *   with spread-out thresholds come in one by one instead of the whole field at once.
 * - `aPhase`: each star twinkles on its own rate and phase, `uTwinkle` deep.
 * - `uNear` (from, to), `uBoost` and `uFar`: a star past `to` from the camera shows at `uFar`
 *   and brightens toward `uBoost` by `from`, so the dive's stars light up as they are reached.
 *   1 and 1 is off.
 */
export const spriteStarVertex = /* glsl */ `
  attribute vec3 aStar;
  attribute vec3 color;
  attribute float aOn;
  attribute float aPhase;
  uniform float uSize;
  uniform float uScale;
  uniform float uTime;
  uniform float uTwinkle;
  uniform float uReveal;
  uniform float uSoft;
  uniform vec2 uNear;
  uniform float uBoost;
  uniform float uFar;
  uniform mat4 uPrevMVP;
  uniform vec2 uRes;
  uniform float uShutter;
  uniform float uMaxLen;
  uniform float uMaxSize;
  uniform float uSpread;
  varying vec3 vColor;
  varying float vA;
  varying vec2 vXY;
  varying float vLen;
  varying float vR;
  void main() {
    vec4 mv = modelViewMatrix * vec4(aStar, 1.0);
    vec4 cur = projectionMatrix * mv;
    vec4 prev = uPrevMVP * vec4(aStar, 1.0);
    // The size a point sprite was drawn at, limit and all, so a star at rest is the same star.
    float r = 0.5 * clamp(uSize * uScale / -mv.z, 1.0, uMaxSize);
    // The trail: where the star moved on screen since the last frame, as px per shutter.
    vec2 trail = vec2(0.0);
    if (cur.w > 0.0 && prev.w > 0.0) {
      trail = (cur.xy / cur.w - prev.xy / prev.w) * 0.5 * uRes * uShutter;
      float l = length(trail);
      if (l > uMaxLen) trail *= uMaxLen / l;
    }
    float len = length(trail);
    vec2 dir = len > 1e-3 ? trail / len : vec2(1.0, 0.0);
    // position.xy is the quad's corner in [-1, 1]: along the motion from the star's last place
    // (-len, behind it) to its own place, r of margin round both.
    float along = mix(-len - r, r, position.x * 0.5 + 0.5);
    float across = position.y * r;
    gl_Position = cur;
    gl_Position.xy += (dir * along + vec2(-dir.y, dir.x) * across) * 2.0 / uRes * cur.w;
    vXY = vec2(along, across);
    vLen = len;
    vR = r;
    float on = smoothstep(aOn, aOn + uSoft, uReveal);
    float tw = 1.0 + uTwinkle * sin(uTime * (0.6 + 1.8 * aPhase) + 40.0 * aPhase);
    vColor = color;
    // The star's light is spread over its streak: through the soft sprite's profile a disc adds
    // 0.672 r^2 of light and each px of trail 0.73 r, so uSpread 1.086 keeps what it adds - but
    // the tone curve lifts light spread thin, so the frame matches streaks-off only at ~1.8.
    vA = on * tw * mix(uBoost, uFar, smoothstep(uNear.x, uNear.y, -mv.z)) / (1.0 + uSpread * len / r);
  }
`;

export const spriteStarFragment = /* glsl */ `
  uniform sampler2D uMap;
  uniform float uOpacity;
  varying vec3 vColor;
  varying float vA;
  varying vec2 vXY;
  varying float vLen;
  varying float vR;
  void main() {
    // Distance to the trail (a segment from -len to 0 along x), read through the sprite's own
    // radial profile: a round star when it does not move, a streak of the same star when it does.
    float d = length(vec2(vXY.x - clamp(vXY.x, -vLen, 0.0), vXY.y));
    vec4 m = texture2D(uMap, vec2(0.5 + 0.5 * d / vR, 0.5));
    gl_FragColor = vec4(vColor * m.rgb, m.a * uOpacity * vA);
  }
`;

export function spriteStarUniforms(size: number, twinkle: number, soft: number) {
  return {
    uMap: { value: softSprite() },
    uSize: { value: size },
    uScale: { value: 1 },
    uTime: { value: 0 },
    uTwinkle: { value: twinkle },
    uReveal: { value: 0 },
    uSoft: { value: soft },
    uOpacity: { value: 0 },
    uNear: { value: new THREE.Vector2(0, 1) },
    uBoost: { value: 1 },
    uFar: { value: 1 },
    uPrevMVP: { value: new THREE.Matrix4() },
    uRes: { value: new THREE.Vector2(1, 1) },
    uShutter: { value: 0 },
    uMaxLen: { value: STREAK[1] },
    uMaxSize: { value: 64 },
    uSpread: { value: STREAK[2] },
  };
}

/**
 * The stars as instanced quads instead of points, so each can be drawn as its own streak: a
 * point sprite is a square on screen and cannot stretch. `src` holds the stars as a points
 * geometry would (position, color, aOn, aPhase); the quad is the instance.
 */
export function streakGeometry(src: THREE.BufferGeometry): THREE.InstancedBufferGeometry {
  const geo = new THREE.InstancedBufferGeometry();
  geo.setIndex([0, 1, 2, 0, 2, 3]);
  geo.setAttribute('position', new THREE.Float32BufferAttribute([-1, -1, 0, 1, -1, 0, 1, 1, 0, -1, 1, 0], 3));
  const inst = (name: string, as: string) => {
    const a = src.getAttribute(name) as THREE.BufferAttribute;
    geo.setAttribute(as, new THREE.InstancedBufferAttribute(a.array, a.itemSize));
  };
  inst('position', 'aStar');
  inst('color', 'color');
  inst('aOn', 'aOn');
  inst('aPhase', 'aPhase');
  geo.instanceCount = src.getAttribute('position').count;
  return geo;
}

/**
 * The streaks are motion blur (owner, 2026-10-06: the lines of the dive's end "should be the
 * points turning into streaks, not lines appearing from nowhere"): each star is drawn over the
 * path it travelled on screen during a shutter of STREAK[0] seconds, at most STREAK[1] px, its
 * light spread over that path by STREAK[2] (1.086 conserves it before the tone curve; 1.8 keeps the
 * frame's mean as bright as with streaks off, measured 75/78 vs 72/79 at +100/+200 ms). The shutter opens with the dive
 * (scroll 0.02-0.1), so a dragged or drifting view at rest stays exactly as it was.
 * `?streak=shutter,maxPx,spread` in HUD builds.
 */
export const STREAK: [number, number, number] = (() => {
  const d: [number, number, number] = [0.05, 260, 1.8];
  if (!HUD_AVAILABLE || typeof window === 'undefined') return d;
  const v = new URLSearchParams(window.location.search).get('streak');
  if (v === null) return d;
  const n = v.split(',').map(Number);
  if (n.length !== 3 || n.some((x) => !Number.isFinite(x) || x < 0)) throw new Error(`spriteStars: ?streak must be shutter,maxPx,spread, all >= 0 - got "${v}"`);
  return [n[0], n[1], n[2]];
})();

const _mvp = new THREE.Matrix4();
const _buf = new THREE.Vector2();
let maxPointSize = 0;

/**
 * Feeds a streaking star mesh its motion, once a frame from useFrame - after the camera and the
 * mesh's parents have moved for the frame, before it is drawn. `held` keeps last frame's matrix.
 */
export function streakFrame(
  mesh: THREE.Object3D,
  u: ReturnType<typeof spriteStarUniforms>,
  held: { m: THREE.Matrix4; ok: boolean },
  camera: THREE.Camera,
  gl: THREE.WebGLRenderer,
  dt: number,
  scroll: number
) {
  if (!maxPointSize) {
    const ctx = gl.getContext();
    maxPointSize = (ctx.getParameter(ctx.ALIASED_POINT_SIZE_RANGE) as Float32Array)[1] || 64;
  }
  mesh.updateWorldMatrix(true, false);
  camera.updateMatrixWorld();
  _mvp.multiplyMatrices(camera.projectionMatrix, camera.matrixWorldInverse).multiply(mesh.matrixWorld);
  u.uPrevMVP.value.copy(held.ok ? held.m : _mvp);
  held.m.copy(_mvp);
  held.ok = true;
  u.uRes.value.copy(gl.getDrawingBufferSize(_buf));
  u.uMaxSize.value = maxPointSize;
  const open = THREE.MathUtils.smoothstep(scroll, 0.02, 0.1);
  u.uShutter.value = dt > 1e-4 ? (STREAK[0] * open) / dt : 0;
}

/** The dive's palette: one in five warm, the rest two blues, each 0.5-1.2 bright. */
export function paletteStar(rnd: () => number, warmShare: number, c: THREE.Color) {
  return c.set(rnd() < warmShare ? '#ffe9c8' : rnd() < 0.5 ? '#9db8ff' : '#6d7fe8').multiplyScalar(0.5 + rnd() * 0.7);
}
