import { readFile, writeFile, mkdir, rename } from "node:fs/promises";
import { existsSync } from "node:fs";
import { dirname } from "node:path";
import { getActiveSlug, projectMoodboardsPath } from "./projectRegistry";

/**
 * File-based moodboard (canvas) store for the active project.
 *
 * Mirrors lib/moodboardStore.js (the library store) in shape — per-file
 * write lock, atomic temp+rename writes — but persists the spatial canvases
 * to data/projects/{slug}/moodboards.json:
 *
 *   { schemaVersion, boards: [ { id, name, createdAt, updatedAt, blocks:[…] } ] }
 *
 * "boards" here means canvases, NOT the Pinterest-capture `boards` array in
 * library.json. Blocks are our own data; image blocks carry their pin's
 * source URL + credit inline.
 */

const EMPTY = { schemaVersion: 1, boards: [] };

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
  return projectMoodboardsPath(slug);
}

function newId(prefix = "b") {
  return `${prefix}_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 8)}`;
}

async function readDoc(slugOverride) {
  const file = await resolveFile(slugOverride);
  if (!file || !existsSync(file)) return structuredClone(EMPTY);
  try {
    const raw = await readFile(file, "utf8");
    return { ...EMPTY, ...JSON.parse(raw) };
  } catch {
    return structuredClone(EMPTY);
  }
}

async function writeDoc(doc, slugOverride) {
  const file = await resolveFile(slugOverride);
  if (!file) throw new Error("No active project");
  await mkdir(dirname(file), { recursive: true });
  const tmp = `${file}.tmp-${process.pid}-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
  await writeFile(tmp, JSON.stringify(doc, null, 2), "utf8");
  await rename(tmp, file);
}

export async function listBoards(slugOverride) {
  const doc = await readDoc(slugOverride);
  return doc.boards || [];
}

export async function getBoard(id, slugOverride) {
  const doc = await readDoc(slugOverride);
  return (doc.boards || []).find((b) => b.id === id) || null;
}

export async function createBoard({ name } = {}, slugOverride) {
  const file = await resolveFile(slugOverride);
  if (!file) throw new Error("No active project");
  return withLock(file, async () => {
    const doc = await readDoc(slugOverride);
    const now = new Date().toISOString();
    const board = {
      id: newId(),
      name: String(name || "Untitled board").slice(0, 120),
      createdAt: now,
      updatedAt: now,
      blocks: [],
    };
    doc.boards = [...(doc.boards || []), board];
    await writeDoc(doc, slugOverride);
    return board;
  });
}

export async function saveBoard(id, patch = {}, slugOverride) {
  const file = await resolveFile(slugOverride);
  if (!file) throw new Error("No active project");
  return withLock(file, async () => {
    const doc = await readDoc(slugOverride);
    const board = (doc.boards || []).find((b) => b.id === id);
    if (!board) return null;
    if (typeof patch.name === "string") board.name = patch.name.slice(0, 120);
    if (Array.isArray(patch.blocks)) board.blocks = patch.blocks;
    if ("background" in patch) board.background = patch.background || null;
    board.updatedAt = new Date().toISOString();
    await writeDoc(doc, slugOverride);
    return board;
  });
}

export async function deleteBoard(id, slugOverride) {
  const file = await resolveFile(slugOverride);
  if (!file) throw new Error("No active project");
  return withLock(file, async () => {
    const doc = await readDoc(slugOverride);
    doc.boards = (doc.boards || []).filter((b) => b.id !== id);
    await writeDoc(doc, slugOverride);
    return true;
  });
}
