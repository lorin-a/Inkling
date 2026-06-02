import { oklchFromHex } from "./colorTheory";

/**
 * Curated font pairings — the taste layer on top of the full-catalog browser.
 *
 * Each pairing is a coherent two-face system drawn from Google Fonts (so it
 * loads live): a `display` face for the Title and a `text` face for Subhead +
 * Body. Single-face systems repeat the family. Every entry is mood-tagged so
 * the suggestion engine can weight proposals by the palette’s character.
 *
 * Moods: editorial, refined, classic, modern, geometric, brutalist, soft, warm.
 *
 * Entries without a `source` are house picks. Entries with one are vetted from
 * a named reference (2026-05-27 expansion) so the curation is traceable:
 *   - "Fontpair" — fontpair.co/all
 *   - "Creative Bloq" — creativebloq.com 20 perfect font pairings
 *   - "Google Fonts Knowledge" — fonts.google.com/knowledge (superfamily /
 *     same-designer pairings, inherently harmonious)
 */
export const PAIRINGS = [
  { id: "playfair-source", display: "Playfair Display", text: "Source Sans 3", mood: ["editorial", "classic"] },
  { id: "fraunces-inter", display: "Fraunces", text: "Inter", mood: ["editorial", "refined"] },
  { id: "dmserif-dmsans", display: "DM Serif Display", text: "DM Sans", mood: ["refined", "modern"] },
  { id: "cormorant-proza", display: "Cormorant Garamond", text: "Proza Libre", mood: ["refined", "editorial"] },
  { id: "spectral-karla", display: "Spectral", text: "Karla", mood: ["editorial", "refined"] },
  { id: "ebgaramond-montserrat", display: "EB Garamond", text: "Montserrat", mood: ["classic", "refined"] },
  { id: "crimson-work", display: "Crimson Pro", text: "Work Sans", mood: ["refined", "classic"] },
  { id: "newsreader-public", display: "Newsreader", text: "Public Sans", mood: ["editorial", "classic"] },
  { id: "librecaslon-franklin", display: "Libre Caslon Display", text: "Libre Franklin", mood: ["editorial", "classic"] },
  { id: "lora-lato", display: "Lora", text: "Lato", mood: ["classic", "soft"] },
  { id: "merriweather-open", display: "Merriweather", text: "Open Sans", mood: ["classic"] },
  { id: "ptserif-ptsans", display: "PT Serif", text: "PT Sans", mood: ["classic", "modern"] },
  { id: "cardo-source", display: "Cardo", text: "Source Sans 3", mood: ["classic", "refined"] },
  { id: "marcellus-nunito", display: "Marcellus", text: "Nunito Sans", mood: ["refined", "soft"] },
  { id: "tenor-lora", display: "Tenor Sans", text: "Lora", mood: ["refined", "soft"] },
  { id: "italiana-jost", display: "Italiana", text: "Jost", mood: ["refined", "editorial"] },
  { id: "instrument-inter", display: "Instrument Serif", text: "Inter", mood: ["refined", "editorial"] },
  { id: "abril-lato", display: "Abril Fatface", text: "Lato", mood: ["editorial", "warm"] },
  { id: "petrona-inter", display: "Petrona", text: "Inter", mood: ["warm", "editorial"] },
  { id: "zillaslab-inter", display: "Zilla Slab", text: "Inter", mood: ["modern", "warm"] },
  { id: "spacegrotesk-inter", display: "Space Grotesk", text: "Inter", mood: ["geometric", "modern"] },
  { id: "syne-inter", display: "Syne", text: "Inter", mood: ["brutalist", "modern"] },
  { id: "bricolage-inter", display: "Bricolage Grotesque", text: "Inter", mood: ["modern", "editorial"] },
  { id: "unbounded-inter", display: "Unbounded", text: "Inter", mood: ["brutalist", "geometric"] },
  { id: "bigshoulders-public", display: "Big Shoulders Display", text: "Public Sans", mood: ["brutalist", "editorial"] },
  { id: "anton-roboto", display: "Anton", text: "Roboto", mood: ["brutalist"] },
  { id: "bebas-inter", display: "Bebas Neue", text: "Inter", mood: ["brutalist", "modern"] },
  { id: "archivo-archivonarrow", display: "Archivo", text: "Archivo Narrow", mood: ["brutalist", "modern"] },
  { id: "epilogue-inter", display: "Epilogue", text: "Inter", mood: ["modern", "geometric"] },
  { id: "outfit-inter", display: "Outfit", text: "Inter", mood: ["geometric", "soft"] },
  { id: "sora", display: "Sora", text: "Sora", mood: ["geometric", "modern"] },
  { id: "manrope", display: "Manrope", text: "Manrope", mood: ["modern", "soft"] },
  { id: "hanken", display: "Hanken Grotesk", text: "Hanken Grotesk", mood: ["modern", "soft"] },
  { id: "poppins", display: "Poppins", text: "Poppins", mood: ["geometric", "soft"] },
  { id: "josefin", display: "Josefin Sans", text: "Josefin Sans", mood: ["soft", "geometric"] },
  { id: "fraunces-solo", display: "Fraunces", text: "Fraunces", mood: ["editorial", "refined"] },

  // — Vetted expansion (2026-05-27), cited per entry —
  { id: "gloock-inter", display: "Gloock", text: "Inter", mood: ["editorial", "refined"], source: "Fontpair" },
  { id: "staatliches-dmsans", display: "Staatliches", text: "DM Sans", mood: ["brutalist", "modern"], source: "Fontpair" },
  { id: "bitter-worksans", display: "Bitter", text: "Work Sans", mood: ["modern", "warm"], source: "Fontpair" },
  { id: "zain-nunito", display: "Zain", text: "Nunito", mood: ["soft", "modern"], source: "Fontpair" },
  { id: "archivo-plexmono", display: "Archivo", text: "IBM Plex Mono", mood: ["modern", "geometric"], source: "Fontpair" },
  { id: "playfair-alice", display: "Playfair Display", text: "Alice", mood: ["editorial", "classic"], source: "Creative Bloq" },
  { id: "pacifico-quicksand", display: "Pacifico", text: "Quicksand", mood: ["soft", "warm"], source: "Creative Bloq" },
  { id: "oswald-lato", display: "Oswald", text: "Lato", mood: ["brutalist", "modern"], source: "Creative Bloq" },
  // Superfamily / same-designer pairs — inherently harmonious (Google Fonts Knowledge).
  { id: "plex-superfamily", display: "IBM Plex Serif", text: "IBM Plex Sans", mood: ["modern", "classic"], source: "Google Fonts Knowledge" },
  { id: "source-superfamily", display: "Source Serif 4", text: "Source Sans 3", mood: ["classic", "refined"], source: "Google Fonts Knowledge" },
  { id: "alegreya-superfamily", display: "Alegreya", text: "Alegreya Sans", mood: ["editorial", "refined"], source: "Google Fonts Knowledge" },
  { id: "roboto-superfamily", display: "Roboto Slab", text: "Roboto", mood: ["modern"], source: "Google Fonts Knowledge" },
  { id: "noto-superfamily", display: "Noto Serif", text: "Noto Sans", mood: ["classic"], source: "Google Fonts Knowledge" },
];

