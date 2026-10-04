// The galaxy act's disc (Galaxy.tsx): a photograph of M101 laid on the disc plane, and a
// star field drawn from that photograph that takes its light over as the dive goes down.
// GLSL kept as template strings so no bundler/glslify config is needed (CSP-safe).

/**
 * The photograph is display-referred: what the camera recorded, already tone-mapped by the
 * people who made the picture. The scene is scene-referred and the post chain ends in an ACES
 * fit (ExposureToneMap, exposure 1 in this act), so drawing the photo's values straight into
 * it would put the image through a second tone curve - a faded core, grey arms. This is that
 * fit run backwards: the light that displays as the photograph. Arms come back at about 0.12,
 * the nucleus at about 5.5, which is what lets the bloom find the core and not the arms.
 * The top of the curve is clipped at 0.97, where the inverse runs off to infinity.
 *
 * Black comes back as 0.00195, not 0: the fit has a toe that crushes everything below that
 * to 0 on screen. Drawn additively, that toe would lay a faint square over the sky (the whole
 * plane, corners included) and give every black cell of the photo a tenth of an arm's star
 * density in Galaxy.tsx. So it is taken off, and photo black adds nothing.
 * Galaxy.tsx carries a JS twin of this function (`invAces`) - change the two together.
 */
const inverseAces = /* glsl */ `
  uniform mat3 uMinInv;
  uniform mat3 uMoutInv;
  vec3 invRRT(vec3 y) {
    vec3 A = 1.0 - 0.983729 * y;
    vec3 B = 0.0245786 - 0.432951 * y;
    vec3 C = -(0.000090537 + 0.238081 * y);
    return (-B + sqrt(max(B * B - 4.0 * A * C, 0.0))) / (2.0 * A);
  }
  vec3 invACES(vec3 d) {
    vec3 c = clamp(uMoutInv * min(d, vec3(0.97)), 0.0, 0.99);
    // uMinInv maps grey to the same grey (each row of the forward matrix sums to 1), so the
    // toe is the same scalar on every channel.
    return max(uMinInv * invRRT(c) - invRRT(vec3(0.0)).x, 0.0) * 0.6;
  }
`;

export const discVertexShader = /* glsl */ `
  varying vec2 vUv;
  varying vec3 vWorld;
  void main() {
    vUv = uv;
    vec4 w = modelMatrix * vec4(position, 1.0);
    vWorld = w.xyz;
    gl_Position = projectionMatrix * viewMatrix * w;
  }
`;

export const discFragmentShader = /* glsl */ `
  uniform sampler2D uMap;
  uniform float uGain;
  varying vec2 vUv;
  varying vec3 vWorld;
  ${inverseAces}
  void main() {
    // The disc lies in y = 0 and only ever turns about y. Seen edge-on a photograph is a sheet
    // of paper, so it fades as the line of sight flattens onto it; the stars, which have
    // depth, are what the eye has there.
    vec3 v = vWorld - cameraPosition;
    float graze = smoothstep(0.06, 0.22, abs(v.y) / length(v));
    gl_FragColor = vec4(invACES(texture2D(uMap, vUv).rgb) * (uGain * graze), 1.0);
  }
`;

/**
 * Every star is a Gaussian carrying a fixed amount of light, its ENERGY: the sum over the
 * pixels it lands on is that energy times the square of the pixels-per-unit at its depth,
 * the same law a patch of the photograph follows. That is what lets the two layers trade
 * light without the disc brightening or dimming as the dive hands it from one to the other.
 *
 * - At least half a pixel wide: from there on a sampled Gaussian sums to its energy within
 *   about 3% wherever it falls on the pixel grid, so a far star neither twinkles with sub-pixel
 *   motion nor loses light to the raster. A fixed sprite profile does not: its sum is 1.0 at
 *   one pixel, 0.12 at two and 1.2 at three.
 * - No pixel of one star brighter than uPeak: past it the star grows instead, keeping its
 *   energy, so a star passing the lens is a soft blob and not a white spark that blooms.
 * - No wider than uSigmaMax: past that the energy is let go. Only stars within about a unit of
 *   the camera reach it.
 */
export const starVertexShader = /* glsl */ `
  uniform float uFocal;
  uniform float uEnergy;
  uniform float uSigma;
  uniform float uPeak;
  uniform float uSigmaMax;

  attribute vec3 aColor;
  attribute float aScale;

  varying vec3 vColor;
  varying float vSigma;
  varying float vSize;

  void main() {
    vec4 viewPosition = viewMatrix * modelMatrix * vec4(position, 1.0);
    gl_Position = projectionMatrix * viewPosition;

    float z = max(-viewPosition.z, 1e-3);
    float s = uFocal / z;
    vec3 light = aColor * (uEnergy * s * s);
    float lum = dot(light, vec3(0.2126, 0.7152, 0.0722));
    float sigma = max(max(0.5, uSigma * aScale * s), sqrt(lum / (6.2831853 * uPeak)));
    sigma = min(sigma, uSigmaMax);
    vec3 peak = light / (6.2831853 * sigma * sigma);
    peak *= min(1.0, uPeak / max(dot(peak, vec3(0.2126, 0.7152, 0.0722)), 1e-9));

    // Only the stars right at the lens go, so the rest stream PAST the camera on the dive
    // instead of vanishing ahead of it.
    vColor = peak * smoothstep(0.15, 0.7, z);
    vSigma = sigma;
    vSize = ceil(6.0 * sigma);
    gl_PointSize = vSize;
  }
`;

export const starFragmentShader = /* glsl */ `
  varying vec3 vColor;
  varying float vSigma;
  varying float vSize;

  void main() {
    vec2 p = (gl_PointCoord - 0.5) * vSize;
    gl_FragColor = vec4(vColor * exp(-dot(p, p) / (2.0 * vSigma * vSigma)), 1.0);
  }
`;
