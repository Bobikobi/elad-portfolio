/**
 * The "E.S" wordmark, as an outline rather than a font.
 *
 * Glamora was a 64.3 KB OpenType file, fetched on every page in every locale, and used
 * for exactly one string in exactly two places - this component's previous form. Three
 * glyphs do not justify a webfont: the path below is those same glyphs, extracted from
 * GLAMORA.otf with fontTools, so the shapes are the font's own and not a redrawing.
 *
 * Geometry comes straight from the source font (unitsPerEm 1000):
 *   advance width  1214 units = 1.214em, including Tailwind's `tracking-wide` (0.025em)
 *                  between the characters
 *   ink bounds     x 38..1214, y -210..629
 * The viewBox is those ink bounds, and the height is set in `em`, so the mark scales with
 * whatever font-size the surrounding text uses - `text-3xl` in the navbar, `text-xl` in
 * the footer - exactly as the text did.
 *
 * One deliberate difference: Glamora ships a single weight (usWeightClass 400), so the
 * old `font-bold` was SYNTHETIC bold - the browser smearing the outline. This renders the
 * true outline instead. See docs/briefs/s6-wordmark-verify.md for the before/after frames.
 */
const PATH =
  'M492.0 -40.0 483.0 -39.0C474.0 -125.0 402.0 -191.0 315.0 -191.0H313.0C235.0 -191.0 171.0 -127.0 171.0 -49.0V225.0C171.0 229.0 172.0 232.0 173.0 235.0C178.0 253.0 190.0 269.0 210.0 269.0C235.0 269.0 284.0 236.0 284.0 236.0C308.0 221.0 330.0 216.0 349.0 216.0C409.0 216.0 443.0 271.0 443.0 271.0L436.0 276.0C436.0 276.0 417.0 247.0 379.0 247.0C362.0 247.0 340.0 254.0 314.0 272.0C286.0 292.0 263.0 299.0 243.0 299.0C194.0 299.0 172.0 253.0 171.0 252.0V620.0H313.0C399.0 620.0 472.0 554.0 480.0 468.0L489.0 469.0L473.0 629.0H38.0V620.0C49.0 620.0 60.0 615.0 68.0 607.0C75.0 600.0 80.0 589.0 80.0 578.0V6.0C80.0 -108.0 172.0 -200.0 286.0 -200.0H476.0ZM600.0 -109.0C575.0 -109.0 555.0 -129.0 555.0 -155.0C555.0 -180.0 575.0 -200.0 600.0 -200.0C625.0 -200.0 645.0 -180.0 645.0 -155.0C645.0 -129.0 625.0 -109.0 600.0 -109.0ZM1113.0 210.0C1113.0 210.0 849.0 406.0 845.0 410.0C811.0 441.0 795.0 476.0 795.0 509.0C795.0 568.0 846.0 619.0 933.0 620.0H946.0C1043.0 620.0 1130.0 554.0 1140.0 468.0L1150.0 469.0L1132.0 629.0H935.0C930.0 629.0 925.0 629.0 920.0 628.0C799.0 622.0 711.0 555.0 711.0 470.0C711.0 420.0 741.0 365.0 813.0 311.0L1050.0 128.0C1060.0 122.0 1069.0 115.0 1078.0 108.0C1118.0 78.0 1136.0 33.0 1136.0 -12.0C1136.0 -104.0 1064.0 -200.0 950.0 -200.0C844.0 -200.0 789.0 -120.0 789.0 -43.0C789.0 -32.0 791.0 -20.0 793.0 -9.0C810.0 69.0 874.0 79.0 886.0 123.0C887.0 128.0 888.0 133.0 888.0 137.0C888.0 167.0 864.0 187.0 847.0 198.0L837.0 187.0C837.0 187.0 866.0 168.0 866.0 150.0C866.0 141.0 859.0 133.0 841.0 126.0C807.0 113.0 731.0 97.0 711.0 13.0C709.0 2.0 707.0 -9.0 707.0 -21.0C707.0 -103.0 768.0 -210.0 941.0 -210.0C1061.0 -210.0 1160.0 -141.0 1192.0 -65.0C1205.0 -33.0 1214.0 0.0 1214.0 34.0C1214.0 93.0 1187.0 154.0 1113.0 210.0Z';

/**
 * The box, in font units. Width is the ADVANCE box, not the ink box: advances
 * 492+128+544 = 1164, plus `tracking-wide` (25 units) after each of the three characters
 * = 1239. That is exactly the 37.17px the old span measured at `text-3xl`, so replacing
 * the text with this mark moves nothing around it. Using the tight ink box instead would
 * have shifted the logo about a pixel left.
 */
const X = 0;
const Y = -629; // SVG y is flipped, so the top of the ink is -yMax
const W = 1239;
const H = 839; // 629 - (-210)

export default function Wordmark({ className = '' }: { className?: string }) {
  return (
    <svg
      viewBox={`${X} ${Y} ${W} ${H}`}
      // Height in em keeps the mark tied to the surrounding font-size, exactly as the
      // text was. width:auto lets the aspect ratio hold it to the right proportion.
      style={{ height: `${H / 1000}em`, width: 'auto' }}
      className={className}
      role="img"
      aria-label="E.S"
      focusable="false"
    >
      {/* The path is stored baseline-up (font orientation); flip it into SVG space. */}
      <path d={PATH} fill="currentColor" transform="scale(1,-1)" />
    </svg>
  );
}
