import { contrastRatio, deltaEOK, oklchFromHex, relativeLuminance, tintToContrast, THRESHOLDS } from "./colorTheory";

/**
 * Shared role derivation. Two paths depending on where the palette
 * came from:
 *
 *   sourceKind: "composed"  (default; used by composed shuffles, brand
 *                            page palette, gradients, etc.)
 *     Sort by luminance, pick extremes as bg/ink, most-vivid mid as
 *     accent. Treats all colors as equal candidates — the right
 *     behavior when the engine itself composed the palette and every
 *     color has earned its slot.
 *
 *   sourceKind: "pin"  (palettes extracted from a pin via k-means)
 *     Honors dominance order. The first 3-4 colors in a pin’s palette
 *     are the colors that actually carried the image. The last 2-3 are
 *     tail. So bg/ink come from the top-4 only, accent is the next
 *     chromatic color in dominance order (not the most-saturated mid
 *     across the whole palette). This stops the engine from electing
 *     a fringe corner color as the loud accent.
 *
 *   options.swapPrimary
 *     When true, swap bg↔ink after derivation. The /colors page exposes
 *     this as a per-row toggle so the user can flip if our heuristic
 *     guesses wrong for a specific palette.
 */
export function derivePreviewRoles(palette, variant = "dark", options = {}) {
  if (!palette || palette.length === 0) {
    return { bg: "#fff", ink: "#000", muted: "#666", accent: "#888",
      gradient1: "none", gradient2: "none" };
  }

  const { sourceKind = "composed", swapPrimary = false } = options;
  const isDark = variant === "dark";

  let bg, ink, accent, muted;

  if (sourceKind === "pin" && palette.length >= 3) {
    const result = derivePinRoles(palette, isDark);
    ({ bg, ink, accent, muted } = result);
  } else {
    const result = deriveComposedRoles(palette, isDark);
    ({ bg, ink, accent, muted } = result);
  }

  if (swapPrimary) {
    [bg, ink] = [ink, bg];
  }

  const sortedAll = palette.slice().sort((a, b) => relativeLuminance(a) - relativeLuminance(b));
  const gradient1 = `linear-gradient(135deg, ${sortedAll.join(", ")})`;
  const gradient2 = `linear-gradient(90deg, ${sortedAll.slice().reverse().join(", ")})`;

  return { bg, ink, muted, accent, gradient1, gradient2 };
}

/**
 * Make an accent legible against the bg it will actually sit on. If it can’t
 * clear 3:1 — the common case where a board’s chromatic colors are all
 * mid-light and wash out on a pale bg (light variant) or near-black on a deep
 * bg (dark variant) — deepen or lift it in place (same hue/chroma, shifted L).
 * Only accept the shift if the result stays perceptually clear of ink, so we
 * never trade a washed accent for one that reads as a second ink.
 */
function legibleAccent(accentHex, bg, ink) {
  if (contrastRatio(accentHex, bg) >= THRESHOLDS.CONTRAST_ACCENT) return accentHex;
  const shifted = tintToContrast(accentHex, bg, THRESHOLDS.CONTRAST_ACCENT);
  return deltaEOK(shifted, ink) >= THRESHOLDS.MIN_ROLE_DELTAE ? shifted : accentHex;
}

function deriveComposedRoles(palette, isDark) {
  const sorted = palette.slice().sort((a, b) => relativeLuminance(a) - relativeLuminance(b));
  const darkest = sorted[0];
  const lightest = sorted[sorted.length - 1];
  const mids = sorted.slice(1, -1);

  const bg = isDark ? darkest : lightest;
  const ink = isDark ? lightest : darkest;

  if (mids.length === 0) {
    return { bg, ink, accent: ink, muted: ink };
  }

  // Accent: the most vivid mid, with a bonus for clearing ~3:1 on THIS
  // variant’s bg so it reads as a mark. (composePalette guaranteed accent
  // vs one anchor; the renderer re-checks against the bg it actually uses.)
  const accentScore = (hex) =>
    oklchFromHex(hex).C + (contrastRatio(hex, bg) >= THRESHOLDS.CONTRAST_ACCENT ? 0.12 : 0);
  let accent = mids[0];
  let bestAccent = -Infinity;
  for (const m of mids) {
    const s = accentScore(m);
    if (s > bestAccent) { bestAccent = s; accent = m; }
  }
  accent = legibleAccent(accent, bg, ink);

  // Muted: a quieter, perceptually distinct mid — never a twin of the accent
  // (the accent===muted collapse that made composed palettes look muddy).
  // Prefer lower chroma than the accent and decent contrast on the bg.
  const accentC = oklchFromHex(accent).C;
  const mutedCandidates = mids.filter(
    (m) => m !== accent && deltaEOK(m, accent) >= THRESHOLDS.MIN_ROLE_DELTAE,
  );
  let muted;
  if (mutedCandidates.length) {
    const mutedScore = (hex) =>
      -Math.abs(oklchFromHex(hex).C - Math.max(0, accentC - 0.05)) +
      (contrastRatio(hex, bg) >= THRESHOLDS.CONTRAST_ACCENT ? 0.1 : 0);
    muted = mutedCandidates[0];
    let bestMuted = -Infinity;
    for (const m of mutedCandidates) {
      const s = mutedScore(m);
      if (s > bestMuted) { bestMuted = s; muted = m; }
    }
  } else {
    // No distinct mid — fall back to ink so muted reads as a quieter voice
    // rather than echoing the accent.
    muted = ink;
  }

  return { bg, ink, accent, muted };
}

