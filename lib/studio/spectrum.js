import { oklchFromHex, deltaEOK, hexFromOklch } from "../colorTheory";

/**
 * The aggregate spectrum — "what you keep reaching for" (playtest Q7).
 *
 * Every reference already carries an extracted palette. On their own those are
 * 250 unrelated strips; pooled and clustered they are the one thing the user
 * gathered on instinct over months and has never once seen: the colours that
 * actually recur across their whole taste.
 *
 * Greedy nearest-cluster in OKLab (perceptual, so "two dusty roses" merge and
 * "rose vs brick" do not). Deliberately NOT a k-means — cluster count is an
 * output here, not an input, because the honest question is "how many colours
 * does this person keep returning to", and picking k would answer it for them.
 */

// Perceptual merge radius. Tuned so near-identical neutrals collapse while
// distinguishable hues stay apart.
const MERGE = 0.075;

function mean(list) {
  return list.reduce((a, b) => a + b, 0) / list.length;
}

// Circular mean — hue 358° and 2° average to 0°, not 180°.
function meanHue(degs) {
  const x = mean(degs.map((d) => Math.cos((d * Math.PI) / 180)));
  const y = mean(degs.map((d) => Math.sin((d * Math.PI) / 180)));
  const h = (Math.atan2(y, x) * 180) / Math.PI;
  return (h + 360) % 360;
}

/**
 * @param {Array<{palette?: string[]}>} pins
 * @returns {{ bands: Array<{hex,count,share,members:string[]}>, total: number }}
 */
export function aggregateSpectrum(pins) {
  const swatches = [];
  for (const pin of pins) {
    const pal = Array.isArray(pin?.palette) ? pin.palette : [];
    for (const hex of pal) {
      if (typeof hex === "string" && /^#[0-9a-f]{6}$/i.test(hex)) swatches.push(hex.toLowerCase());
    }
  }
  if (!swatches.length) return { bands: [], total: 0 };

  const clusters = [];
  for (const hex of swatches) {
    let best = null;
    let bestD = Infinity;
    for (const c of clusters) {
      const d = deltaEOK(hex, c.seed);
      if (d < bestD) { bestD = d; best = c; }
    }
    if (best && bestD < MERGE) best.members.push(hex);
    else clusters.push({ seed: hex, members: [hex] });
  }

  // Re-centre each cluster on the perceptual average of its members, so the
  // band shown is the colour the user actually keeps reaching for, not whichever
  // swatch happened to arrive first.
  const bands = clusters.map((c) => {
    const lch = c.members.map(oklchFromHex);
    const centre = {
      L: mean(lch.map((v) => v.L)),
      C: mean(lch.map((v) => v.C)),
      h: meanHue(lch.map((v) => v.h)),
    };
    return {
      hex: hexFromOklch(centre),
      count: c.members.length,
      share: c.members.length / swatches.length,
      // Chroma is carried out so the reading can separate ground from figure:
      // photographs are mostly paper, skin and shadow, and left unsplit those
      // neutrals bury the hues the person actually reaches for.
      chroma: centre.C,
      lightness: centre.L,
      members: c.members,
    };
  });

  bands.sort((a, b) => b.count - a.count);
  return { bands, total: swatches.length };
}
