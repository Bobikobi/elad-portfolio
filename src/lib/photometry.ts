/**
 * Scene-light photometry constants. This module is the only place scene light constants
 * may live, and it exports values only.
 */

/** Low ambient fill that keeps unlit surfaces from falling completely black. */
export const AMBIENT_FILL_INTENSITY = 0.06;

// Linear material-colour multipliers: real geometric albedo divided by each texture's
// linear mean, from the P3 measurements in docs/briefs/PHOTOMETRY-megaplan.md.
export const MERCURY_ALBEDO_MULTIPLIER = 0.60;
// Venus 2.76 -> 1.40 (stage feat/venus-burnt-white; P4-3 bar <= 958 burnt px on the overview).
// Local sweep, p3-albedo + p4-chroma, real GPU, burnt-in-all-channels pixels of 2,081: 2.76 -> 1,483,
// 2.2 -> 1,294, 1.8 -> 1,108, 1.4 -> 855. P3-3 (Venus still brightest) holds at every value tried.
// It is no longer the measured real albedo: the overview clips because compressed orbits put her
// 2.55 units from the sun, and the albedo is the only lever the rolloff work left.
export const VENUS_ALBEDO_MULTIPLIER = 1.40;
export const EARTH_ALBEDO_MULTIPLIER = 2.17;
export const MARS_ALBEDO_MULTIPLIER = 0.75;
export const JUPITER_ALBEDO_MULTIPLIER = 1.45;
export const SATURN_ALBEDO_MULTIPLIER = 0.90;
export const URANUS_ALBEDO_MULTIPLIER = 0.89;
export const NEPTUNE_ALBEDO_MULTIPLIER = 4.38;

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
// Saturn re-measured (?orbitexp sweep, /projects, 1440x900, real GPU, preview of PR #43, disc from
// ?ringprobe, 95% of R; 0.68 measured twice: 141.8 / 142.0): 0.68 -> mean 142 p99 248, 0.45 -> 131 / 243,
// 0.3 -> 118 / 236, 1.0 -> 151 / 251; clipped >=250 is 0% throughout. 0.68 sat above the 90-135 band the
// other worlds were held to; 0.45 is the smallest cut that lands inside it and keeps shoulder headroom.
// Mars re-measured over one full turn (24 longitudes, ?orbitexp sweep, preview of PR #43): clipped share
// of the disc, worst longitude 297.9 deg, 0.92 -> 11.10% (mean lum 115-164), 0.75 -> 3.55%, 0.6 -> 0.001%
// (mean lum 96-148, average 121, inside the 90-135 band). 0.6 is the first value with 23 of 24 longitudes clean.
// The string index signature permits an unmapped focus; CameraRig owns its neutral fallback.
export const ORBIT_APERTURE: Record<string, number> = { earth: 0.45, mars: 0.6, jupiter: 0.50, saturn: 0.45, belt: 0.66 };

/** Renderer aperture before a world is selected and after departure from one. */
export const NEUTRAL_APERTURE = 1;

// Sun lamp: the system's single light source.
// B3: the starlight was #ffd9a0 - linear (1.00, 0.69, 0.35), i.e. it delivers
// three times as much red as blue. On a body that is already red, Mars, the red
// channel saturated while blue never got off the floor: that is what "neon
// yellow" was made of. A G star is close to white; the gold identity of this
// system comes from the sun's own emissive surface and its bloom, both of which
// are toneMapped:false and untouched by this.
export const SUN_LAMP_INTENSITY = 200;
export const SUN_LAMP_DISTANCE = 90;
/** Lamp scale while no world is focused (the overview). Exposure cannot do this job: the ACES
 *  shoulder moved lit faces only ~9 levels for a 0.6 aperture, so the light itself is scaled. */
// Local sweep, overview lit-face mean (Uranus / Saturn / Mars / Earth / Neptune): 1.0 -> 212/239/222/136/101,
// 0.5 -> 189/227/181/98/91, 0.25 -> 133/203/127/76/68. Neptune stays over P3-2's 60 floor.
// Elad judged 0.25 still a bit bright and 0.18 / 0.12 too dark side by side (?lamp=, 2026-09-26);
// 0.21 chosen by eye. Neptune was not re-measured at 0.21 and may sit just under the 60 floor.
export const SUN_LAMP_OVERVIEW_SCALE = 0.21;
// P3 change 2, and a DELIBERATE DEPARTURE FROM PHYSICS under RULING 3 (2026-08-17):
// the owner ruled that appearance beats physical accuracy where the two collide.
//
// Physical inverse-square is decay 2. It is dropped to 1.3 so the outer system stays
// visible - Saturn is the Projects planet and real albedo alone drops it from 0.48 to
// 0.20 relative to Earth. Softening the falloff is what recovers it, and it is also what
// stops Venus from being 2.7x Earth's brightness.
//
// This is defensible rather than sloppy because the geometry was never real either: the
// orbits are compressed about 30:1, and Venus sits 1.7 solar radii out where the true
// value is 78. Inverse-square over a fictional layout is not physics, it is a coincidence
// that looked plausible. One number, one line, reversible - set it back to 2 and the
// system is physically faithful and unreadable again.
export const SUN_LAMP_DECAY = 1.3;

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
