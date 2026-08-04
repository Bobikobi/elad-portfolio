## BRIEF: B8b - Project windows as annular sectors

> Written AFTER the implementation, not before it. The stage was handed to this
> session as a standalone task and executed before the MEGA PLAN arrived, so the
> PART 4A ordering was not followed. Recorded here so the audit trail is complete
> and honest rather than back-dated.

### GOAL

Make every /projects window a true annular sector around the focused planet -
concave inner arc concentric with the limb, radial side edges, convex outer arc -
instead of a rotated rectangle.

### CURRENT STATE (measured)

- Windows were rectangles in a flexbox column. The only curvature was a per-window
  `margin-inline-end` tuck plus a max 3.6deg tilt (`ProjectsStage.tsx`, B8 block).
  Top and bottom edges were parallel by construction, so no measurement of
  criterion 2 could ever pass.
- The arc was built from `projectedPlanetRect()`, the DESIGN framing. Measured on
  the running scene at 1440x900: design R = 306.0px, centre (418.0, 396.0); the
  rendered limb, fitted from 8 projected silhouette samples, is R = 336.2px,
  centre (406.6, 393.6). A 30px radius error and an 11px centre error, i.e. the
  "constant gap" was constant relative to the wrong circle.
- Root of that error: `fill` in `orbitFraming.ts` is defined through tan(fov/2),
  which sizes the sphere's tangent plane, not its silhouette. The true disc is
  larger by 1/sqrt(1-(R/d)^2) = 1.032 here. The pose also carries a deliberate
  micro-drift, so the disc breathes a few px around any static value.

### DIAGNOSIS

Two independent defects. (a) The shape carried none of the geometry - it was a box
next to a curve. (b) Even the little curvature it had was measured against a circle
the camera does not draw. Fixing (a) without (b) would have produced arcs that are
perfectly concentric with a circle 30px off the planet.

### RECIPE

- `src/lib/ringGeometry.ts` (new): pure functions. `ringMetrics(vw,vh,rtl,portrait)`
  returns C, R, r0 = R + gap, r1 = r0 + depth, rMid, th0, sweep, dHalf = (thick/2)/rMid,
  pitch, and the inscribed content box. `sectorPath()` emits
  `M r0*u(th-d) A r0 ... L r1*u(th+d) A r1 ... Z` with 14px quadratic corner joins on
  all four corners. `innerArcPath()` emits the inner arc alone for the gold accent.
- `src/lib/orbitFraming.ts`: add `livePlanetRect` (plain mutable value object) and
  `livePlanetRectFresh(vw,vh)`.
- `src/components/scene/CameraRig.tsx`: add `publishLimb()` - fits a circle to 8
  projected silhouette points and writes `livePlanetRect`. Called at the end of the
  existing ORBIT branch. It only READS the camera; no write to position, quaternion
  or fov, and no change to any state machine.
- `src/components/worlds/ProjectsStage.tsx`: rewritten. An SVG layer of paths under a
  sticky zero-height deck of content boxes inside a real scroll container. One rAF,
  guarded by a signature so it rebuilds only when the limb or the scroll moves.
  scrollTop / rMid = radians, per the stage spec.
- `src/components/worlds/ProjectsWorld.tsx`: card content refitted to the inscribed
  box (preview image becomes a scrimmed backdrop; the box is narrow at the inner edge).
- `src/app/globals.css`: `.ring-layer`, `.ring-window`, `.ring-accent`, `.ring-scroll`,
  `.ring-card`.

Tuning: gap 48px, depth 330px, thickness 240px, cardGap 20px, fan +/-35deg, corner
14px, padInner 28 / padOuter 24. Portrait: gap 40, depth 240, thickness 300 clamped
so the outer arc cannot cross the viewport edge, fan +/-30deg.

### ACCEPTANCE

Stage criteria 1-7 as written in the MEGA PLAN.

### VERIFICATION PLAN

`scripts/harness/b8b-ring.mjs` - puppeteer-core against system Chromium, one isolated
browser context per case (a shared profile leaked a stored locale between cases and
produced a false failure). Cases: he/en/ru at 1440x900, he at 1280x800, he/en at
390x844. `?ringprobe=1` publishes the frame the layer actually used so measurements
assert against the same numbers the shape was built from. Measures: distance of 21
sampled points per inner arc to the planet centre minus R; perpendicular distance from
the planet centre to the infinite line through each straight edge; outer-arc sagitta;
`isPointInFill` for the four rotated corners plus centre of every content box; text
overflow; per-rebuild cost.

### RISKS / ROLLBACK

- Touching `CameraRig.tsx` at all is close to the PART 5.2 boundary. The addition is a
  read-only publish outside the state machine, but the owner should rule on it.
- Rollback is `git checkout -- src/` plus deleting `src/lib/ringGeometry.ts`; nothing
  else in the scene depends on the new module.

### OPEN QUESTIONS FOR OWNER

1. Is the `publishLimb` addition to `CameraRig.tsx` acceptable under PART 5.2? Without
   it, criterion 1 is constant against a circle 30px off the rendered limb.
2. +/-35deg around this limb holds 2-3 windows on desktop and 1 on mobile. That is the
   direct arithmetic of the stage's own numbers, not a defect. Accept, or change the
   thickness / fan?
