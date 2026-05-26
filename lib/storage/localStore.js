"use client";

/**
 * Anonymous (signed-out) storage backend.
 *
 * Mirrors the server's persistence routes, but every read/write lands in
 * the visitor's own localStorage instead of Postgres. The editor never
 * calls these directly — it goes through lib/api/client.js (apiFetch),
 * which routes to here when there's no session. That keeps the UI
 * identical across signed-in (DB) and signed-out (local) modes.
 *
 * Storage is per-browser and fully private: one visitor's edits never
 * touch the seed or anyone else's view. The only shared state in the
 * product lives in the DB, behind sign-in.
 */

import {
  SAMPLE_SLUG,
  freshSampleProject,
  freshSampleLibrary,
  freshSamplePalette,
} from "../sampleStudio";

const KEYS = {
  seeded: "moodbuilder.local.seeded.v1",
  project: "moodbuilder.local.project.v1",
  library: "moodbuilder.local.library.v1",
  palette: "moodbuilder.local.palette.v1",
  activeSlug: "moodbuilder.local.activeSlug.v1",
  presets: "moodbuilder.local.presets.v1",
};

const PROJECT_DEFAULTS = {
  name: "Untitled",
  slug: "",
  wordmark: "wordmark",
  period: ".",
  initial: "w",
  tagline: "",
  body: "",
  fonts: {},
};

// ---------------------------------------------------------------- helpers

function read(key, fallback) {
  try {
    const raw = localStorage.getItem(key);
    return raw == null ? fallback : JSON.parse(raw);
  } catch {
    return fallback;
  }
}

function write(key, value) {
  try {
    localStorage.setItem(key, JSON.stringify(value));
  } catch {
    // Quota exceeded or storage disabled — silently no-op. The UI keeps
    // its in-memory state; only cross-reload persistence is lost.
  }
}

/**
 * Seed the sample studio into localStorage on first ever visit. Idempotent:
 * once seeded, real edits are never clobbered. `resetToSample()` is the
 * explicit way back to a clean seed.
 */
export function ensureSeeded() {
  if (read(KEYS.seeded, false)) return;
  write(KEYS.project, freshSampleProject());
  write(KEYS.library, freshSampleLibrary());
  write(KEYS.palette, freshSamplePalette());
  write(KEYS.activeSlug, SAMPLE_SLUG);
  write(KEYS.seeded, true);
}

/** Restore the original sample, discarding all local edits. */
export function resetToSample() {
  write(KEYS.project, freshSampleProject());
  write(KEYS.library, freshSampleLibrary());
  write(KEYS.palette, freshSamplePalette());
  write(KEYS.presets, []);
  write(KEYS.activeSlug, SAMPLE_SLUG);
  write(KEYS.seeded, true);
}

function getProjectRaw() {
  ensureSeeded();
  return { ...PROJECT_DEFAULTS, ...read(KEYS.project, freshSampleProject()) };
}
function getLibraryRaw() {
  ensureSeeded();
  return read(KEYS.library, freshSampleLibrary());
}
function getPaletteRaw() {
  ensureSeeded();
  const p = read(KEYS.palette, freshSamplePalette());
  return {
    brand: p.brand || {},
    inspiration: {
      source: p.inspiration?.source || [],
      curated: p.inspiration?.curated || {},
    },
  };
}

// ---------------------------------------------------------------- project

export function getProject() {
  return getProjectRaw();
}

export function patchProject(patch = {}) {
  const current = getProjectRaw();
  const next = { ...current, ...patch, slug: current.slug || SAMPLE_SLUG };
  for (const k of ["name", "wordmark", "period", "initial", "tagline", "body"]) {
    if (typeof next[k] === "string") next[k] = next[k].slice(0, 400);
  }
  write(KEYS.project, next);
  return next;
}

export function listProjects() {
  const p = getProjectRaw();
  const lib = getLibraryRaw();
  const pal = getPaletteRaw();
  // A few swatches so the home card reads as a brand, not a generic button.
  const brand = pal.brand || {};
  const swatches = [brand.bg, brand.accent, brand.muted, brand.ink].filter(Boolean);
  return [{
    slug: p.slug || SAMPLE_SLUG,
    name: p.name,
    wordmark: p.wordmark,
    pins: Object.keys(lib.pins || {}).length,
    swatches: swatches.length ? swatches : (pal.inspiration?.source || []).slice(0, 4),
  }];
}

export function getActiveSlug() {
  ensureSeeded();
  return read(KEYS.activeSlug, SAMPLE_SLUG);
}

export function setActiveSlug(slug) {
  // Single-project local mode: only the sample slug exists. Accept it,
  // reject anything else so the UI surfaces a sensible error.
  if (slug !== getActiveSlug()) {
    throw new Error("Sign in to keep more than one project");
  }
  write(KEYS.activeSlug, slug);
  return slug;
}

// ---------------------------------------------------------------- library

export function readLibrary() {
  const lib = getLibraryRaw();
  return {
    schemaVersion: lib.schemaVersion || 1,
    pins: lib.pins || {},
    boards: lib.boards || [],
    starred: lib.starred || [],
    starredPalettes: lib.starredPalettes || [],
  };
}

function writeLibrary(lib) {
  write(KEYS.library, lib);
  return lib;
}

