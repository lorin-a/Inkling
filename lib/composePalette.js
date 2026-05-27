import {
  contrastRatio,
  deltaEOK,
  harmonyOf,
  hueDeltaDeg,
  oklchFromHex,
  relativeLuminance,
  THRESHOLDS,
} from "./colorTheory";

/**
 * Role-aware palette composition.
 *
 * Picks N colors from `pool` so the resulting palette has a usable
 * background / ink / accent / muted structure under BOTH the dark and
 * light Brand variants (which flip bg↔ink by sorting on luminance).
 * The downstream `derivePreviewRoles` consumer in BrandPreview will
 * recover the same role assignments because:
 *   - Color[0] (anchor A) is the highest-luminance pick → light-mode bg / dark-mode ink.
 *   - Color[1] (anchor B) is the lowest-luminance pick  → dark-mode bg / light-mode ink.
 *   - Accent is the most vivid mid → matches mostVivid() in mapRoles.
 *   - Muted sits between them in luminance.
 *
 * If the pool is too small or no candidate pair meets the contrast
 * floor, returns null so the caller can fall back to the legacy
 * `sampleSpread` random picker.
 */
export function composePalette({ pool, size = 5, harmony = "freeform" } = {}) {
  if (!Array.isArray(pool) || pool.length < 6) return null;

  const enriched = pool.map((hex) => {
    const oklch = oklchFromHex(hex);
    return {
      hex: hex.toLowerCase(),
      L: oklch.L,
      C: oklch.C,
      h: oklch.h,
      relLum: relativeLuminance(hex),
      taste: 0,
    };
  });

  // Taste-affinity = local density. A color with many perceptual neighbors
  // in the pool is a *recurring* tone across the user’s pins (it earned its
  // place); a lone outlier is a fringe pixel. We bias selection toward the
  // recurring tones so shuffle composes from the board’s actual character,
  // not from one-off colors that merely happen to pass contrast. (Khroma’s
  // taste insight without the neural net — the whole pool is the "likes"
  // set, so representativeness, not preference, is the signal.)
  let maxDensity = 1;
  for (const c of enriched) {
    let density = 0;
    for (const o of enriched) {
      if (o !== c && deltaEOK(o.hex, c.hex) < THRESHOLDS.TASTE_RADIUS) density += 1;
    }
    c._density = density;
    if (density > maxDensity) maxDensity = density;
  }
  for (const c of enriched) c.taste = c._density / maxDensity; // normalized 0–1

  // What hue scheme does this pool actually support? Used as a *soft* nudge
  // on the accent (not a hard filter — a messy pool shouldn’t fail to
  // compose), so the accent tends to land in a coherent relationship.
  const scheme = harmonyOf(pool);

  // 1. Endpoint pair — high-luminance + low-luminance with WCAG AA contrast.
  //    Score candidates by (contrastRatio * luminance_spread) so we pick a
  //    striking pair instead of just the literal darkest+lightest, which can
  //    be near-blacks or near-whites with mediocre headroom for accents.
  const pair = pickAnchorPair(enriched);
  if (!pair) return null;
  const { anchorLight, anchorDark, rest } = pair;

  // Hard invariant: every non-anchor color must live strictly between the
  // anchors in luminance. Otherwise the downstream sort-by-luminance picker
  // would re-elect a filler as bg or ink and collapse the contrast we
  // composed for. A small epsilon prevents tied luminance from swapping
  // identities.
  const lumLo = anchorDark.relLum + 0.01;
  const lumHi = anchorLight.relLum - 0.01;
  const midband = rest.filter((c) => c.relLum > lumLo && c.relLum < lumHi);
  if (midband.length < 2) return null; // can’t compose accent + muted

  // 2. Accent — vivid, ≥3:1 vs both anchors, hue distinct from the dominant
  //    chromatic axis (the ink side under either variant).
  const inkHueAxis = anchorLight.C > anchorDark.C ? anchorLight.h : anchorDark.h;
  const accent = pickAccent(midband, {
    inkHueAxis,
    anchors: [anchorLight, anchorDark],
    harmony,
    scheme,
  });

  // 3. Muted — quieter cousin, ≥3:1 vs both anchors, lower chroma than accent,
  //    and perceptually distinct from it (no muddy near-duplicates).
  const muted = pickMuted(
    midband.filter((c) => c !== accent),
    { inkHueAxis, anchors: [anchorLight, anchorDark], accent, harmony },
  );

  // 4. Fillers — luminance-distinct within the midband.
  const chosen = [anchorLight, anchorDark, accent, muted].filter(Boolean);
  const fillerPool = midband.filter((c) => !chosen.includes(c));
  const fillers = pickFillers(
    fillerPool,
    chosen,
    Math.max(0, size - chosen.length),
  );

  const ordered = orderForShuffle([anchorLight, anchorDark, accent, muted, ...fillers], size);
  return ordered.map((c) => c.hex);
}

