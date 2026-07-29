// Shared visual DNA for the whole cosmos — both acts import ONLY from here so the
// galaxy, the dive and the solar system read as one universe. One star palette,
// one soft sprite, one glow sprite (galaxy core AND sun corona), one nebula hue set.
import * as THREE from 'three';

/** Realistic stellar colour classes: ~55% warm-white, 15% orange giants, 20% hot
 *  blue-white, 10% deep blue. Returns linear RGB.
 *
 *  `rnd` exists because this function is called from inside seeded `useMemo` bodies, and its
 *  own `Math.random()` was a hole in that seeding that no lint rule could see: the positions
 *  would have been reproducible while the COLOURS still rolled fresh on every load. Callers
 *  that have a generator must pass it; the default keeps non-seeded callers working. */
export function starColor(target = new THREE.Color(), rnd: () => number = Math.random): THREE.Color {
  const r = rnd();
  if (r < 0.55) target.setHSL(0.11, 0.35, 0.9);
  else if (r < 0.7) target.setHSL(0.06, 0.75, 0.62);
  else if (r < 0.9) target.setHSL(0.6, 0.5, 0.86);
  else target.setHSL(0.62, 0.8, 0.6);
  return target;
}

/** Nebula hues used everywhere (galaxy arms, dive veils, solar background). */
export const NEBULA_HUES = ['#4D8DFF', '#6D5AE6', '#5b57c8', '#8b3fb0', '#c0407a'];

/** The single gold — Act-1 galaxy core and Act-2 sun share this exact value. */
export const CORE_GOLD = '#FFC978';

let _soft: THREE.CanvasTexture | null = null;
/** One soft radial sprite, shared (nebulae, dust, corona, glows). */
export function softSprite(): THREE.CanvasTexture {
  if (_soft) return _soft;
  const c = document.createElement('canvas');
  c.width = c.height = 128;
  const ctx = c.getContext('2d')!;
  const g = ctx.createRadialGradient(64, 64, 0, 64, 64, 64);
  g.addColorStop(0, 'rgba(255,255,255,0.95)');
  g.addColorStop(0.4, 'rgba(255,255,255,0.35)');
  g.addColorStop(1, 'rgba(255,255,255,0)');
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, 128, 128);
  _soft = new THREE.CanvasTexture(c);
  _soft.colorSpace = THREE.SRGBColorSpace;
  return _soft;
}

/**
 * B4 — make a sprite's own QUAD EDGE unreachable.
 *
 * A billboard is a square, and a square that ends while it is still emitting light is a
 * visible straight seam. The nebula stills are feathered, but "feathered" in an 8-bit
 * alpha channel means the border can still sit at 2 or 3 of 255 — invisible in an image
 * viewer, and a flat lit rectangle when the same quad is scaled to 60 world units,
 * blended additively over a near-black sky and then lifted by a grade. That is the
 * straight-edged panel that was cutting the Jupiter and Technologies frames.
 *
 * So the fade is enforced in the shader instead of trusted to the asset: alpha reaches
 * exactly zero before the boundary no matter what the texture does there. Radius is
 * measured in UV, so it behaves identically on a stretched billboard, and the quad's
 * corners (r = √2) are gone long before it.
 */
const featherSprite = (shader: { fragmentShader: string }) => {
  shader.fragmentShader = shader.fragmentShader.replace(
    '#include <alphatest_fragment>',
    `{
       float _r = length( vMapUv - 0.5 ) * 2.0;   // 0 centre .. 1 at the edge midpoints
       diffuseColor.a *= 1.0 - smoothstep( 0.74, 1.0, _r );
     }
     #include <alphatest_fragment>`
  );
};

/**
 * Spread onto any `<spriteMaterial>` that must not show its own quad.
 *
 * `customProgramCacheKey` is not optional here. three keys the compiled program on the
 * material's PARAMETERS, and `onBeforeCompile` is not one of them — so a plain sprite
 * material with the same map/blending/depth settings hashes identically to a feathered
 * one, and whichever compiled first is silently reused for both. That is exactly what
 * happened on the first attempt: the un-feathered diffraction-star sprites in the same
 * group won the cache, the nebula layers were handed their program, and the rectangles
 * stayed on screen with the injected code never running.
 */
export const featherSpriteProps = {
  onBeforeCompile: featherSprite,
  customProgramCacheKey: () => 'space-feathered-sprite',
};

let _flame: THREE.CanvasTexture | null = null;
/**
 * One solar prominence — a tapered plasma wisp, not a blob.
 *
 * The prominences used to be the shared round `softSprite` stretched 0.5 × 2.0, which is
 * an ellipse: seven of them around the limb read as orange petals stuck to the sun. A real
 * prominence is widest and brightest where it leaves the surface and thins to nothing at
 * its tip, so the texture is drawn that way — the base sits at v=0 and both the width and
 * the intensity decay along v, with a little noise so no two edges are the same curve.
 */
