import { apiFetch } from "./api/client";

/**
 * Add the type you kept onto your moodboard, as live specimen text blocks tagged
 * "type" — the tagged-reference model (VISION.md §15). Appends to the active board
 * (the one your colours already landed on), so the canvas grows dimension by
 * dimension instead of you being shipped off to Brand.
 *
 * Each reference lands as ONE self-describing atom — a specimen set in your words
 * with the family + source as a caption inside the block — not a bare specimen plus
 * a mystery second box (the thing Lorin flagged). A pairing lands as a flush
 * name + subhead lockup so you read the two faces together.
 *
 * Items are either:
 *   { kind: "face", family }                — a single typeface
 *   { kind: "pair", display, text }          — a curated two-face pairing
 * plus the `name` (brand name) and optional `subhead` you were setting them in.
 *
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
  try {
    activeId = localStorage.getItem(ACTIVE_KEY);
  } catch {
    /* storage off */
  }
  let board = boards.find((b) => b.id === activeId) || boards[boards.length - 1];
  // No board yet (type-first)? Make one so the type has somewhere to land.
  if (!board) {
    const seedName = list[0]?.family || list[0]?.display || "Untitled";
    const created = await apiFetch("/api/moodboards", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name: seedName }),
    }).then((r) => r.json());
    board = created.board;
    if (!board?.id) throw new Error("Could not create a board for your type.");
    board.blocks = [];
    try {
      localStorage.setItem(ACTIVE_KEY, board.id);
    } catch {
      /* storage off */
    }
  }

  const blocks = [...(board.blocks || [])];
  // Drop the type in a fresh column to the right of whatever's there.
  const maxX = blocks.reduce((m, b) => Math.max(m, (b.x || 0) + (b.w || 0)), 0);
  const x = maxX + 48;
  let y = 40;
  let z = blocks.reduce((m, b) => Math.max(m, b.z || 0), 0) + 1;
  const W = 380;

  for (const it of list) {
    if (it.kind === "pair") {
      // A flush lockup — your name in the display face, your subhead in the text
      // face — so you read the two together. Provenance caption on the subhead.
      blocks.push({
        id: newId(),
        type: "text",
        x, y, w: W, h: 76, z: z++,
        payload: {
          text: brand,
          font: { family: it.display, source: "google" },
          tags: ["type"],
          size: 44,
        },
      });
      y += 80;
      blocks.push({
        id: newId(),
        type: "text",
        x, y, w: W, h: 64, z: z++,
        payload: {
          text: sub || "Your subhead",
          font: { family: it.text, source: "google" },
          tags: ["type", "subhead"],
          size: 20,
          caption: `${it.display} + ${it.text} · Google Fonts`,
        },
      });
      y += 84;
    } else {
      // A single typeface — your name in the face, captioned with family + source.
      const source = it.source || "google";
      const srcName =
        source === "fontshare" ? "Fontshare" : source === "google" ? "Google Fonts" : "your font";
      const font = {
        family: it.family,
        source,
        ...(it.slug ? { slug: it.slug } : {}),
        ...(it.url ? { url: it.url } : {}),
      };
      blocks.push({
        id: newId(),
        type: "text",
        x, y, w: W, h: 96, z: z++,
        payload: {
          text: brand,
          font,
          tags: ["type"],
          size: 40,
          caption: `${it.family} · ${srcName}`,
        },
      });
      y += 100;
    }
  }

  await apiFetch(`/api/moodboards/${board.id}`, {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ blocks }),
  });

  return board;
}
