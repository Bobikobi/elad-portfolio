/** Ambient fill intensity; this module is the only place scene light constants may live. */
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