export function flameSprite(): THREE.CanvasTexture {
  if (_flame) return _flame;
  const W = 96;
  const H = 256;
  const c = document.createElement('canvas');
  c.width = W;
  c.height = H;
  const ctx = c.getContext('2d')!;
  const img = ctx.createImageData(W, H);
  for (let y = 0; y < H; y++) {
    // canvas y=0 is the TOP of the sprite; put the tip there and the base at the bottom.
    const v = 1 - y / (H - 1); // 0 base .. 1 tip
    const width = Math.pow(1 - v, 0.75) * 0.40 + 0.02;
    // Fade in over the first few percent so the base melts into the limb instead of
    // starting with a cut edge, and decay along the length.
    const along = Math.pow(1 - v, 1.25) * smoothstep(0, 0.10, v);
    const wob = 0.5 + 0.5 * Math.sin(v * 9.0) * (1 - v); // a lazy lean, strongest near the tip
    for (let x = 0; x < W; x++) {
      const u = x / (W - 1) - 0.5 + (wob - 0.5) * 0.10 * v;
      const lateral = Math.exp(-Math.pow(u / width, 2) * 2.4);
      const a = Math.max(0, Math.min(1, along * lateral));
      const i = (y * W + x) * 4;
      img.data[i] = 255;
      img.data[i + 1] = 255;
      img.data[i + 2] = 255;
      img.data[i + 3] = Math.round(a * 255);
    }
  }
  ctx.putImageData(img, 0, 0);
  _flame = new THREE.CanvasTexture(c);
  _flame.colorSpace = THREE.SRGBColorSpace;
  return _flame;
}

let _streak: THREE.CanvasTexture | null = null;
/**
 * The anamorphic streak — the horizontal flare a real lens throws across a bright source.
 *
 * It used to be the shared round sprite stretched 8 × 0.28, i.e. a very thin ellipse, and
 * an ellipse has a hard-ish waist: it read as a bar laid across the sun rather than light
 * bleeding sideways out of it. This is drawn as the thing it is — brightest and thickest
 * at the centre, thinning and fading to nothing at both tips, with the vertical falloff
 * tightening as it goes out.
 */
export function streakSprite(): THREE.CanvasTexture {
  if (_streak) return _streak;
  const W = 512;
  const H = 64;
  const c = document.createElement('canvas');
  c.width = W;
  c.height = H;
  const ctx = c.getContext('2d')!;
  const img = ctx.createImageData(W, H);
  for (let x = 0; x < W; x++) {
    const u = Math.abs(x / (W - 1) - 0.5) * 2; // 0 centre .. 1 tip
    const along = Math.exp(-u * 3.4) * (1 - smoothstep(0.85, 1, u));
    const halfWidth = 0.34 * Math.exp(-u * 2.2) + 0.012;
    for (let y = 0; y < H; y++) {
      const v = (y / (H - 1) - 0.5) * 2;
      const a = along * Math.exp(-Math.pow(v / halfWidth, 2) * 1.9);
      const i = (y * W + x) * 4;
      img.data[i] = 255;
      img.data[i + 1] = 255;
      img.data[i + 2] = 255;
      img.data[i + 3] = Math.round(Math.max(0, Math.min(1, a)) * 255);
    }
  }
  ctx.putImageData(img, 0, 0);
  _streak = new THREE.CanvasTexture(c);
  _streak.colorSpace = THREE.SRGBColorSpace;
  return _streak;
}

function smoothstep(a: number, b: number, x: number) {
  const t = Math.min(1, Math.max(0, (x - a) / (b - a)));
  return t * t * (3 - 2 * t);
}

/**
 * B13+ — the hero-star sparkle, drawn procedurally per fragment.
 *
 * The old one was a 128px canvas with a `lineWidth = 1.4` cross stroked across it: two
 * bars of constant width and constant brightness meeting at a soft blob. That is a plus
 * SIGN, and it is why the stars read as clip-art. A real diffraction spike is widest and
 * brightest where it leaves the core and tapers to nothing — both its intensity AND its
 * width decay along the ray — and it never holds still, because the atmosphere and the
 * optics keep moving.
 *
 * So: a dominant gaussian core, four rays whose half-width decays with the same
 * exponential as their brightness, optional 45° secondaries for the brightest few, and
 * scintillation on the star's own phase driving both ray length and intensity. All in
 * uniforms, so eleven stars share one program and each one still lives its own life.
 */
