// Procedural spiral-galaxy point shaders (Bruno Simon "animated galaxy" style).
// GLSL kept as template strings so no bundler/glslify config is needed (CSP-safe).

export const galaxyVertexShader = /* glsl */ `
  uniform float uTime;
  uniform float uSize;
  uniform float uPixelRatio;

  attribute float aScale;
  attribute vec3 aRandomness;
  attribute vec3 aColor;
  attribute float aDim;

  varying vec3 vColor;
  varying float vDistanceFade;
  varying float vAlpha;

  void main() {
    vec4 modelPosition = modelMatrix * vec4(position, 1.0);

    float angle = atan(modelPosition.x, modelPosition.z);
    float radius = length(modelPosition.xz);

    // Dim each core star so the dense center accumulates into a soft gold glow
    // under additive blending instead of clipping to white.
    // aDim carries the dust lanes and the rim fade, both decided once on the CPU.
    vAlpha = mix(0.35, 0.9, smoothstep(0.0, 3.5, radius)) * aDim;

    // GALAXY-REST: the spin was differential - angular velocity ~ 1/radius, which is the right
    // law for an individual STAR and the wrong one for the arm pattern. Applied to the pattern
    // it winds the arms up: across the annulus that holds them it accumulates 9.7 radians of
    // shear in under two minutes. Measured on the deployed build, between 27 and 110 seconds the
    // two-arm signal in the mid disc fell from 0.494 to 0.286, while out at radius 3-4 the
    // FOUR-fold signal rose from 0.024 to 0.139 - arms shearing into rings, in both numbers at
    // once. The galaxy does that while the visitor watches - the exact thing this stage exists to
    // remove,
    // which means fixing the first frame fixed nothing. This is the winding problem, and real
    // spirals answer it the same way: the arms are a density wave whose PATTERN turns at one
    // speed at every radius, so the shape is permanent. The bulge is a symmetric blob and loses
    // nothing by turning at the same rate as the disc.
    float angleOffset = uTime * 0.045;
    angle += angleOffset;
    modelPosition.x = sin(angle) * radius;
    modelPosition.z = cos(angle) * radius;

    // Per-star scatter.
    modelPosition.xyz += aRandomness;

    vec4 viewPosition = viewMatrix * modelPosition;
    gl_Position = projectionMatrix * viewPosition;

    // Perspective-correct point size, clamped so a close star can't blanket the frame.
    float size = uSize * aScale * uPixelRatio * (1.0 / -viewPosition.z);
    gl_PointSize = clamp(size, 0.5, 9.0 * uPixelRatio);

    // Only fade stars extremely close to the lens (so they whoosh PAST the camera
    // during the dive instead of vanishing far ahead).
    vDistanceFade = smoothstep(0.15, 0.7, -viewPosition.z);
    vColor = aColor;
  }
`;

export const galaxyFragmentShader = /* glsl */ `
  varying vec3 vColor;
  varying float vDistanceFade;
  varying float vAlpha;

  void main() {
    // Soft round glow point.
    float d = distance(gl_PointCoord, vec2(0.5));
    float strength = 1.0 - smoothstep(0.0, 0.5, d);
    strength = pow(strength, 2.2);

    // vAlpha dims dense core stars so the center reads as a gold glow, not white.
    gl_FragColor = vec4(vColor, strength * vDistanceFade * vAlpha);
  }
`;
