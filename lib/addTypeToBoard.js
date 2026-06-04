import { apiFetch } from "./api/client";
import { PAD, ZP, ZONES_TOP, ensureZone, membersInZone } from "./boardZones";

/**
 * Add the type you kept to your master board, inside its **Type** zone — so the faces
 * land where colour and imagery already are, sorted, not shipped off to Brand. The
 * curation→board seam (lib/makeDirection.js) seeds the Type zone; this fills it. If you
 * came to /type first, it targets the master board (the project's first board) and makes
 * a Type zone there.
 *
 * Each reference lands as ONE self-describing specimen — set in your words, with the
 * family + source as a caption inside the block. A pairing lands as a flush name + subhead
 * lockup so you read the two faces together.
 *
 * Items are either:
 *   { kind: "face", family }                — a single typeface
 *   { kind: "pair", display, text }          — a curated two-face pairing
 * plus the `name` (brand name) and optional `subhead` you were setting them in.
 * Legacy callers may still pass `{ faces: [{ family }], word }`.
 */

const ACTIVE_KEY = "moodbuilder.moodboard.activeId";

function newId() {
  return `bk_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 7)}`;
}

export async function addTypeToBoard({ items, faces, name, word, subhead = "" } = {}) {
  // Normalize the legacy `{ faces, word }` shape into items + name.
  const list = items || (faces || []).map((f) => ({ kind: "face", family: f.family }));
  const brand = (name || word || "Your Brand").trim() || "Your Brand";
  const sub = (subhead || "").trim();
  if (!list.length) return null;

  const data = await apiFetch("/api/moodboards", { cache: "no-store" }).then((r) => r.json());
  const boards = data.boards || [];
  let activeId = null;
  try { activeId = localStorage.getItem(ACTIVE_KEY); } catch { /* storage off */ }
  // The master is the active board if set, else the project's first board — the same
  // board the curation seam targets, so type joins colour + imagery, not a stray canvas.
  let board = boards.find((b) => b.id === activeId) || boards[0] || null;
  if (!board) {
    const created = await apiFetch("/api/moodboards", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name: "Untitled" }),
    }).then((r) => r.json());
    board = created.board;
    if (!board?.id) throw new Error("Could not create a board for your type.");
    board.blocks = [];
    board.sections = [];
    try { localStorage.setItem(ACTIVE_KEY, board.id); } catch { /* storage off */ }
  }

  const blocks = [...(board.blocks || [])];
  const sections = (board.sections || []).map((s) => ({ ...s }));
  let z = blocks.reduce((m, b) => Math.max(m, b.z || 0), 0) + 1;

  // The Type zone: created by the curation seam, or here if you came to type first.
  const typeZone = ensureZone(sections, "Type", { x: PAD, y: ZONES_TOP, w: 400, h: 260 });
  const W = Math.max(220, typeZone.w - 2 * ZP);
  const x = typeZone.x + ZP;
  // Stack new specimens beneath whatever type is already in the zone.
  const existing = membersInZone(typeZone, blocks, "text");
  let y = existing.reduce((m, b) => Math.max(m, b.y + b.h), typeZone.y + ZP) + (existing.length ? 16 : 0);

  for (const it of list) {
    if (it.kind === "pair") {
      blocks.push({
        id: newId(), type: "text", x, y, w: W, h: 76, z: z++,
        payload: { text: brand, font: { family: it.display, source: "google" }, tags: ["type"], size: 44 },
      });
      y += 80;
      blocks.push({
        id: newId(), type: "text", x, y, w: W, h: 64, z: z++,
        payload: { text: sub || "Your subhead", font: { family: it.text, source: "google" }, tags: ["type", "subhead"], size: 20, caption: `${it.display} + ${it.text} · Google Fonts` },
      });
      y += 84;
    } else {
      const source = it.source || "google";
      const srcName = source === "fontshare" ? "Fontshare" : source === "google" ? "Google Fonts" : "your font";
      const font = { family: it.family, source, ...(it.slug ? { slug: it.slug } : {}), ...(it.url ? { url: it.url } : {}) };
      blocks.push({
        id: newId(), type: "text", x, y, w: W, h: 96, z: z++,
        payload: { text: brand, font, tags: ["type"], size: 40, caption: `${it.family} · ${srcName}` },
      });
      y += 100;
    }
  }

  // Grow the zone to hold the new specimens.
  typeZone.h = Math.max(typeZone.h, y - typeZone.y + ZP);

  await apiFetch(`/api/moodboards/${board.id}`, {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ blocks, sections }),
  });

  return board;
}