export function setColorStar(hex, starred) {
  const lib = readLibrary();
  const h = String(hex).toLowerCase();
  const set = new Set((lib.starred || []).map((x) => x.toLowerCase()));
  if (starred) set.add(h);
  else set.delete(h);
  lib.starred = [...set];
  writeLibrary(lib);
  return lib.starred;
}

export function setPaletteStar(pinId, starred) {
  const lib = readLibrary();
  const set = new Set(lib.starredPalettes || []);
  if (starred) set.add(pinId);
  else set.delete(pinId);
  lib.starredPalettes = [...set];
  writeLibrary(lib);
  return lib.starredPalettes;
}

/**
 * Merge an incoming batch of Pinterest pins (from the bookmarklet JSON)
 * into the local library. Mirrors moodboardStore.mergePins' return shape:
 * { added, updated, total }.
 */
export function mergePins(incoming = [], boardMeta = {}) {
  const lib = readLibrary();
  const pins = { ...lib.pins };
  let added = 0;
  let updated = 0;
  for (const pin of incoming) {
    if (!pin?.pinId) continue;
    if (pins[pin.pinId]) {
      pins[pin.pinId] = { ...pins[pin.pinId], ...pin };
      updated += 1;
    } else {
      pins[pin.pinId] = { ...pin, addedAt: new Date().toISOString() };
      added += 1;
    }
  }
  lib.pins = pins;
  if (boardMeta?.boardUrl || boardMeta?.boardName) {
    const boards = lib.boards.filter((b) => b.boardUrl !== boardMeta.boardUrl);
    boards.push(boardMeta);
    lib.boards = boards;
  }
  writeLibrary(lib);
  return { added, updated, total: Object.keys(pins).length };
}

export function patchPin(pinId, patch = {}) {
  const lib = readLibrary();
  if (!lib.pins[pinId]) return null;
  lib.pins[pinId] = { ...lib.pins[pinId], ...patch };
  writeLibrary(lib);
  return lib.pins[pinId];
}

// ---------------------------------------------------------------- palette

export function readProjectPalette() {
  return getPaletteRaw();
}

export function writeProjectPalette(data) {
  write(KEYS.palette, data);
  return data;
}

// ---------------------------------------------------------------- presets

export function readPresets() {
  ensureSeeded();
  return read(KEYS.presets, []);
}

export function addPreset(preset = {}) {
  const presets = readPresets();
  const id = `p_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 6)}`;
  const entry = {
    id,
    name: String(preset.name || "Untitled preset").slice(0, 80),
    ts: new Date().toISOString(),
    palette: Array.isArray(preset.palette) ? preset.palette : [],
    size: Number.isFinite(preset.size) ? preset.size : (preset.palette?.length || 5),
    poolKey: typeof preset.poolKey === "string" ? preset.poolKey : "starred",
    roleOverrides: preset.roleOverrides || { dark: {}, light: {} },
    fonts: preset.fonts || {},
    textures: preset.textures || {},
  };
  write(KEYS.presets, [entry, ...presets].slice(0, 100));
  return entry;
}

export function removePreset(id) {
  const next = readPresets().filter((p) => p.id !== id);
  write(KEYS.presets, next);
  return next;
}

/**
 * Replicates GET /api/library/palette's aggregation — the big pool the
 * Brand and Colors pages shuffle and browse. Kept byte-compatible with
 * the server route so the client hooks don't care which backend answered.
 */
export function buildPaletteResponse() {
  const projectPalette = getPaletteRaw();
  const lib = readLibrary();

  const seen = new Set();
  const pool = [];
  const sourceMap = {};
  const starredPaletteSet = new Set(lib.starredPalettes || []);
  const pinPalettes = [];

  for (const pin of Object.values(lib.pins || {})) {
    if (!pin.palette || !Array.isArray(pin.palette) || pin.palette.length === 0) continue;

    pinPalettes.push({
      pinId: pin.pinId,
      palette: pin.palette,
      thumbnail: pin.thumbnail236 || pin.imageDisplay || pin.imageOriginal,
      pinUrl: pin.pinUrl,
      sourceUrl: pin.sourceUrl,
      sourceDomain: pin.sourceDomain,
      title: pin.title,
      addedAt: pin.addedAt,
      starred: starredPaletteSet.has(pin.pinId),
    });

    for (const hex of pin.palette.slice(0, 4)) {
      const h = hex.toLowerCase();
      if (seen.has(h)) {
        sourceMap[h].push(pin.pinId);
        continue;
      }
      seen.add(h);
      pool.push(h);
      sourceMap[h] = [pin.pinId];
    }
  }

  pinPalettes.sort((a, b) => {
    if (a.starred !== b.starred) return a.starred ? -1 : 1;
    return (b.addedAt || "").localeCompare(a.addedAt || "");
  });

  return {
    count: pool.length,
    palette: pool,
    sourceMap,
    starred: lib.starred || [],
    brand: Object.values(projectPalette.brand || {}),
    brandEntries: Object.entries(projectPalette.brand || {}),
    curated: projectPalette.inspiration?.curated || {},
    sourcePool: projectPalette.inspiration?.source || [],
    pinPalettes,
    starredPalettes: lib.starredPalettes || [],
  };
}
