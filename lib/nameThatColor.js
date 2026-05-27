import { NTC_NAMES } from "./ntcNames";

/**
 * Name That Color — gives any hex a human name ("Burnt Sienna", "Periwinkle").
 *
 * Faithful port of Chirag Mehta’s ntc matching (http://chir.ag/projects/ntc),
 * CC-BY 2.5: nearest color by combined RGB + HSL distance (HSL weighted ×2),
 * with all channels scaled to 0–255 as the original does. Attribution is kept
 * in ntcNames.js and surfaced on /resources.
 *
 * The names list is precomputed once; per-hex results are memoized.
 */

function rgbOf(hex) {
  return [
    parseInt(hex.slice(0, 2), 16),
    parseInt(hex.slice(2, 4), 16),
    parseInt(hex.slice(4, 6), 16),
  ];
}

// HSL with hue/sat/lum each scaled to 0–255, matching ntc’s distance space.
function hslOf([r255, g255, b255]) {
  const r = r255 / 255, g = g255 / 255, b = b255 / 255;
  const min = Math.min(r, g, b);
  const max = Math.max(r, g, b);
  const delta = max - min;
  const l = (min + max) / 2;
  let s = 0;
  if (l > 0 && l < 1) s = delta / (l < 0.5 ? 2 * l : 2 - 2 * l);
  let h = 0;
  if (delta > 0) {
    if (max === r && max !== g) h += (g - b) / delta;
    if (max === g && max !== b) h += 2 + (b - r) / delta;
    if (max === b && max !== r) h += 4 + (r - g) / delta;
    h /= 6;
  }
  return [Math.round(h * 255), Math.round(s * 255), Math.round(l * 255)];
}

// Precompute [hex, name, r, g, b, h, s, l] once.
let TABLE = null;
function table() {
  if (TABLE) return TABLE;
  TABLE = NTC_NAMES.map(([hex, name]) => {
    const rgb = rgbOf(hex);
    const hsl = hslOf(rgb);
    return { hex, name, rgb, hsl };
  });
  return TABLE;
}

function normalizeHex(input) {
  let c = String(input || "").trim().replace(/^#/, "").toUpperCase();
  if (c.length === 3) c = c.split("").map((ch) => ch + ch).join("");
  return /^[0-9A-F]{6}$/.test(c) ? c : null;
}

const cache = new Map();

/**
 * @param {string} hexInput  any hex ("#6195ED", "6195ed", "#abc")
 * @returns {{ name, hex, exact }}  closest named color; exact === true on a
 *          direct match. Returns null name for an unparseable input.
 */
export function colorName(hexInput) {
  const hex = normalizeHex(hexInput);
  if (!hex) return { name: null, hex: null, exact: false };
  if (cache.has(hex)) return cache.get(hex);

  const [r, g, b] = rgbOf(hex);
  const [h, s, l] = hslOf([r, g, b]);
  let best = null;
  let bestDf = Infinity;
  for (const t of table()) {
    if (t.hex === hex) { best = t; bestDf = -1; break; }
    const ndf1 = (r - t.rgb[0]) ** 2 + (g - t.rgb[1]) ** 2 + (b - t.rgb[2]) ** 2;
    const ndf2 = (h - t.hsl[0]) ** 2 + (s - t.hsl[1]) ** 2 + (l - t.hsl[2]) ** 2;
    const ndf = ndf1 + ndf2 * 2;
    if (ndf < bestDf) { bestDf = ndf; best = t; }
  }
  const result = { name: best.name, hex: `#${best.hex}`, exact: bestDf === -1 };
  cache.set(hex, result);
  return result;
}
