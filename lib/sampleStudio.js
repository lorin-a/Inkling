/**
 * Sample Studio — the starter content an anonymous (signed-out) visitor
 * lands in. It is deliberately, legibly a *sample*: the wordmark reads
 * "Your Brand" and the copy is placeholder.
 *
 * Two parts, kept separate on purpose:
 *   - The project template (wordmark / tagline / body) is hand-authored
 *     below and never regenerated.
 *   - The pins + derived palette come from a real Pinterest board,
 *     mirrored into public/sample/ and baked into sampleStudio.data.json
 *     by `node scripts/build-sample-studio.mjs <board.json>`. Re-running
 *     that swaps the board without touching this file.
 *
 * Before the board is built (data file empty), it falls back to a small
 * built-in starter palette so Shuffle still works.
 *
 * This is baked into the build and copied into localStorage on first
 * load (see lib/storage/localStore.js). Editing it in the browser only
 * touches that visitor’s own copy: every fresh visitor gets a clean
 * seed, and "Reset to sample" restores it.
 */

import data from "./sampleStudio.data.json";

export const SAMPLE_SLUG = "sample";

// Built-in fallback — a warm editorial neutral base with two accents.
// Used only until a real board is built into sampleStudio.data.json.
const STARTER_NEUTRALS = ["#1a1714", "#2e2a25", "#6b6259", "#a99e90", "#d8cfc2", "#f4efe7"];
const STARTER_ACCENTS = ["#7c3a2d", "#b5542f", "#c98a3a", "#3f5a52", "#2f4a6b"];

const FALLBACK_PALETTE = {
  brand: { bg: "#f4efe7", ink: "#1a1714", accent: "#7c3a2d", muted: "#6b6259" },
  inspiration: {
    source: [...STARTER_NEUTRALS, ...STARTER_ACCENTS],
    curated: { Neutrals: STARTER_NEUTRALS, Accents: STARTER_ACCENTS },
  },
};
const FALLBACK_STARRED = ["#7c3a2d", "#1a1714", "#d8cfc2"];

const hasBoard = data && data.count > 0 && data.palette;

export const SAMPLE_PROJECT = {
  name: "Your Brand",
  slug: SAMPLE_SLUG,
  wordmark: "Your Brand",
  period: ".",
  initial: "Y",
  tagline: "A working title, for now.",
  body:
    "This is a sample studio. Rename it, recolor it, or import a Pinterest " +
    "board or Are.na channel to make it yours.",
  fonts: {},
};

export const SAMPLE_LIBRARY = {
  schemaVersion: 1,
  pins: hasBoard ? data.pins : {},
  boards: hasBoard && data.boardName
    ? [{ boardName: data.boardName, count: data.count, importedAt: data.generatedAt }]
    : [],
  starred: hasBoard && data.starred?.length ? data.starred : FALLBACK_STARRED,
  starredPalettes: [],
};

export const SAMPLE_PALETTE = hasBoard ? data.palette : FALLBACK_PALETTE;

/** Fresh deep copies so callers can mutate without touching the seed. */
export function freshSampleProject() {
  return structuredClone(SAMPLE_PROJECT);
}
export function freshSampleLibrary() {
  return structuredClone(SAMPLE_LIBRARY);
}
export function freshSamplePalette() {
  return structuredClone(SAMPLE_PALETTE);
}