/**
 * Reduce a palette to the character signals that bias mood: average chroma
 * (how saturated / vivid the colors are) and average lightness, in OKLCH.
 */
export function paletteProfile(hexes = []) {
  const valid = hexes.filter(Boolean);
  if (valid.length === 0) return { chroma: 0.1, lightness: 0.6 };
  let cSum = 0;
  let lSum = 0;
  for (const hex of valid) {
    const { L, C } = oklchFromHex(hex);
    lSum += L;
    cSum += C;
  }
  return { chroma: cSum / valid.length, lightness: lSum / valid.length };
}

// Translate the profile into a weight per mood. Vivid palettes lean expressive
// (brutalist / editorial / geometric); muted palettes lean quiet (refined /
// classic / soft). Lightness nudges warmth vs. modern coolness gently.
function moodWeights({ chroma, lightness }) {
  const vivid = Math.min(Math.max((chroma - 0.06) / 0.12, 0), 1); // ~0 muted → ~1 vivid
  const w = {
    editorial: 1 + vivid * 1.2,
    brutalist: 0.4 + vivid * 1.8,
    geometric: 0.7 + vivid * 1.0,
    modern: 1,
    refined: 1 + (1 - vivid) * 1.2,
    classic: 0.7 + (1 - vivid) * 1.2,
    soft: 0.6 + (1 - vivid) * 1.0,
    warm: 0.6 + (lightness > 0.6 ? 0.6 : 0) + (1 - vivid) * 0.4,
  };
  return w;
}

