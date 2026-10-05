'use client';
import { useMemo, useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import { useScene } from '@/lib/sceneStore';
import { DIVE_START, diveAt } from '@/lib/passageProfile';
import { diveStarAt } from '@/lib/diveStar';
import { galaxyFrame } from './Galaxy';

/**
 * The star the dive flies into (#82 stage 2). The camera's look settles on it by 62% of the
 * dive and the last leg is a straight push at it (CameraRig), so it sits at the centre of the
 * frame while the swap curtain closes - which is where the curtain's warm centre is drawn. The
 * star becomes the sun: one bright point the eye follows from the galaxy into the next act.
 *
 * A camera-facing quad with a soft core, a halo and faint four-point spikes, the shape every
 * bright star has in the Hubble photograph the disc is made of. The spikes are the telescope's,
 * not the star's, so they turn with the camera's bank rather than with the world.
 *
 * Hidden at rest: the welcome shot is the photograph alone, and stays byte-identical. Drawn
 * after DiveFade (18) so the dimming that takes the light out of the approach leaves the target
 * lit, and before SwapMask (19), which covers it.
 */

// World radius of the halo. From the curtain's start (3.7 from the star) the camera covers
// another 3.4 units, and a world-sized point would grow 10x into a disc ~280 px across - bigger
// than the warm centre it hands over to. Past GROW_FROM it grows as the square root of the
// approach instead, ~3x, ending close to the curtain's own core.
const RADIUS = 0.16;
const GROW_FROM = 3.7;

const vertex = /* glsl */ `
  varying vec2 vUv;
  void main() {
    vUv = uv;
    gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
  }
`;

const fragment = /* glsl */ `
  uniform float uOpacity;
  varying vec2 vUv;
  vec3 lin(vec3 c) { return pow(c, vec3(2.2)); }
  void main() {
    vec2 p = (vUv - 0.5) * 2.0;   // RADIUS at 0.5, the quad's edge at 1
    float r = length(p);
    // A saturated white core, as the knot burns out the Hubble exposure, inside a halo in the
    // knot's own blue-white (photo: core 232,241,244, surround 95,109,115) the size of the
    // curtain's centre at the moment that centre starts to show, which opens in the same colour
    // and only then warms toward the sun. The amber halo it had came from nowhere in the photo.
    float core = min(1.0, 1.4 * exp(-r * r / 0.008));
    float halo = exp(-r * r / 0.25) * 0.3 + exp(-r / 0.2) * 0.15;
    // Four thin spikes, fading along their length - the telescope's signature on every bright
    // star in the photograph.
    float spikes = (exp(-abs(p.y) / 0.005) + exp(-abs(p.x) / 0.005)) * exp(-r / 0.45) * 0.5;
    float edge = 1.0 - smoothstep(0.8, 1.0, r);
    vec3 col = lin(vec3(1.0, 0.99, 0.97)) * core + lin(vec3(0.80, 0.91, 1.0)) * halo + lin(vec3(0.90, 0.95, 1.0)) * spikes;
    gl_FragColor = vec4(col * edge * uOpacity, 1.0);
  }
`;

const _target = new THREE.Vector3();

export default function DiveStar() {
  const ref = useRef<THREE.Mesh>(null);
  const uniforms = useMemo(() => ({ uOpacity: { value: 0 } }), []);

  useFrame(({ camera }) => {
    const m = ref.current;
    if (!m) return;
    const p = useScene.getState().scrollProgress;
    m.visible = p > DIVE_START;
    if (!m.visible) return;
    const e = diveAt(p);
    // In as the look swings onto it, so it arrives in the frame the way the camera turns to it.
    (m.material as THREE.ShaderMaterial).uniforms.uOpacity.value = THREE.MathUtils.smoothstep(e, 0.08, 0.45);
    diveStarAt(galaxyFrame.spin, _target);
    m.position.copy(_target);
    m.quaternion.copy(camera.quaternion);
    const dist = camera.position.distanceTo(_target);
    m.scale.setScalar(4 * RADIUS * (dist < GROW_FROM ? Math.sqrt(dist / GROW_FROM) : 1));
  });

  return (
    <mesh ref={ref} renderOrder={18.5} visible={false} raycast={() => null} frustumCulled={false}>
      <planeGeometry args={[1, 1]} />
      <shaderMaterial
        vertexShader={vertex}
        fragmentShader={fragment}
        uniforms={uniforms}
        transparent
        blending={THREE.AdditiveBlending}
        depthWrite={false}
        depthTest={false}
        toneMapped={false}
      />
    </mesh>
  );
}
