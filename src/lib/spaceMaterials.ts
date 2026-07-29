// Shared visual DNA for the whole cosmos — both acts import ONLY from here so the
// galaxy, the dive and the solar system read as one universe. One star palette,
// one soft sprite, one glow sprite (galaxy core AND sun corona), one nebula hue set.
import * as THREE from 'three';

/** Realistic stellar colour classes: ~55% warm-white, 15% orange giants, 20% hot
 *  blue-white, 10% deep blue. Returns linear RGB. */
export function starColor(target = new THREE.Color()): THREE.Color {
  const r = Math.random();
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

function smoothstep(a: number, b: number, x: number) {
  const t = Math.min(1, Math.max(0, (x - a) / (b - a)));
  return t * t * (3 - 2 * t);
}

let _spike: THREE.CanvasTexture | null = null;
/** Diffraction-spike sprite for hero stars (4-point cross + soft core). */
export function spikeSprite(): THREE.CanvasTexture {
  if (_spike) return _spike;
  const c = document.createElement('canvas');
  c.width = c.height = 128;
  const ctx = c.getContext('2d')!;
  const core = ctx.createRadialGradient(64, 64, 0, 64, 64, 30);
  core.addColorStop(0, 'rgba(255,255,255,1)');
  core.addColorStop(1, 'rgba(255,255,255,0)');
  ctx.fillStyle = core;
  ctx.fillRect(0, 0, 128, 128);
  ctx.strokeStyle = 'rgba(255,255,255,0.85)';
  ctx.lineWidth = 1.4;
  ctx.beginPath();
  ctx.moveTo(64, 4); ctx.lineTo(64, 124);
  ctx.moveTo(4, 64); ctx.lineTo(124, 64);
  ctx.stroke();
  _spike = new THREE.CanvasTexture(c);
  _spike.colorSpace = THREE.SRGBColorSpace;
  return _spike;
}