function scorePairing(p, weights) {
  return p.mood.reduce((sum, m) => sum + (weights[m] || 0.5), 0) / p.mood.length;
}

/**
 * Rank every pairing by how well its mood fits the palette — deterministic (no
 * jitter), so the type deck opens with the faces that suit the colours you just
 * gathered up front. The recognition "type spoke" reacts through this order.
 */
export function rankPairings({ palette = [] } = {}) {
  const weights = moodWeights(paletteProfile(palette));
  return PAIRINGS.map((p) => ({ p, score: scorePairing(p, weights) }))
    .sort((a, b) => b.score - a.score)
    .map((x) => x.p);
}

/**
 * Propose a pairing, weighted by the palette profile and respecting locks.
 *
 * @param {object}   opts
 * @param {string[]} opts.palette       current palette hexes (for the profile)
 * @param {object}   opts.fonts         current { title, subhead, body } slot values
 * @param {Set}      opts.lockedSlots   Set of slot keys to preserve ("title", …)
 * @param {string}   [opts.avoidId]     a pairing id to avoid repeating
 *
 * When a slot is locked to a known pairing family, candidates are restricted
 * to pairings that *partner* with it (Fontjoy-style: keep one, propose the
 * match). Otherwise the whole pairing is proposed and only unlocked slots are
 * filled.
 */
export function suggestPairing({ palette = [], fonts = {}, lockedSlots = new Set(), avoidId = null } = {}) {
  const weights = moodWeights(paletteProfile(palette));

  // If Title or Body is locked to a family we recognize, partner against it.
  const lockedTitle = lockedSlots.has("title") ? fonts.title?.family : null;
  const lockedBody = lockedSlots.has("body") ? fonts.body?.family : null;

  let candidates = PAIRINGS;
  if (lockedTitle && PAIRINGS.some((p) => p.display === lockedTitle)) {
    candidates = PAIRINGS.filter((p) => p.display === lockedTitle);
  } else if (lockedBody && PAIRINGS.some((p) => p.text === lockedBody)) {
    candidates = PAIRINGS.filter((p) => p.text === lockedBody);
  }
  if (avoidId && candidates.length > 1) candidates = candidates.filter((p) => p.id !== avoidId);

  // Weighted random pick, scored by mood fit with a little jitter for variety.
  const scored = candidates.map((p) => ({ p, w: scorePairing(p, weights) * (0.6 + Math.random() * 0.8) }));
  const total = scored.reduce((s, x) => s + x.w, 0);
  let r = Math.random() * total;
  let chosen = scored[0]?.p || PAIRINGS[0];
  for (const x of scored) { r -= x.w; if (r <= 0) { chosen = x.p; break; } }

  // Build the next fonts object: locked slots stay, unlocked take the pairing.
  const next = { ...fonts };
  if (!lockedSlots.has("title")) next.title = { family: chosen.display, source: "google" };
  if (!lockedSlots.has("subhead")) next.subhead = { family: chosen.text, source: "google" };
  if (!lockedSlots.has("body")) next.body = { family: chosen.text, source: "google" };
  return { fonts: next, pairing: chosen };
}
