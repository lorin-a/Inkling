import { readFile, writeFile, mkdir } from "node:fs/promises";
import { existsSync } from "node:fs";
import { dirname } from "node:path";
import { getActiveSlug, projectLibraryPath } from "./projectRegistry";

const EMPTY = {
  schemaVersion: 1,
  pins: {},
  boards: [],
  starred: [], // array of lowercase hex strings, in starred-order
};

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

export async function writeLibrary(lib, slugOverride) {
  const file = await resolveFile(slugOverride);
  if (!file) throw new Error("No active project");
  await mkdir(dirname(file), { recursive: true });
  await writeFile(file, JSON.stringify(lib, null, 2), "utf8");
}

export async function mergePins(incoming, boardMeta, slugOverride) {
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
}

export async function patchPin(pinId, patch, slugOverride) {
  const lib = await readLibrary(slugOverride);
  if (!lib.pins[pinId]) return false;
  lib.pins[pinId] = { ...lib.pins[pinId], ...patch };
  await writeLibrary(lib, slugOverride);
  return true;
}

export async function setStarred(hex, starred, slugOverride) {
  const lib = await readLibrary(slugOverride);
  const h = String(hex || "").toLowerCase().trim();
  if (!/^#[0-9a-f]{6}$/.test(h)) throw new Error("Invalid hex");
  const set = new Set((lib.starred || []).map((x) => x.toLowerCase()));
  if (starred) set.add(h);
  else set.delete(h);
  lib.starred = [...set];
  await writeLibrary(lib, slugOverride);
  return lib.starred;
}

export async function seedStarredIfEmpty(seedHexes, slugOverride) {
  const lib = await readLibrary(slugOverride);
  if (lib.starred && lib.starred.length > 0) return lib.starred;
  const seeded = [...new Set(seedHexes.map((h) => h.toLowerCase()))];
  lib.starred = seeded;
  await writeLibrary(lib, slugOverride);
  return seeded;
}
