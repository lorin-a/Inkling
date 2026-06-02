import { apiFetch } from "./api/client";
import { colorName } from "./nameThatColor";

/**
 * Turn what resonated into a *direction* — a real moodboard built from the pins you
 * kept, the colours you gathered, and your own words about why they cohere. This is
 * the seam that stops recognition from being an island: the direction is a
 * `moodboards` board (so it opens in the canvas) whose swatches + pinned references
 * feed the Brand studio through the shipped Board → Brand seam.
 *
 * Principles honoured (see VISION.md): your words are authored by you and placed
 * verbatim; credit/source is preserved on every reference; nothing is invented — the
 * board is only what you kept and gathered, laid out cleanly so it reads as yours.
 */

const ACTIVE_KEY = "moodbuilder.moodboard.activeId";

function newId() {
  return `bk_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 7)}`;
}

function truncate(s, n) {
  const t = s.trim().replace(/\s+/g, " ");
  return t.length > n ? `${t.slice(0, n - 1).trimEnd()}…` : t;
}

// Preload each reference so the board lays out at true aspect — references read
// honest, not cropped to squares. Falls back to 1:1 on error or a slow image.
function preloadRatios(srcs) {
  return Promise.all(
    srcs.map(
      (src) =>
        new Promise((resolve) => {
          if (!src || typeof Image === "undefined") return resolve(1);
          let settled = false;
          const done = (r) => {
            if (!settled) {
              settled = true;
              resolve(r && isFinite(r) && r > 0 ? r : 1);
            }
          };
          const img = new Image();
          img.onload = () => done(img.naturalWidth / img.naturalHeight);
          img.onerror = () => done(1);
          setTimeout(() => done(1), 4000);
          img.src = src;
        }),
    ),
  );
}

/**
 * Build the board document (name + blocks) — pure layout, no network.
 * Returns { name, blocks }.
 */
export async function buildDirectionBoard({ pins = [], colours = [], reflectionYes = "", reflectionNo = "" }) {
  const PAD = 40;
  const GAP = 18;
  const COL_W = 230;
  const COLS = Math.min(4, Math.max(2, Math.round(Math.sqrt(Math.max(pins.length, 1)))));
  const boardW = COLS * COL_W + (COLS - 1) * GAP;

  const blocks = [];
  let z = 1;
  let cursorY = PAD;

  // 1 — your words, verbatim, at the top. The heart of the direction.
  const yes = reflectionYes.trim();
  const no = reflectionNo.trim();
  if (yes || no) {
    const noteText = [yes, no ? `Not this: ${no}` : ""].filter(Boolean).join("\n\n");
    const noteH = Math.min(220, Math.max(96, 56 + Math.ceil(noteText.length / 52) * 22));
    blocks.push({
      id: newId(),
      type: "text",
      x: PAD,
      y: cursorY,
      w: boardW,
      h: noteH,
      z: z++,
      payload: { text: noteText },
    });
    cursorY += noteH + GAP;
  }

  // 2 — the colours you gathered, as a compact palette block (tight so it reads as a
  //     swatch card, not a wall — and the references sit right beneath it).
  const SW = 58;
  const SGAP = 10;
  const valid = colours.filter((h) => /^#[0-9a-fA-F]{6}$/.test(h)).map((h) => h.toLowerCase());
  if (valid.length) {
    const perRow = Math.max(1, Math.floor((boardW + SGAP) / (SW + SGAP)));
    valid.forEach((hex, i) => {
      const col = i % perRow;
      const row = Math.floor(i / perRow);
      blocks.push({
        id: newId(),
        type: "swatch",
        x: PAD + col * (SW + SGAP),
        y: cursorY + row * (SW + SGAP),
        w: SW,
        h: SW,
        z: z++,
        payload: { hex, name: colorName(hex).name, style: "plain" },
      });
    });
    const rows = Math.ceil(valid.length / perRow);
    cursorY += rows * (SW + SGAP) + GAP;
  }

  // 3 — the references you kept, masonry by true aspect (shortest column first),
  //     each with its source preserved.
  const ratios = await preloadRatios(pins.map((p) => p.thumbnail || p.imageDisplay || p.imageOriginal));
  const colHeights = new Array(COLS).fill(cursorY);
  pins.forEach((p, i) => {
    const ratio = ratios[i] || 1;
    const w = COL_W;
    const h = Math.round(COL_W / ratio);
    let col = 0;
    for (let c = 1; c < COLS; c++) if (colHeights[c] < colHeights[col]) col = c;
    const x = PAD + col * (COL_W + GAP);
    const y = colHeights[col];
    blocks.push({
      id: newId(),
      type: "image",
      x,
      y,
      w,
      h,
      z: z++,
      payload: {
        src: p.thumbnail || p.imageDisplay || p.imageOriginal,
        sourceUrl: p.sourceUrl || p.pinUrl || null,
        pinId: p.pinId,
        credit: p.pinner || p.sourceDomain || p.title || "source",
        sourceDomain: p.sourceDomain || null,
        ratio,
        focal: { x: 0.5, y: 0.5 },
        zoom: 1,
      },
    });
    colHeights[col] = y + h + GAP;
  });

  // A short, evocative, editable name from the lead color — never a long string of
  // the reflection (that lives in the note). Rename it on the board anytime.
  const name = valid[0] ? colorName(valid[0]).name : "Untitled";

  return { name, blocks };
}

/**
 * Create the direction: build the board, persist it (POST + PUT through the existing
 * moodboards API, so it works authed and signed-out), and make it the active board
 * so it opens in the canvas and feeds Brand. Returns the board.
 */
export async function createDirection(input) {
  const { name, blocks } = await buildDirectionBoard(input);

  const created = await apiFetch("/api/moodboards", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ name }),
  }).then((r) => r.json());

  const board = created.board;
  if (!board?.id) throw new Error("Could not create the direction.");

  await apiFetch(`/api/moodboards/${board.id}`, {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ name, blocks }),
  });

  try {
    localStorage.setItem(ACTIVE_KEY, board.id);
  } catch {
    /* storage off — the board still exists; Brand falls back to most-recent */
  }

  return { ...board, name, blocks };
}
