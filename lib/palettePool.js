import palette from "../data/palette.json";

function hexToRgb(hex) {
  const h = hex.replace("#", "");
  return {
    r: parseInt(h.slice(0, 2), 16),
    g: parseInt(h.slice(2, 4), 16),
    b: parseInt(h.slice(4, 6), 16),
  };
}

function distSq(a, b) {
  return (a.r - b.r) ** 2 + (a.g - b.g) ** 2 + (a.b - b.b) ** 2;
}

export function dedupe(hexes, tolerance = 8) {
  const seen = [];
  const t2 = tolerance * tolerance * 3;
  for (const h of hexes) {
    const rgb = hexToRgb(h);
    const match = seen.find((s) => distSq(s.rgb, rgb) <= t2);
    if (!match) seen.push({ hex: h.toLowerCase(), rgb });
  }
  return seen.map((s) => s.hex);
}

export const brandSwatches = Object.values(palette.brand);
export const sourcePool = palette.inspiration.source ?? palette.inspiration.master ?? [];
export const curatedGroups = palette.inspiration.curated;

export const allUnique = dedupe([
  ...brandSwatches,
  ...sourcePool,
  ...Object.values(curatedGroups).flat(),
]);

export const POOLS = {
  inspiration: sourcePool,
  brand: brandSwatches,
  curated: dedupe(Object.values(curatedGroups).flat()),
  all: allUnique,
};

export const POOL_LABELS = {
  inspiration: "Inspiration grid",
  brand: "Whelm brand",
  curated: "Curated pairings",
  all: "All unique",
};

export function relativeLuminance(hex) {
  const { r, g, b } = hexToRgb(hex);
  const toLin = (v) => {
    const s = v / 255;
    return s <= 0.03928 ? s / 12.92 : Math.pow((s + 0.055) / 1.055, 2.4);
  };
  return 0.2126 * toLin(r) + 0.7152 * toLin(g) + 0.0722 * toLin(b);
}

export function contrastRatio(a, b) {
  const la = relativeLuminance(a);
  const lb = relativeLuminance(b);
  const [hi, lo] = la > lb ? [la, lb] : [lb, la];
  return (hi + 0.05) / (lo + 0.05);
}

/**
 * Pick N distinct-feeling colors from a pool. Tries to spread by luminance
 * so the resulting palette has hierarchy (a darkest, a lightest, things in
 * between) rather than five mid-tones blurring together.
 */
export function sampleSpread(pool, n) {
  if (pool.length === 0) return [];
  if (n >= pool.length) return shuffle(pool);
  // Random seed swatch
  const start = pool[Math.floor(Math.random() * pool.length)];
  const picked = [start];
  while (picked.length < n) {
    let best = null;
    let bestDist = -1;
    // Pick the swatch in pool with max min-distance (in luminance + hue space) to picked
    for (const cand of pool) {
      if (picked.includes(cand)) continue;
      const d = minDistance(cand, picked);
      if (d > bestDist) {
        bestDist = d;
        best = cand;
      }
    }
    if (!best) break;
    picked.push(best);
  }
  return picked;
}

function minDistance(c, set) {
  const a = hexToRgb(c);
  let min = Infinity;
  for (const other of set) {
    const b = hexToRgb(other);
    const d = (a.r - b.r) ** 2 + (a.g - b.g) ** 2 + (a.b - b.b) ** 2;
    if (d < min) min = d;
  }
  return min;
}

export function shuffle(arr) {
  const out = arr.slice();
  for (let i = out.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [out[i], out[j]] = [out[j], out[i]];
  }
  return out;
}
