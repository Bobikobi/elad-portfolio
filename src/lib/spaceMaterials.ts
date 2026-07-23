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
