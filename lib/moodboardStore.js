import { readFile, writeFile, mkdir } from "node:fs/promises";
import { existsSync } from "node:fs";
import { join } from "node:path";

const ROOT = process.cwd();
const STORE_DIR = join(ROOT, "data", "moodboard");
const STORE_FILE = join(STORE_DIR, "library.json");

const EMPTY = {
  schemaVersion: 1,
  pins: {},
  boards: [],
  starred: [], // array of lowercase hex strings, in starred-order
};

export async function readLibrary() {
  if (!existsSync(STORE_FILE)) return structuredClone(EMPTY);
  try {
    const raw = await readFile(STORE_FILE, "utf8");
    const parsed = JSON.parse(raw);
    return { ...EMPTY, ...parsed };
  } catch {
    return structuredClone(EMPTY);
  }
}

export async function writeLibrary(lib) {
  await mkdir(STORE_DIR, { recursive: true });
  await writeFile(STORE_FILE, JSON.stringify(lib, null, 2), "utf8");
}

export async function mergePins(incoming, boardMeta) {
  const lib = await readLibrary();
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

  await writeLibrary(lib);
  return { added, updated, total: Object.keys(lib.pins).length };
}

export async function patchPin(pinId, patch) {
  const lib = await readLibrary();
  if (!lib.pins[pinId]) return false;
  lib.pins[pinId] = { ...lib.pins[pinId], ...patch };
  await writeLibrary(lib);
  return true;
}

export async function setStarred(hex, starred) {
  const lib = await readLibrary();
  const h = String(hex || "").toLowerCase().trim();
  if (!/^#[0-9a-f]{6}$/.test(h)) throw new Error("Invalid hex");
  const set = new Set((lib.starred || []).map((x) => x.toLowerCase()));
  if (starred) set.add(h);
  else set.delete(h);
  lib.starred = [...set];
  await writeLibrary(lib);
  return lib.starred;
}

/**
 * If starred is empty (first run), seed it with the supplied list. No-op
 * once any hex has been starred. Safe to call repeatedly.
 */
export async function seedStarredIfEmpty(seedHexes) {
  const lib = await readLibrary();
  if (lib.starred && lib.starred.length > 0) return lib.starred;
  const seeded = [...new Set(seedHexes.map((h) => h.toLowerCase()))];
  lib.starred = seeded;
  await writeLibrary(lib);
  return seeded;
}
