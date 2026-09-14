'use client';
import { forwardRef, useMemo } from 'react';
import { Effect } from 'postprocessing';
import { Uniform, type WebGLRenderer } from 'three';
import { HUD_AVAILABLE } from './DebugHud';

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
 *
 * HIGHLIGHT ROLLOFF (Mars). ACES clamps its output per channel, so a colour whose channels
 * are far apart loses the brightest one first: on Mars's sunward limb the red channel hit
 * the ceiling while green and blue were still mid-range, and a channel that clips alone
 * does two things at once — it flattens every highlight into one hueless patch of maximum
 * red, and it rotates the hue as it goes, because only one component stops rising. Rust
 * became signal-red.
 *
 * The treatment is a soft per-channel rolloff ahead of the curve: where the brightest
 * channel runs past a knee, the colour eases toward its own luminance. That is a MIX, not a
 * replacement, so the hue angle never rotates — saturation comes down only in the
 * highlights, which is what lets the brightest channel stay under the ceiling and keep its
 * gradient. Rust stays rust; it simply stops being redder than it can be.
 *
 * It is scaled by the channel SPREAD, and that is what makes it safe to apply globally
 * rather than per-object. Only a colour that is both bright AND lopsided, which is the
 * exact condition for a lone channel clipping, is touched at all. Nothing here changes
 * exposure: the aperture is still the per-world number CameraRig drives, per the ruling.
 *
 * CORRECTED 2026-08-15 (SUN-3). This comment used to claim that a neutral highlight — the
 * sun's core, the gold curtain, a white star — has its channels close together, so the
 * spread term is ~0 and it "is passed through untouched". That is false, and it hid a real
 * defect for two stages. The sun's core is NOT neutral: its measured spread is 0.97, so the
 * rolloff was desaturating the centre of the disc by 49% and the limb by 11% — i.e. actively
 * cancelling the limb darkening SUN-2 was trying to produce. The pass is global, so this
 * applies to every planet, star and the gold curtain too, not only to Mars, which is what it
 * was written for. Re-scoping it is P4 of PHOTOMETRY-megaplan.md and is only safe after P3.
 */
const fragmentShader = /* glsl */ `
uniform float exposure;

const vec3 LUMA = vec3( 0.2126, 0.7152, 0.0722 );
// Measured on the alias: at 0.85 / 2.20 / 0.55 the worst longitude still clipped 0.34% of
// Mars's disc, red-only, centred at 0.35 of the radius — the sub-solar point. Tightened until
// that reached zero, with the disc mean watched at every step so the rust did not drain
// toward grey while chasing it.
const float HL_KNEE  = 0.72; // brightest channel below this is never touched
const float HL_RANGE = 1.70; // …and the rolloff reaches full strength this far past it
const float HL_MAX   = 0.68; // most saturation a fully lopsided highlight may give up

vec3 highlightRolloff( vec3 c ) {
  float peak = max( max( c.r, c.g ), c.b );
  if ( peak <= HL_KNEE ) return c;
  float base = min( min( c.r, c.g ), c.b );
  // 0 for a neutral colour, 1 for a fully saturated one. This is the per-channel part: it
  // is the gap between the channels that decides whether one of them can clip alone.
  float spread = ( peak - base ) / peak;
  float over = smoothstep( 0.0, 1.0, ( peak - HL_KNEE ) / HL_RANGE );
  return mix( c, vec3( dot( c, LUMA ) ), HL_MAX * over * spread );
}

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
  // Rolloff AFTER the aperture, because whether a channel is about to clip is a property of
  // the exposed value, not of the raw radiance — the same surface at two apertures needs
  // two different amounts of it.
  vec3 exposed = max( inputColor.rgb, 0.0 ) * exposure / 0.6;
  outputColor = vec4( acesFilmic( highlightRolloff( exposed ) ), inputColor.a );
}
`;

/**
 * P4 measurement seam, HUD builds only (`?noRolloff`).
 *
 * P4 has to know how much `highlightRolloff` is taking from each body, and the shader gates
 * itself on the PRE-ACES HDR colour while a screenshot is post-ACES and clipped at 255. So
 * the spread the shader acts on cannot be recovered from a frame - a pixel that arrives at
 * (255,255,255) tells you nothing about how lopsided it was going in. Holding everything
 * else and switching the function off is the only measurement that needs no inversion and
 * no proxy. It is the same method SUN-3 used to settle god rays against bloom.
 *
 * Built by string replacement from the shader above rather than by branching inside it, so
 * that WITHOUT the flag the program text is byte-identical to what shipped - no new uniform,
 * no new branch, nothing for a compiler to schedule differently. Verified, not assumed:
 * `photometry-diff` against `m1-before` is mean 0.0000 / max 0 on all six views.
 */
const FRAGMENT_NO_ROLLOFF = (() => {
  const marker = 'acesFilmic( highlightRolloff( exposed ) )';
  if (!fragmentShader.includes(marker)) {
    throw new Error('P4 seam: the highlightRolloff call site has moved - the ?noRolloff measurement would silently measure nothing');
  }
  return fragmentShader.replace(marker, 'acesFilmic( exposed )');
})();

const rolloffDisabled = () =>
  HUD_AVAILABLE &&
  typeof window !== 'undefined' &&
  new URLSearchParams(window.location.search).has('noRolloff');

class ExposureToneMapEffect extends Effect {
  constructor(noRolloff = false) {
    super('ExposureToneMap', noRolloff ? FRAGMENT_NO_ROLLOFF : fragmentShader, {
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
  const effect = useMemo(() => new ExposureToneMapEffect(rolloffDisabled()), []);
  return <primitive ref={ref} object={effect} dispose={null} />;
});

export default ExposureToneMap;
