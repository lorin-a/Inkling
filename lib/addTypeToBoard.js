import { apiFetch } from "./api/client";

/**
 * Add the type you kept onto your moodboard, as live specimen text blocks tagged
 * "type" — the first use of the tagged-reference model (VISION.md §15). Appends to
 * the active board (the one your colours already landed on), so the canvas grows
 * dimension by dimension instead of you being shipped off to Brand.
 */

const ACTIVE_KEY = "moodbuilder.moodboard.activeId";

function newId() {
  return `bk_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 7)}`;
}

export async function addTypeToBoard({ pairings = [], wordmark = "Your Brand" } = {}) {
  if (!pairings.length) return null;

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
    const created = await apiFetch("/api/moodboards", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name: pairings[0]?.display || "Untitled" }),
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

  for (const p of pairings) {
    // Headline specimen — the wordmark in the display face.
    blocks.push({
      id: newId(),
      type: "text",
      x,
      y,
      w: 340,
      h: 96,
      z: z++,
      payload: {
        text: wordmark,
        font: { family: p.display, source: "google" },
        tags: ["type"],
      },
    });
    y += 104;
    // Label — the pairing, in the text face.
    blocks.push({
      id: newId(),
      type: "text",
      x,
      y,
      w: 340,
      h: 44,
      z: z++,
      payload: {
        text: p.display === p.text ? p.display : `${p.display} + ${p.text}`,
        font: { family: p.text, source: "google" },
        tags: ["type", "label"],
      },
    });
    y += 64;
  }

  await apiFetch(`/api/moodboards/${board.id}`, {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ blocks }),
  });

  return board;
}