function pickAnchorPair(enriched) {
  const sortedByLum = enriched.slice().sort((a, b) => a.relLum - b.relLum);
  const darkPool = sortedByLum.slice(0, Math.min(20, sortedByLum.length));
  const lightPool = sortedByLum.slice(-Math.min(20, sortedByLum.length));

  const candidates = [];
  for (const dark of darkPool) {
    for (const light of lightPool) {
      if (dark === light) continue;
      const ratio = contrastRatio(dark.hex, light.hex);
      if (ratio < THRESHOLDS.CONTRAST_INK) continue;
      const spread = light.relLum - dark.relLum;
      const neutralBonus =
        (dark.C < THRESHOLDS.CHROMA_NEUTRAL_INK ? 0.3 : 0) +
        (light.C < THRESHOLDS.CHROMA_NEUTRAL_INK ? 0.3 : 0);
      // Strong bias toward truly extreme luminances. A bg that’s actually
      // dark (relLum < 0.05) leaves the entire midband free to act as
      // accents with ≥3:1. A bg at relLum 0.13 only clears 3:1 against
      // mids brighter than ~0.45, which rules out most of the pool.
      const extremesBonus =
        (dark.relLum < 0.05 ? 0.8 : dark.relLum < 0.10 ? 0.3 : 0) +
        (light.relLum > 0.75 ? 0.8 : light.relLum > 0.60 ? 0.3 : 0);
      // Favor anchors that recur in the pool, so bg/ink carry the board’s
      // character instead of being two arbitrary extremes.
      const tasteBonus = 0.6 * (dark.taste + light.taste);
      candidates.push({
        light,
        dark,
        score: ratio * spread + neutralBonus + extremesBonus + tasteBonus,
      });
    }
  }
  if (candidates.length === 0) return null;

  // Top-K sample so shuffle produces variety. Take the top 40% by score
  // (clamped to a sensible band) and pick uniformly at random — guarantees
  // a strong palette while never landing on the literal argmax every time.
  candidates.sort((a, b) => b.score - a.score);
  const k = Math.max(3, Math.min(candidates.length, Math.ceil(candidates.length * 0.4)));
  const picked = candidates[Math.floor(Math.random() * k)];
  return {
    anchorLight: picked.light,
    anchorDark: picked.dark,
    rest: enriched.filter((c) => c !== picked.light && c !== picked.dark),
  };
}

function pickAccent(rest, { inkHueAxis, anchors, harmony, scheme }) {
  // anchors[0] is the LIGHT anchor (anchorLight), anchors[1] is the DARK.
  // The dark-mode bg is anchors[1] — that’s the one accent absolutely
  // must clear for the brand page’s primary variant to feel readable.
  // We *prefer* clearing the light anchor too (light-mode bg) but don’t
  // require it, since the pool often can’t satisfy both extremes.
  const darkAnchor = anchors[1];
  const lightAnchor = anchors[0];
  const candidates = rest.filter((c) => {
    if (contrastRatio(c.hex, darkAnchor.hex) < THRESHOLDS.CONTRAST_ACCENT) return false;
    if (hueDeltaDeg(c.h, inkHueAxis) < THRESHOLDS.HUE_INK_TO_ACCENT) return false;
    // Don’t let the accent be a perceptual twin of either anchor.
    if (deltaEOK(c.hex, darkAnchor.hex) < THRESHOLDS.MIN_ROLE_DELTAE) return false;
    if (deltaEOK(c.hex, lightAnchor.hex) < THRESHOLDS.MIN_ROLE_DELTAE) return false;
    // Explicit caller-requested harmony stays a hard filter.
    if (harmony === "complementary" && Math.abs(hueDeltaDeg(c.h, inkHueAxis) - 180) > 30) return false;
    if (harmony === "analogous" && hueDeltaDeg(c.h, inkHueAxis) > 60) return false;
    if (harmony === "triadic" && Math.abs(hueDeltaDeg(c.h, inkHueAxis) - 120) > 30) return false;
    return true;
  });

  // Score blends vividness, taste (recurs in the pool), a both-variants
  // bonus, and a *soft* nudge toward the pool’s own hue scheme — so the
  // accent is a vivid, on-brand color, not whichever pixel was loudest.
  const maxC = Math.max(...candidates.map((c) => c.C), 0.0001);
  const score = (c) =>
    0.5 * (c.C / maxC) +
    0.4 * c.taste +
    0.15 * schemeFit(c.h, inkHueAxis, harmony === "freeform" ? scheme : harmony) +
    (contrastRatio(c.hex, lightAnchor.hex) >= THRESHOLDS.CONTRAST_ACCENT ? 0.15 : 0);

  if (candidates.length === 0) {
    const relaxed = rest.filter(
      (c) => contrastRatio(c.hex, darkAnchor.hex) >= THRESHOLDS.CONTRAST_ACCENT,
    );
    if (relaxed.length === 0) return rest[Math.floor(Math.random() * rest.length)];
    return topKSample(relaxed, score, 0.5);
  }
  return topKSample(candidates, score, 0.4);
}