const SPARKLE_GLSL = /* glsl */ `
{
  vec2 p = vSpark;                       // -0.5 .. 0.5 across the quad
  float r2 = dot( p, p );

  // Scintillation: a sparkle lives, a plus sign does not. Two incommensurate rates so
  // the breathing never settles into a visible beat.
  float sc = 0.86 + 0.14 * sin( uTime * uRate + uPhase )
                  + 0.06 * sin( uTime * uRate * 2.37 + uPhase * 1.7 );
  float L = uRay * sc;

  float core = exp( -r2 / ( 0.0022 + 0.0016 * sc ) );

  // Tapered rays: the half-width decays along the ray, so the spike thins as it fades.
  float wx = 0.016 * exp( -abs( p.x ) / ( L * 0.9 ) ) + 0.0018;
  float wy = 0.016 * exp( -abs( p.y ) / ( L * 0.9 ) ) + 0.0018;
  float rayH = exp( -abs( p.x ) / L ) * exp( -0.5 * ( p.y * p.y ) / ( wx * wx ) );
  float rayV = exp( -abs( p.y ) / L ) * exp( -0.5 * ( p.x * p.x ) / ( wy * wy ) );

  // Secondary 45° pair, for the brightest one or two only.
  vec2 q = vec2( p.x + p.y, p.x - p.y ) * 0.70710678;
  float wd = 0.011 * exp( -abs( q.x ) / ( L * 0.6 ) ) + 0.0016;
  float we = 0.011 * exp( -abs( q.y ) / ( L * 0.6 ) ) + 0.0016;
  float diag = exp( -abs( q.x ) / ( L * 0.65 ) ) * exp( -0.5 * ( q.y * q.y ) / ( wd * wd ) )
             + exp( -abs( q.y ) / ( L * 0.65 ) ) * exp( -0.5 * ( q.x * q.x ) / ( we * we ) );

  float v = core + ( rayH + rayV ) * 0.45 * sc + diag * uSecondary * 0.18;
  v *= 1.0 - smoothstep( 0.40, 0.5, max( abs( p.x ), abs( p.y ) ) ); // never reach the quad edge
  diffuseColor.a *= clamp( v, 0.0, 1.0 );
}
`;

export interface SparkleOptions {
  color: THREE.ColorRepresentation;
  /** Ray decay length in quad units. Scale it with the star's brightness. */
  rayLen?: number;
  /** 0..1 — how much of the faint 45° pair to show. Brightest 1-2% only. */
  secondary?: number;
  phase?: number;
  /** Scintillation rate, rad/s. */
  rate?: number;
  opacity?: number;
}

export interface SparkleMaterial extends THREE.SpriteMaterial {
  userData: { uTime: { value: number } };
}

/**
 * One clock for every sparkle in the scene, driven once per frame from SceneRoot. Sharing
 * the uniform object means a scene full of stars costs one assignment, not one frame
 * callback per star.
 */
export const sparkleClock = { value: 0 };

/** A sprite material that draws {@link SPARKLE_GLSL}. Drive `userData.uTime` per frame. */
export function makeSparkleMaterial(o: SparkleOptions): SparkleMaterial {
  const u = {
    uTime: sparkleClock,
    uRay: { value: o.rayLen ?? 0.16 },
    uSecondary: { value: o.secondary ?? 0 },
    uPhase: { value: o.phase ?? 0 },
    uRate: { value: o.rate ?? 0.8 },
  };
  const m = new THREE.SpriteMaterial({
    color: o.color,
    transparent: true,
    opacity: o.opacity ?? 1,
    depthWrite: false,
    blending: THREE.AdditiveBlending,
    toneMapped: false,
  }) as SparkleMaterial;
  m.onBeforeCompile = (shader) => {
    Object.assign(shader.uniforms, u);
    // The sprite quad's own corners, carried through as a varying — with no map bound
    // there is no UV varying at all, and borrowing one by attaching a dummy texture would
    // be a texture fetch per fragment for nothing.
    shader.vertexShader = shader.vertexShader
      .replace('void main() {', 'varying vec2 vSpark;\nvoid main() {')
      .replace('#include <uv_vertex>', '#include <uv_vertex>\n\tvSpark = position.xy;');
    shader.fragmentShader = shader.fragmentShader
      .replace(
        'void main() {',
        'uniform float uTime, uRay, uSecondary, uPhase, uRate;\nvarying vec2 vSpark;\nvoid main() {'
      )
      .replace('#include <map_fragment>', SPARKLE_GLSL);
  };
  // Without this every sprite material with matching parameters shares one program and
  // the injection above silently never runs — see featherSpriteProps.
  m.customProgramCacheKey = () => 'space-sparkle';
  m.userData = { uTime: sparkleClock };
  return m;
}
