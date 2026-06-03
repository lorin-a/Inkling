import { readFile, writeFile, mkdir, rename } from "node:fs/promises";
import { existsSync } from "node:fs";
import { dirname } from "node:path";
import { atomsWellPath } from "./projectRegistry";

/**
 * File-based "well" — the cross-project library of tagged references (VISION §15).
 * Mirrors lib/boardsStore.js (per-file write lock, atomic temp+rename), but the
 * well is a SINGLE top-level document (data/atoms-well.json), not per-project,
 * because atoms span every project for a tenant.
 *
 *   { schemaVersion, atoms: [ { id, kind, dimension, tags[], visual{}, source{}, createdAt, updatedAt } ] }
 */

const EMPTY = { schemaVersion: 1, atoms: [] };

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

function newId() {
  return `at_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 7)}`;
}

async function readDoc() {
  const file = atomsWellPath();
  if (!existsSync(file)) return structuredClone(EMPTY);
  try {
    return { ...EMPTY, ...JSON.parse(await readFile(file, "utf8")) };
  } catch {
    return structuredClone(EMPTY);
  }
}

async function writeDoc(doc) {
  const file = atomsWellPath();
  await mkdir(dirname(file), { recursive: true });
  const tmp = `${file}.tmp-${process.pid}-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
  await writeFile(tmp, JSON.stringify(doc, null, 2), "utf8");
  await rename(tmp, file);
}

export async function listAtoms({ dimension } = {}) {
  const doc = await readDoc();
  const all = doc.atoms || [];
  return dimension ? all.filter((a) => a.dimension === dimension) : all;
}

export async function createAtom({ atom }) {
  return withLock(atomsWellPath(), async () => {
    const doc = await readDoc();
    const now = new Date().toISOString();
    const a = atom || {};
    const record = {
      id: newId(),
      kind: a.kind || "image",
      dimension: a.dimension || "",
      tags: Array.isArray(a.tags) ? a.tags : [],
      visual: a.visual || {},
      source: a.source || {},
      createdAt: now,
      updatedAt: now,
    };
    doc.atoms = [record, ...(doc.atoms || [])]; // newest first, like the DB order
    await writeDoc(doc);
    return record;
  });
}

export async function updateAtom({ id, patch = {} }) {
  return withLock(atomsWellPath(), async () => {
    const doc = await readDoc();
    const atom = (doc.atoms || []).find((a) => a.id === id);
    if (!atom) return null;
    if (Object.prototype.hasOwnProperty.call(patch, "dimension")) atom.dimension = String(patch.dimension || "");
    if (Array.isArray(patch.tags)) atom.tags = patch.tags;
    atom.updatedAt = new Date().toISOString();
    await writeDoc(doc);
    return atom;
  });
}

export async function deleteAtom({ id }) {
  return withLock(atomsWellPath(), async () => {
    const doc = await readDoc();
    doc.atoms = (doc.atoms || []).filter((a) => a.id !== id);
    await writeDoc(doc);
    return true;
  });
}
