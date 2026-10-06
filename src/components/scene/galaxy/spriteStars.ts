import * as THREE from 'three';
import { softSprite } from '@/lib/spaceMaterials';

/**
 * Soft round stars of a fixed world size, the look the owner picked out of the dive
 * (2026-10-05: the points that appear as the camera tilts "are prettier than the galaxy
 * itself"). Galaxy draws them over the whole disc from rest (sparkles) and DiveNeighbourhood
 * around the dive's arrival; both use this one material so the dive's stars are more of the
 * same, never a new kind of point.
 *
 * It is PointsMaterial's sprite (size attenuation on the CSS height, additive, the soft sprite)
 * with two things it cannot do per star:
 * - `aOn`: the reveal value at which this star starts to show, over `uSoft` of reveal. Stars
 *   with spread-out thresholds come in one by one instead of the whole field at once.
 * - `aPhase`: each star twinkles on its own rate and phase, `uTwinkle` deep.
 * - `uNear` (from, to), `uBoost` and `uFar`: a star past `to` from the camera shows at `uFar`
 *   and brightens toward `uBoost` by `from`, so the dive's stars light up as they are reached.
 *   1 and 1 is off.
 */
export const spriteStarVertex = /* glsl */ `
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
  varying vec3 vColor;
  varying float vA;
  void main() {
    vec4 mv = modelViewMatrix * vec4(position, 1.0);
    gl_Position = projectionMatrix * mv;
    gl_PointSize = uSize * uScale / -mv.z;
    float on = smoothstep(aOn, aOn + uSoft, uReveal);
    float tw = 1.0 + uTwinkle * sin(uTime * (0.6 + 1.8 * aPhase) + 40.0 * aPhase);
    vColor = color;
    vA = on * tw * mix(uBoost, uFar, smoothstep(uNear.x, uNear.y, -mv.z));
  }
`;

export const spriteStarFragment = /* glsl */ `
  uniform sampler2D uMap;
  uniform float uOpacity;
  varying vec3 vColor;
  varying float vA;
  void main() {
    vec4 m = texture2D(uMap, gl_PointCoord);
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
  };
}

/** The dive's palette: one in five warm, the rest two blues, each 0.5-1.2 bright. */
export function paletteStar(rnd: () => number, warmShare: number, c: THREE.Color) {
  return c.set(rnd() < warmShare ? '#ffe9c8' : rnd() < 0.5 ? '#9db8ff' : '#6d7fe8').multiplyScalar(0.5 + rnd() * 0.7);
}
