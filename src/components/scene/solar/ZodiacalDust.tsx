'use client';
import { useEffect, useMemo, useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import { chromeCount, chromeMaskGLSL, chromeRects, updateChromeRects } from '@/lib/chromeMask';

/**
 * The zodiacal light — sunlight scattered off the dust that fills the plane of the whole
 * system. Rendered as a VOLUME of points, not as a plane.
 *
 * It used to be a single 36×36 quad lying in the ecliptic, and that was the origin of the
 * "hard flat slab" cutting across Jupiter and Mars in the ORBIT frames. The ORBIT camera
 * sits almost exactly in the ecliptic, so the quad was seen edge-on and collapsed into a
 * straight bright bar; being additive and unoccluded by anything at its own depth, the bar
 * ran clean across the planet's disc and read as a flat day/night boundary. The planet's
 * own lighting was never the problem — it has always been a real N·L point light — but a
 * bar laid over the terminator is indistinguishable from a bad terminator.
 *
 * A cloud has no edge-on degenerate case. It also gets the physics right for free: looking
 * along the plane puts more grains on the line of sight, so the band brightens toward the
 * ecliptic exactly as the real one does, instead of vanishing or turning into a slab.
 */

const _dbs = new THREE.Vector2();
const _c = new THREE.Color();

const R_IN = 2.0;
const R_OUT = 16.0;
/** Fully dissolved closer to the lens than this; fully present beyond NEAR_FULL. */
const NEAR_GONE = 1.4;
const NEAR_FULL = 4.5;

const DUST_COLORS = ['#c8b190', '#d9c4a2', '#b7a184', '#e0cdae'];

export default function ZodiacalDust({ count = 5200 }: { count?: number }) {
  const geo = useMemo(() => {
    const pos = new Float32Array(count * 3);
    const col = new Float32Array(count * 3);
    const wgt = new Float32Array(count);
    const twk = new Float32Array(count * 2);
    for (let i = 0; i < count; i++) {
      // Radial density falls off outward (pow > 1 biases inward), and the disc FLARES:
      // its scale height grows with radius, which is what stops it reading as a wafer.
      const r = R_IN + Math.pow(Math.random(), 1.8) * (R_OUT - R_IN);
      const a = Math.random() * Math.PI * 2;
      const h = 0.16 + r * 0.055;
      const y = (Math.random() + Math.random() + Math.random() - 1.5) * h; // ~gaussian
      pos[i * 3] = Math.cos(a) * r;
      pos[i * 3 + 1] = y;
      pos[i * 3 + 2] = Math.sin(a) * r;
      _c.set(DUST_COLORS[(Math.random() * DUST_COLORS.length) | 0]);
      col[i * 3] = _c.r; col[i * 3 + 1] = _c.g; col[i * 3 + 2] = _c.b;
      // Illumination falls with distance from the star, and grains near the plane are
      // where the light actually concentrates.
      wgt[i] = (1.0 / (0.6 + r * 0.22)) * Math.exp(-Math.pow(y / h, 2) * 0.7);
      twk[i * 2] = Math.random() * 6.28;
      twk[i * 2 + 1] = 0.3 + Math.random() * 1.1;
    }
    const g = new THREE.BufferGeometry();
    g.setAttribute('position', new THREE.BufferAttribute(pos, 3));
    g.setAttribute('aColor', new THREE.BufferAttribute(col, 3));
    g.setAttribute('aWeight', new THREE.BufferAttribute(wgt, 1));
    g.setAttribute('aTwinkle', new THREE.BufferAttribute(twk, 2));
    g.boundingSphere = new THREE.Sphere(new THREE.Vector3(), R_OUT + 2);
    return g;
  }, [count]);
  useEffect(() => () => geo.dispose(), [geo]);

  const uniforms = useMemo(
    () => ({ uTime: { value: 0 }, uProjScale: { value: 600 }, uChrome: chromeRects, uChromeN: chromeCount }),
    []
  );

  const ref = useRef<THREE.Points>(null);
  useFrame((state, dt) => {
    updateChromeRects(state.gl);
    uniforms.uTime.value = state.clock.elapsedTime;
    uniforms.uProjScale.value =
      state.camera.projectionMatrix.elements[5] * 0.5 * state.gl.getDrawingBufferSize(_dbs).y;
    if (ref.current) ref.current.rotation.y += dt * 0.006;
  });

  return (
    <points ref={ref} geometry={geo} frustumCulled={false} name="zodiacalDust">
      <shaderMaterial
        uniforms={uniforms}
        vertexShader={vert}
        fragmentShader={frag}
        transparent
        depthWrite={false}
        blending={THREE.AdditiveBlending}
      />
    </points>
  );
}

const vert = /* glsl */ `
  uniform float uTime;
  uniform float uProjScale;
  attribute vec3 aColor;
  attribute float aWeight;
  attribute vec2 aTwinkle;
  varying vec3 vColor;
  varying float vAlpha;

  void main() {
    vec4 mv = modelViewMatrix * vec4( position, 1.0 );
    gl_Position = projectionMatrix * mv;

    float dist = max( 0.001, -mv.z );
    // Hard clamp: a grain must never grow into an object as the camera approaches it.
    gl_PointSize = clamp( 0.006 * 2.0 * uProjScale / dist, 1.0, 2.2 );

    vec3 sunView = ( viewMatrix * vec4( 0.0, 0.0, 0.0, 1.0 ) ).xyz;
    vec3 toEye = normalize( -mv.xyz );
    vec3 lightDir = normalize( mv.xyz - sunView );
    float scatter = 0.30 + 0.70 * pow( max( dot( toEye, lightDir ), 0.0 ), 2.0 );

    float near = smoothstep( ${NEAR_GONE.toFixed(2)}, ${NEAR_FULL.toFixed(2)}, dist );
    float twinkle = 0.82 + 0.18 * sin( uTime * aTwinkle.y + aTwinkle.x );

    vColor = aColor;
    vAlpha = 0.16 * aWeight * scatter * near * twinkle;
  }
`;

const frag = /* glsl */ `
  ${chromeMaskGLSL}
  varying vec3 vColor;
  varying float vAlpha;
  void main() {
    float a = smoothstep( 0.5, 0.06, distance( gl_PointCoord, vec2( 0.5 ) ) );
    float alpha = a * vAlpha * chromeKeep( gl_FragCoord.xy );
    if ( alpha < 0.002 ) discard;
    gl_FragColor = vec4( vColor, alpha );
    #include <tonemapping_fragment>
    #include <colorspace_fragment>
  }
`;
