/**
 * Color theory primitives. Pure functions, no state.
 *
 * Conversions follow Björn Ottosson's OKLab spec — perceptually uniform
 * lightness and chroma, so "this looks brighter than that" matches the
 * math. Contrast ratios use WCAG 2.x relative luminance.
 */

const PI2 = Math.PI * 2;

export function hexToRgb(hex) {
  const h = hex.replace("#", "");
  return {
    r: parseInt(h.slice(0, 2), 16),
    g: parseInt(h.slice(2, 4), 16),
    b: parseInt(h.slice(4, 6), 16),
  };
}

export function rgbToHex({ r, g, b }) {
  const clamp = (v) => Math.max(0, Math.min(255, Math.round(v)));
  return (
    "#" +
    [clamp(r), clamp(g), clamp(b)]
      .map((v) => v.toString(16).padStart(2, "0"))
      .join("")
  );
}

function srgbToLinear(c) {
  const x = c / 255;
  return x <= 0.04045 ? x / 12.92 : Math.pow((x + 0.055) / 1.055, 2.4);
}

function linearToSrgb(x) {
  const c = x <= 0.0031308 ? 12.92 * x : 1.055 * Math.pow(x, 1 / 2.4) - 0.055;
  return c * 255;
}

/** sRGB → OKLab → OKLCH. h in degrees [0, 360). */
export function rgbToOklch({ r, g, b }) {
  const lr = srgbToLinear(r);
  const lg = srgbToLinear(g);
  const lb = srgbToLinear(b);

  const l = 0.4122214708 * lr + 0.5363325363 * lg + 0.0514459929 * lb;
  const m = 0.2119034982 * lr + 0.6806995451 * lg + 0.1073969566 * lb;
  const s = 0.0883024619 * lr + 0.2817188376 * lg + 0.6299787005 * lb;

  const lp = Math.cbrt(l);
  const mp = Math.cbrt(m);
  const sp = Math.cbrt(s);

  const L = 0.2104542553 * lp + 0.7936177850 * mp - 0.0040720468 * sp;
  const a = 1.9779984951 * lp - 2.4285922050 * mp + 0.4505937099 * sp;
  const b_ = 0.0259040371 * lp + 0.7827717662 * mp - 0.8086757660 * sp;

  const C = Math.sqrt(a * a + b_ * b_);
  let h = (Math.atan2(b_, a) * 180) / Math.PI;
  if (h < 0) h += 360;

  return { L, C, h };
}

export function oklchFromHex(hex) {
  return rgbToOklch(hexToRgb(hex));
}

/** OKLCH → OKLab → linear sRGB → sRGB. */
export function oklchToRgb({ L, C, h }) {
  const hr = (h * Math.PI) / 180;
  const a = C * Math.cos(hr);
  const b_ = C * Math.sin(hr);

  const lp = L + 0.3963377774 * a + 0.2158037573 * b_;
  const mp = L - 0.1055613458 * a - 0.0638541728 * b_;
  const sp = L - 0.0894841775 * a - 1.2914855480 * b_;

  const lLin = lp * lp * lp;
  const mLin = mp * mp * mp;
  const sLin = sp * sp * sp;

  const r = +4.0767416621 * lLin - 3.3077115913 * mLin + 0.2309699292 * sLin;
  const g = -1.2684380046 * lLin + 2.6097574011 * mLin - 0.3413193965 * sLin;
  const b = -0.0041960863 * lLin - 0.7034186147 * mLin + 1.7076147010 * sLin;

  return {
    r: linearToSrgb(r),
    g: linearToSrgb(g),
    b: linearToSrgb(b),
  };
}

export function hexFromOklch(oklch) {
  return rgbToHex(oklchToRgb(oklch));
}

/** WCAG 2.x relative luminance (sRGB linearized, Rec.709 weights). */
export function relativeLuminance(hex) {
  const { r, g, b } = hexToRgb(hex);
  return (
    0.2126 * srgbToLinear(r) +
    0.7152 * srgbToLinear(g) +
    0.0722 * srgbToLinear(b)
  );
}

export function contrastRatio(a, b) {
  const la = relativeLuminance(a);
  const lb = relativeLuminance(b);
  const [hi, lo] = la > lb ? [la, lb] : [lb, la];
  return (hi + 0.05) / (lo + 0.05);
}

/** Smallest absolute angular distance between two hues in degrees [0, 180]. */
export function hueDeltaDeg(h1, h2) {
  const d = Math.abs(h1 - h2) % 360;
  return d > 180 ? 360 - d : d;
}

/**
 * Classify a palette's hue distribution. Returns one of:
 *   "monochrome"   — all hues within 20°
 *   "analogous"    — hues span up to 60°
 *   "complementary"— two clusters ~180° apart
 *   "triadic"      — three clusters ~120° apart
 *   "freeform"     — anything else
 *
 * Useful for both reporting (debug) and for the harmony-constrained
 * compose mode. Achromatic colors (C < 0.02) are ignored when classifying.
 */
export function harmonyOf(hexes) {
  const hues = hexes
    .map((h) => oklchFromHex(h))
    .filter((c) => c.C > 0.02)
    .map((c) => c.h);
  if (hues.length === 0) return "monochrome";

  const sorted = hues.slice().sort((a, b) => a - b);
  const spans = sorted.map((h, i) => {
    const next = sorted[(i + 1) % sorted.length];
    return (next - h + 360) % 360;
  });
  const maxGap = Math.max(...spans);
  const totalSpan = 360 - maxGap; // arc actually covered

  if (totalSpan < 20) return "monochrome";
  if (totalSpan < 60) return "analogous";

  // Detect clusters by finding gaps >= 80°
  const gapsBig = spans.filter((g) => g > 80).length;
  if (gapsBig === 2) return "complementary";
  if (gapsBig === 3) return "triadic";

  return "freeform";
}

// Thresholds the composition engine uses. Centralized so a future "strict
// AA / AAA" toggle can lift them without hunting through composePalette.
export const THRESHOLDS = {
  CONTRAST_INK: 4.5, // body text vs bg — WCAG AA normal text
  CONTRAST_ACCENT: 3.0, // accent must read against bg as a UI element
  HUE_INK_TO_ACCENT: 40, // accent should feel distinct in hue from ink
  HUE_INK_TO_MUTED: 30, // muted feels like a quieter cousin of ink
  LUM_INK_MUTED_GAP: 0.15, // muted lives between ink and bg in luminance
  CHROMA_NEUTRAL_INK: 0.08, // ink prefers low chroma to not fight wordmark
};
