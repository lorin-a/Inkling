import { readFile, writeFile, mkdir, rename } from "node:fs/promises";
import { existsSync } from "node:fs";
import { dirname } from "node:path";
import { getActiveSlug, projectLibraryPath } from "./projectRegistry";

const EMPTY = {
  schemaVersion: 1,
  pins: {},
  boards: [],
  starred: [], // array of lowercase hex strings, in starred-order
  starredPalettes: [], // array of pinIds whose palette the user has rated as a yes
};

// Per-file write queue. Read-modify-write callers wrap their critical
// section in withLock(file, fn) so concurrent batch workers serialize
// instead of racing each other (which corrupted library.json before).
const locks = new Map();
async function withLock(key, fn) {
  const prev = locks.get(key) || Promise.resolve();
  let release;
  const next = new Promise((r) => { release = r; });
  locks.set(key, prev.then(() => next));
  await prev;
  try {
    return await fn();
  } finally {
    release();
    if (locks.get(key) === next) locks.delete(key);
  }
}

async function resolveFile(slugOverride) {
  const slug = slugOverride || (await getActiveSlug());
  if (!slug) return null;
  return projectLibraryPath(slug);
}

export async function readLibrary(slugOverride) {
  const file = await resolveFile(slugOverride);
  if (!file || !existsSync(file)) return structuredClone(EMPTY);
  try {
    const raw = await readFile(file, "utf8");
    return { ...EMPTY, ...JSON.parse(raw) };
  } catch {
    return structuredClone(EMPTY);
  }
}

// Atomic write: stage to a temp file, then rename. Rename is atomic on
// the same filesystem, so partial-write tail garbage is impossible.
export async function writeLibrary(lib, slugOverride) {
  const file = await resolveFile(slugOverride);
  if (!file) throw new Error("No active project");
  await mkdir(dirname(file), { recursive: true });
  const tmp = `${file}.tmp-${process.pid}-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
  await writeFile(tmp, JSON.stringify(lib, null, 2), "utf8");
  await rename(tmp, file);
}

export async function mergePins(incoming, boardMeta, slugOverride) {
  const file = await resolveFile(slugOverride);
  if (!file) throw new Error("No active project");
  return withLock(file, async () => {
    const lib = await readLibrary(slugOverride);
    let added = 0;
    let updated = 0;

    for (const pin of incoming) {
      const id = pin.pinId;
      if (!id) continue;
      const existing = lib.pins[id];
      if (existing) {
        lib.pins[id] = { ...existing, ...pin, addedAt: existing.addedAt };
        updated++;
      } else {
        lib.pins[id] = { ...pin, addedAt: new Date().toISOString(), tags: [] };
        added++;
      }
    }

    if (boardMeta) {
      const existingBoard = lib.boards.find((b) => b.boardUrl === boardMeta.boardUrl);
      if (existingBoard) {
        Object.assign(existingBoard, boardMeta);
      } else {
        lib.boards.push(boardMeta);
      }
    }

    await writeLibrary(lib, slugOverride);
    return { added, updated, total: Object.keys(lib.pins).length };
  });
}

export async function patchPin(pinId, patch, slugOverride) {
  const file = await resolveFile(slugOverride);
  if (!file) return false;
  return withLock(file, async () => {
    const lib = await readLibrary(slugOverride);
    if (!lib.pins[pinId]) return false;
    lib.pins[pinId] = { ...lib.pins[pinId], ...patch };
    await writeLibrary(lib, slugOverride);
    return true;
  });
}

export async function setStarred(hex, starred, slugOverride) {
  const file = await resolveFile(slugOverride);
  if (!file) throw new Error("No active project");
  return withLock(file, async () => {
    const lib = await readLibrary(slugOverride);
    const h = String(hex || "").toLowerCase().trim();
    if (!/^#[0-9a-f]{6}$/.test(h)) throw new Error("Invalid hex");
    const set = new Set((lib.starred || []).map((x) => x.toLowerCase()));
    if (starred) set.add(h);
    else set.delete(h);
    lib.starred = [...set];
    await writeLibrary(lib, slugOverride);
    return lib.starred;
  });
}

export async function setPaletteStar(pinId, starred, slugOverride) {
  const file = await resolveFile(slugOverride);
  if (!file) throw new Error("No active project");
  return withLock(file, async () => {
    const lib = await readLibrary(slugOverride);
    if (!lib.pins[pinId]) throw new Error("Pin not found");
    const set = new Set(lib.starredPalettes || []);
    if (starred) set.add(pinId);
    else set.delete(pinId);
    lib.starredPalettes = [...set];
    await writeLibrary(lib, slugOverride);
    return lib.starredPalettes;
  });
}

export async function seedStarredIfEmpty(seedHexes, slugOverride) {
  const file = await resolveFile(slugOverride);
  if (!file) return [];
  return withLock(file, async () => {
    const lib = await readLibrary(slugOverride);
    if (lib.starred && lib.starred.length > 0) return lib.starred;
    const seeded = [...new Set(seedHexes.map((h) => h.toLowerCase()))];
    lib.starred = seeded;
    await writeLibrary(lib, slugOverride);
    return seeded;
  });
}
