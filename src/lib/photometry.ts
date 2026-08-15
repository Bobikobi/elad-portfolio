/**
 * Scene-light photometry constants. This module is the only place scene light constants
 * may live, and it exports values only.
 */

/** Low ambient fill that keeps unlit surfaces from falling completely black. */
export const AMBIENT_FILL_INTENSITY = 0.06;

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
