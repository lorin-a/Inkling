// The finish engine — the cross-cutting *finish* that rides across moodboard
// imagery (grain / Riso / duotone / halftone). A finish is NOT a peer dimension
// or an abstract swatch; it lives on the image block (per-image, default none)
// so each reference can read true or be stylized on its own. Duotone/Riso inks
// default from the project palette so the finish traces back to your taste.
//
// All effects are static CSS/SVG (feTurbulence noise + a duotone colour map),
// so they're export-safe and untouched by prefers-reduced-motion.

export const FINISHES = [
  { key: "none", label: "None", inks: false, grain: false },
  { key: "riso", label: "Riso", inks: true, grain: true },
  { key: "grain", label: "Grain", inks: false, grain: true },
  { key: "duotone", label: "Duotone", inks: true, grain: false },
  { key: "halftone", label: "Halftone", inks: false, grain: false },
  { key: "bw", label: "B&W", inks: false, grain: false },
];

export const finishMeta = (key) => FINISHES.find((f) => f.key === key) || FINISHES[0];
export const finishUsesInks = (key) => finishMeta(key).inks;
export const finishUsesGrain = (key) => finishMeta(key).grain;

export const DEFAULT_INTENSITY = 0.8;
// Neutral ink/paper used when the project palette can't supply a pair.
export const FALLBACK_SHADOW = "#1d1a17";
export const FALLBACK_LIGHT = "#f4efe4";

// A finish object with sensible defaults filled in (ink pair derived from a
// palette when the finish needs one). type === "none" returns null = clean.
export function withDefaults(type, prev = {}, palette = []) {
  if (!type || type === "none") return null;
  const next = {
    type,
    intensity: prev.intensity ?? DEFAULT_INTENSITY,
  };
  if (finishUsesInks(type)) {
    const [s, l] = deriveInks(palette);
    next.shadow = prev.shadow || s;
    next.light = prev.light || l;
  }
  return next;
}

// Hex → {r,g,b} 0..255. Tolerates #rgb / #rrggbb, returns black on garbage.
export function hexToRgb(hex) {
  if (typeof hex !== "string") return { r: 0, g: 0, b: 0 };
  let h = hex.replace("#", "").trim();
  if (h.length === 3) h = h.split("").map((c) => c + c).join("");
  if (h.length !== 6) return { r: 0, g: 0, b: 0 };
  const n = parseInt(h, 16);
  return { r: (n >> 16) & 255, g: (n >> 8) & 255, b: n & 255 };
}

// Relative luminance (sRGB-weighted, gamma-naive — good enough for sorting).
export function luminance(hex) {
  const { r, g, b } = hexToRgb(hex);
  return (0.2126 * r + 0.7152 * g + 0.0722 * b) / 255;
}

// Chroma 0..1 (max−min channel) — how colourful, regardless of light/dark.
export function chroma(hex) {
  const { r, g, b } = hexToRgb(hex);
  return (Math.max(r, g, b) - Math.min(r, g, b)) / 255;
}

// A duotone ink pair from the palette: a light "paper" highlight (lightest
// colour) and a dark "ink" shadow. The shadow prefers the most *chromatic* dark
// colour so the duotone reads as two colours rather than collapsing to grayscale
// — falling back to the plain darkest when the palette's darks are all neutral.
// Falls back to neutral ink/paper when the palette is too thin.
export function deriveInks(palette = []) {
  const hexes = (palette || []).filter((c) => typeof c === "string" && c.startsWith("#"));
  if (hexes.length < 2) return [FALLBACK_SHADOW, FALLBACK_LIGHT];
  const scored = hexes.map((h) => ({ h, L: luminance(h), C: chroma(h) }));
  const light = scored.reduce((a, b) => (b.L > a.L ? b : a)).h;
  const darkest = scored.reduce((a, b) => (b.L < a.L ? b : a)).h;
  const darks = scored.filter((s) => s.L < 0.5).sort((a, b) => b.C - a.C);
  const shadow = darks[0] && darks[0].C >= 0.12 ? darks[0].h : darkest;
  return [shadow, light];
}

// feColorMatrix luminance row, then feComponentTransfer tableValues that map
// luminance 0 → shadow ink, 1 → light ink. Returns the 0..1 channel stops.
export function duotoneStops(shadow, light) {
  const s = hexToRgb(shadow);
  const l = hexToRgb(light);
  return {
    r: [s.r / 255, l.r / 255],
    g: [s.g / 255, l.g / 255],
    b: [s.b / 255, l.b / 255],
  };
}

// A tiling grain tile as an SVG data URL. `riso` swaps to chunkier turbulence
// so the Riso finish reads grittier than plain film grain.
const svgUrl = (svg) => `url("data:image/svg+xml;charset=utf-8,${encodeURIComponent(svg)}")`;
export const GRAIN_URL = svgUrl(
  `<svg xmlns='http://www.w3.org/2000/svg' width='180' height='180'><filter id='g'><feTurbulence type='fractalNoise' baseFrequency='0.85' numOctaves='2' stitchTiles='stitch'/></filter><rect width='100%' height='100%' filter='url(#g)'/></svg>`
);
export const RISO_GRAIN_URL = svgUrl(
  `<svg xmlns='http://www.w3.org/2000/svg' width='220' height='220'><filter id='r'><feTurbulence type='turbulence' baseFrequency='0.55' numOctaves='2' stitchTiles='stitch'/></filter><rect width='100%' height='100%' filter='url(#r)'/></svg>`
);
