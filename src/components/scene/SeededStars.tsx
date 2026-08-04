'use client';
import { useLayoutEffect, useRef } from 'react';
import * as THREE from 'three';
import { Stars } from '@react-three/drei';
import { makeRng, SEED } from '@/lib/rng';

/**
 * drei's `<Stars>`, made reproducible.
 *
 * The seeding pass closed every `Math.random()` we own, and G5 — the determinism check —
 * immediately found the one we do not: this background field, 13000 points, rolling fresh on
 * every load in BOTH acts. It is the same class of hole as `starColor`'s internal
 * `Math.random()`, and worse in one respect: it lives in `node_modules`, so no lint rule and no
 * amount of care in our own files could ever have surfaced it. Only measuring the output did.
 *
 * `<Stars>` takes no seed prop (checked against the installed source, not from memory). Two ways
 * to fix that, and the cheap-looking one is the wrong one: copying the component would mean
 * vendoring its shader as well — the point-size pulse and the fade falloff are in there — and
 * then owning a silent divergence at the next upgrade.
 *
 * So drei still renders it and still owns the material; we only rewrite the geometry, in place,
 * with a seeded run of drei's OWN algorithm. Identical distribution, identical maths, identical
 * look — the numbers are simply the same numbers twice. The arrays are the same length, so this
 * is a value overwrite, never a reallocation.
 *
 * If a future drei changes that algorithm, the look changes and this stays correct: it would
 * generate the old distribution seeded while drei generated the new one unseeded, and the
 * assertion below is what would catch it.
 */
export default function SeededStars(props: React.ComponentProps<typeof Stars>) {
  const ref = useRef<THREE.Points>(null);
  const { radius = 100, depth = 50, count = 5000, factor = 4 } = props;

  useLayoutEffect(() => {
    const pts = ref.current;
    const geo = pts?.geometry;
    const pos = geo?.attributes.position as THREE.BufferAttribute | undefined;
    const size = geo?.attributes.size as THREE.BufferAttribute | undefined;
    if (!pos || !size) return;
    // A length mismatch means drei's generation no longer matches the algorithm mirrored below,
    // so overwriting would produce a field that is reproducible and WRONG. Refuse loudly rather
    // than silently ship a different sky — this is exactly the silent-failure shape that let the
    // unseeded field survive a whole round unnoticed.
    if (pos.count !== count || size.count !== count) {
      console.error(`[SeededStars] drei generated ${pos.count} positions / ${size.count} sizes for count=${count} — not overwriting`);
      return;
    }

    const rnd = makeRng(SEED.backgroundStars);
    // Call order matters and mirrors drei exactly: every size first (it builds that array with
    // Array.from before the loop), then per-star the inward radius walk, the polar angle and the
    // azimuth. Reordering these would still be deterministic but would be a different sky.
    const sizes = size.array as Float32Array;
    for (let i = 0; i < count; i++) sizes[i] = (0.5 + 0.5 * rnd()) * factor;

    const arr = pos.array as Float32Array;
    const sph = new THREE.Spherical();
    const v = new THREE.Vector3();
    let r = radius + depth;
    const increment = depth / count;
    for (let i = 0; i < count; i++) {
      r -= increment * rnd();
      sph.set(r, Math.acos(1 - rnd() * 2), rnd() * 2 * Math.PI);
      v.setFromSpherical(sph);
      arr[i * 3] = v.x;
      arr[i * 3 + 1] = v.y;
      arr[i * 3 + 2] = v.z;
    }
    pos.needsUpdate = true;
    size.needsUpdate = true;
    // The colours are already deterministic in drei (hue is i/count), so they are left alone.
  }, [radius, depth, count, factor]);

  return <Stars ref={ref} {...props} />;
}