/**
 * How well a hue sits in the pool’s detected scheme relative to the ink
 * axis, in [0, 1]. A soft signal — returns a neutral 0.5 for freeform or
 * monochrome pools so it neither helps nor hurts.
 */
function schemeFit(hue, inkHueAxis, scheme) {
  const d = hueDeltaDeg(hue, inkHueAxis);
  const near = (target, width) => Math.max(0, 1 - Math.abs(d - target) / width);
  switch (scheme) {
    case "complementary": return near(180, 60);
    case "triadic": return near(120, 60);
    case "analogous": return Math.max(0, 1 - d / 60);
    default: return 0.5; // freeform / monochrome — no opinion
  }
}

function pickMuted(rest, { inkHueAxis, anchors, accent, harmony }) {
  const darkAnchor = anchors[1];
  const candidates = rest.filter((c) => {
    if (contrastRatio(c.hex, darkAnchor.hex) < THRESHOLDS.CONTRAST_ACCENT) return false;
    if (accent && c.C >= accent.C) return false; // muted should be quieter than accent
    if (accent && Math.abs(c.relLum - accent.relLum) < 0.05) return false; // and not the same lightness
    if (accent && deltaEOK(c.hex, accent.hex) < THRESHOLDS.MIN_ROLE_DELTAE) return false; // not a muddy twin
    return true;
  });
  // Prefer a quiet (low-chroma) tone that still recurs in the pool, so muted
  // reads as a deliberate secondary voice, not a leftover.
  const score = (c) => -c.C + 0.3 * c.taste;
  if (candidates.length === 0) {
    const relaxed = rest.filter(
      (c) => contrastRatio(c.hex, darkAnchor.hex) >= THRESHOLDS.CONTRAST_ACCENT,
    );
    if (relaxed.length === 0) return null;
    return topKSample(relaxed, score, 0.5);
  }
  return topKSample(candidates, score, 0.5);
}

function pickFillers(rest, chosen, n) {
  if (n <= 0) return [];

  // Hard constraint: no filler can out-chroma the accent, or the
  // downstream most-vivid-mid picker will elect it as accent and
  // collapse the contrast we composed for. Track the chosen accent
  // (index 2 in the chosen array per orderForShuffle’s input contract).
  const accent = chosen[2];
  const accentChroma = accent ? accent.C : Infinity;
  const eligible = rest.filter((c) => c.C < accentChroma - 0.005);
  // If filtering wipes out the pool (small/all-saturated pool), fall back
  // to anything — variety beats a too-strict no-op.
  const fillerPool = eligible.length >= n ? eligible : rest;

  const picks = [];
  const luminances = chosen.map((c) => c.relLum);
  const used = new Set();
  while (picks.length < n) {
    let best = null;
    let bestScore = -Infinity;
    for (const c of fillerPool) {
      if (used.has(c.hex)) continue;
      const allLum = [...luminances, ...picks.map((p) => p.relLum)];
      const minDist = Math.min(...allLum.map((l) => Math.abs(l - c.relLum)));
      const score = minDist + Math.random() * 0.05;
      if (score > bestScore) {
        bestScore = score;
        best = c;
      }
    }
    if (!best) break;
    used.add(best.hex);
    picks.push(best);
  }
  return picks;
}

function orderForShuffle(items, size) {
  // Return the first `size` items, sorted by luminance ascending so the
  // downstream `derivePreviewRoles` (which sorts by luminance) sees the
  // structure we composed. Keeps roles consistent across re-renders.
  const trimmed = items.filter(Boolean).slice(0, size);
  return trimmed.sort((a, b) => a.relLum - b.relLum);
}

/**
 * Sort by score descending, then pick uniformly at random from the top
 * `frac` of the list. Produces variety without dropping into the long
 * tail of low-quality candidates.
 */
function topKSample(items, scoreFn, frac) {
  if (items.length === 0) return null;
  const ranked = items.slice().sort((a, b) => scoreFn(b) - scoreFn(a));
  const k = Math.max(1, Math.min(ranked.length, Math.ceil(ranked.length * frac)));
  return ranked[Math.floor(Math.random() * k)];
}
