import { contrastRatio, oklchFromHex, relativeLuminance } from "./colorTheory";

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
 *     Honors dominance order. The first 3-4 colors in a pin's palette
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

function deriveComposedRoles(palette, isDark) {
  const sorted = palette.slice().sort((a, b) => relativeLuminance(a) - relativeLuminance(b));
  const darkest = sorted[0];
  const lightest = sorted[sorted.length - 1];
  const mids = sorted.slice(1, -1);

  const bg = isDark ? darkest : lightest;
  const ink = isDark ? lightest : darkest;

  let accent = mids.length ? mids[0] : ink;
  if (mids.length) {
    let bestChroma = -1;
    for (const m of mids) {
      const c = oklchFromHex(m).C;
      if (c > bestChroma) { bestChroma = c; accent = m; }
    }
  }
  const muted = mids.length ? mids[Math.floor(mids.length / 2)] : accent;
  return { bg, ink, accent, muted };
}

function derivePinRoles(palette, isDark) {
  // Top-4 are the dominant colors that actually carried the artifact.
  // Use only these as candidates for the loud roles (bg / ink / accent).
  // Tail colors can serve as muted, but never as the brand-defining
  // accent — that's how the engine was electing fringe pixels.
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

  // Accent: the most chromatic head color that isn't bg or ink. Honors
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

  return { bg: bg.hex, ink: ink.hex, accent: accent.hex, muted: mutedHex };
}
