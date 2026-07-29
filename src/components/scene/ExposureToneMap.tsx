'use client';
import { forwardRef, useMemo } from 'react';
import { Effect } from 'postprocessing';
import { Uniform, type WebGLRenderer } from 'three';

/**
 * The aperture + the tone mapper, as one fullscreen step inside the composer.
 *
 * This exists because three cannot tone-map for us here. `WebGLRenderer.setProgram` reads:
 *
 *   let toneMapping = NoToneMapping;
 *   if ( material.toneMapped ) {
 *     if ( _currentRenderTarget === null || … ) toneMapping = _this.toneMapping;
 *   }
 *
 * — material tone mapping is applied ONLY when drawing to the default framebuffer. An
 * EffectComposer always draws the scene into a render target, so `_currentRenderTarget`
 * is never null and every material compiles with tone mapping off no matter what
 * `gl.toneMapping` says. (That is also why @react-three/postprocessing sets
 * `NoToneMapping` on mount: it expects the chain to end in a tone mapper.) This one
 * never had one, so the scene had been writing raw linear radiance into a buffer that
 * clamps at 1.0 — a diffuse radiance of 3 did not roll off to 0.87, it clamped to white —
 * and `gl.toneMappingExposure`, the per-world aperture the whole ORBIT lighting design
 * rests on, was a number that nothing read.
 *
 * Exposure is read back off `renderer.toneMappingExposure` every frame rather than being
 * plumbed through a second channel, so CameraRig keeps driving the aperture exactly the
 * way it already believes it does — the value simply arrives somewhere that uses it.
 *
 * The curve is three's own ACES fit, `/ 0.6` and all, so "exposure 1" means here what it
 * has always meant everywhere else.
 */
const fragmentShader = /* glsl */ `
uniform float exposure;

vec3 RRTAndODTFit( vec3 v ) {
  vec3 a = v * ( v + 0.0245786 ) - 0.000090537;
  vec3 b = v * ( 0.983729 * v + 0.4329510 ) + 0.238081;
  return a / b;
}

vec3 acesFilmic( vec3 color ) {
  const mat3 ACESInputMat = mat3(
    vec3( 0.59719, 0.07600, 0.02840 ),
    vec3( 0.35458, 0.90834, 0.13383 ),
    vec3( 0.04823, 0.01566, 0.83777 )
  );
  const mat3 ACESOutputMat = mat3(
    vec3(  1.60475, -0.10208, -0.00327 ),
    vec3( -0.53108,  1.10813, -0.07276 ),
    vec3( -0.07367, -0.00605,  1.07602 )
  );
  color = ACESInputMat * color;
  color = RRTAndODTFit( color );
  color = ACESOutputMat * color;
  return clamp( color, 0.0, 1.0 );
}

void mainImage( const in vec4 inputColor, const in vec2 uv, out vec4 outputColor ) {
  outputColor = vec4( acesFilmic( max( inputColor.rgb, 0.0 ) * exposure / 0.6 ), inputColor.a );
}
`;

class ExposureToneMapEffect extends Effect {
  constructor() {
    super('ExposureToneMap', fragmentShader, {
      uniforms: new Map([['exposure', new Uniform(1)]]),
    });
  }

  update(renderer: WebGLRenderer) {
    const u = this.uniforms.get('exposure');
    if (u) u.value = renderer.toneMappingExposure;
  }
}

/** Place AFTER God Rays / Bloom (those want HDR) and BEFORE the grade, grain and vignette. */
const ExposureToneMap = forwardRef<ExposureToneMapEffect>(function ExposureToneMap(_props, ref) {
  const effect = useMemo(() => new ExposureToneMapEffect(), []);
  return <primitive ref={ref} object={effect} dispose={null} />;
});

export default ExposureToneMap;
