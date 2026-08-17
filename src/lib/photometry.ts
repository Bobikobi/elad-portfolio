/**
 * Scene-light photometry constants. This module is the only place scene light constants
 * may live, and it exports values only.
 */

/** Low ambient fill that keeps unlit surfaces from falling completely black. */
export const AMBIENT_FILL_INTENSITY = 0.06;

// Per-planet ORBIT exposure. The system is spatially compressed, so irradiance falls off
// 25× between the innermost and outermost world; at a single aperture the near planets
// clip while the far ones go muddy. This is the aperture per world, and it is the only
// lever that works — albedo cannot rescue a diffuse radiance already well above 1.
//
// B3 retune, measured on the alias: at the old values Jupiter had 6.1% of its disc at
// 250+ (p99 luminance 250.6, i.e. a white field, not a planet) and Mars 10.4% clipped in
// the RED channel alone with mean blue at 0.2/255 — the "neon yellow". Values below put
// each world's peak just under the roll-off instead of through it.
// Calibrated by sweeping the aperture on the alias and measuring each disc, once the tone
// mapper was actually switched on (see ExposureToneMap — before that none of these numbers
// reached a pixel). At exposure 1.0 the measured discs came out at mean luminance
// jupiter 140 / clip 0%, saturn 93 / 0%, mars 95 / 0.9%, earth 211 / 19.5% — Earth is the
// outlier because its cloud and night-lights shells stack on top of an already close-lit
// body. These values land every world in the 90-135 band with clipping at zero.
// The string index signature permits an unmapped focus; CameraRig owns its neutral fallback.
export const ORBIT_APERTURE: Record<string, number> = { earth: 0.62, mars: 0.72, jupiter: 0.85, saturn: 1.0, belt: 1.0 };

/** Renderer aperture before a world is selected and after departure from one. */
export const NEUTRAL_APERTURE = 1;

// Sun lamp: the system's single light source.
// B3: the starlight was #ffd9a0 - linear (1.00, 0.69, 0.35), i.e. it delivers
// three times as much red as blue. On a body that is already red, Mars, the red
// channel saturated while blue never got off the floor: that is what "neon
// yellow" was made of. A G star is close to white; the gold identity of this
// system comes from the sun's own emissive surface and its bloom, both of which
// are toneMapped:false and untouched by this.
export const SUN_LAMP_INTENSITY = 650;
export const SUN_LAMP_DISTANCE = 90;
export const SUN_LAMP_DECAY = 2;

// Exposure stays at 1.5. It is NOT the lever it looks like: simulated across the whole
// pipeline, dialling it down moves red hardly at all (red is in the shoulder, that is
// the defect) while crushing green and blue, which sit on the steep part - at 0.55 the
// limb/centre red ratio was still 0.878 and the sun had turned a hard orange with blue
// at 22 of 255. The exposure was never what pinned red; the stops in Sun.tsx were.
export const SUN_EMISSIVE_EXPOSURE = 1.5;

// SUN-3: 0.16 -> 0.05, and this is the number that was flattening the sun.
//
// GodRays smears the source RADIALLY outward, so on a source that fills a third of the
// frame the "shafts" are a wide smear laid back over the disc it came from - brightest
// where the bright centre spills across the dim limb. Measured with the pass toggled off
// and everything else held: it was adding ~0.6 of linear red at the limb, against the
// surface's own 0.53 there. More than the sun. That is what filled the limb darkening back
// in, and it is what the earlier rounds kept attributing to Bloom - which, measured the
// same way, was contributing nothing at all at its 0.94 threshold.
//
// It also washed the whole sky: with the pass off the corners go from warm brown haze to
// deep indigo. RULING 2 stands and the mount logic is untouched - a shaft when the sun
// crosses frame is still composition. It just no longer outshines the star.
export const GODRAY_WEIGHT = 0.05;

// Bloom thresholds and strengths; the reasoning for these values lives at the call site.
export const BLOOM_FOCUSED_WORLD_INTENSITY = 0.34;
export const BLOOM_SOLAR_OVERVIEW_INTENSITY = 0.5;
export const BLOOM_OUTSIDE_SOLAR_ACT_INTENSITY = 0.5;
export const BLOOM_FOCUSED_WORLD_LUMINANCE_THRESHOLD = 0.86;
export const BLOOM_SOLAR_OVERVIEW_LUMINANCE_THRESHOLD = 0.33;
export const BLOOM_OUTSIDE_SOLAR_ACT_LUMINANCE_THRESHOLD = 0;
export const BLOOM_SOLAR_LUMINANCE_SMOOTHING = 0.22;
export const BLOOM_OUTSIDE_SOLAR_ACT_LUMINANCE_SMOOTHING = 0;