function derivePinRoles(palette, isDark) {
  // Top-4 are the dominant colors that actually carried the artifact.
  // Use only these as candidates for the loud roles (bg / ink / accent).
  // Tail colors can serve as muted, but never as the brand-defining
  // accent — that’s how the engine was electing fringe pixels.
  const head = palette.slice(0, Math.min(4, palette.length));
  const tail = palette.slice(Math.min(4, palette.length));

  // Score each head color by luminance + chroma so we can pick bg/ink
  // intelligently from this constrained set.
  const scored = head.map((hex, idx) => {
    const oklch = oklchFromHex(hex);
    return {
      hex,
      dominance: idx, // 0 = most dominant
      relLum: relativeLuminance(hex),
      chroma: oklch.C,
    };
  });

  // Background: the head color at the right luminance extreme. For dark
  // variant we want the darkest in head; for light, the lightest. Among
  // ties, prefer lower chroma (more neutral = more "background-y").
  const sortedByLum = scored.slice().sort((a, b) => a.relLum - b.relLum);
  const bg = isDark ? sortedByLum[0] : sortedByLum[sortedByLum.length - 1];

  // Ink: the highest-contrast head color against bg.
  let ink = scored.find((c) => c !== bg);
  let bestInkContrast = -1;
  for (const c of scored) {
    if (c === bg) continue;
    const r = contrastRatio(c.hex, bg.hex);
    if (r > bestInkContrast) { bestInkContrast = r; ink = c; }
  }

  // Accent: the most chromatic head color that isn’t bg or ink. Honors
  // dominance — if two colors tie on chroma, pick the one earlier in
  // the original palette.
  const accentCandidates = scored.filter((c) => c !== bg && c !== ink);
  let accent = accentCandidates[0] || ink;
  if (accentCandidates.length > 0) {
    let bestChroma = -1;
    let bestDom = Infinity;
    for (const c of accentCandidates) {
      if (c.chroma > bestChroma + 0.02 ||
          (Math.abs(c.chroma - bestChroma) <= 0.02 && c.dominance < bestDom)) {
        bestChroma = c.chroma;
        bestDom = c.dominance;
        accent = c;
      }
    }
  }

  // Deepen/lift the accent so it actually reads on this variant’s bg — the
  // pin path was electing mid-light chromatic colors that washed out on pale
  // bgs (light) and vanished into deep bgs (dark). Preserves hue.
  let accentHex = legibleAccent(accent.hex, bg.hex, ink.hex);

  // If the most-chromatic color still can’t be made legible (it collapsed
  // into ink, or sat too close to bg’s luminance to shift far enough), fall
  // back through the rest of the palette’s chromatic colors — most chromatic
  // first — and take the first that clears 3:1 while staying clear of ink.
  // This is the "draw from a darker chromatic color when the obvious one
  // washes out" move: better a legible second-choice hue than a dead accent.
  if (contrastRatio(accentHex, bg.hex) < THRESHOLDS.CONTRAST_ACCENT) {
    const fallbacks = palette
      .filter((hex) => hex !== bg.hex && hex !== ink.hex && hex !== accent.hex)
      .map((hex) => ({ hex, chroma: oklchFromHex(hex).C }))
      .filter((c) => c.chroma > 0.04)
      .sort((a, b) => b.chroma - a.chroma);
    for (const c of fallbacks) {
      const candidate = legibleAccent(c.hex, bg.hex, ink.hex);
      if (contrastRatio(candidate, bg.hex) >= THRESHOLDS.CONTRAST_ACCENT) {
        accentHex = candidate;
        break;
      }
    }
  }

  // Muted: prefer a tail color first (the "supporting" pool), then
  // fall back to any remaining head color. Lower chroma than accent.
  let mutedHex = null;
  const tailCandidates = tail
    .map((hex) => ({ hex, chroma: oklchFromHex(hex).C, relLum: relativeLuminance(hex) }))
    .filter((c) => c.chroma < accent.chroma);
  if (tailCandidates.length > 0) {
    // Prefer middle-luminance among tail.
    tailCandidates.sort((a, b) => Math.abs(a.relLum - 0.5) - Math.abs(b.relLum - 0.5));
    mutedHex = tailCandidates[0].hex;
  } else {
    const remaining = scored.filter((c) => c !== bg && c !== ink && c !== accent);
    mutedHex = (remaining[0] || accent).hex;
  }

  // Never let muted collapse into a near-twin of the accent — that’s the
  // muddy "two of the same color" look. Fall back to ink as the quieter voice.
  if (deltaEOK(mutedHex, accentHex) < THRESHOLDS.MIN_ROLE_DELTAE) {
    mutedHex = ink.hex;
  }

  return { bg: bg.hex, ink: ink.hex, accent: accentHex, muted: mutedHex };
}
