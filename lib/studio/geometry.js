/**
 * Where cards sit, and why.
 *
 * Two modes. Before any vote the board is a free PILE — the mess Lorin loves,
 * with an opt-in tidy for people who don't. Once voting starts the board
 * becomes COLUMNS, and the leftmost column is what has not been looked at yet:
 * it visibly shrinks as she votes, which is the whole point ("I would like to
 * see the pile go down and not overwhelm").
 *
 * Cards the user has moved by hand are never re-placed. The tool arranges only
 * what the user has not claimed.
 */

export const PILE = { x: 90, y: 108, w: 1560, h: 1040 };
export const GROUPS = { x: 1830, y: 108, w: 1420, h: 1040 };
export const CANVAS = { w: GROUPS.x + GROUPS.w + 90, h: PILE.y + PILE.h + 120 };

/**
 * The working area inside board 2: where carried cards land and groups get drawn.
 *
 * It starts well below the board's top edge because every group carries its
 * name above itself, and a group made from the first row of the grid needs
 * somewhere for that name to live.
 */
export const FIELD = { x: GROUPS.x + 30, y: GROUPS.y + 130, w: GROUPS.w - 60, h: GROUPS.h - 170 };

/**
 * Board 2 shows cards smaller than board 1, on purpose.
 *
 * On board 1 she is judging one image at a time and needs to see it. On board 2
 * she is reading a pattern across sixty of them at once, and a card that fills
 * the eye stops the pattern from surfacing. Smaller cards are the difference
 * between a wall she can scan and a wall she has to tour. Zoom still exists for
 * when she wants the detail back.
 */
export const BOARD2_SCALE = 0.72;
/**
 * One fixed row for the arrival grid, so ragged card heights do not rag it.
 * The extra air over the tallest card is not decoration: a frame drawn around
 * one row has to clear the row beneath it or the group looks like it is
 * cutting through its neighbours.
 */
export const BOARD2_ROW = 148;

export const LANES = ["unsorted", "keep", "maybe", "no"];
export const LANE_LABEL = { unsorted: "Not looked at yet", keep: "Keep", maybe: "Maybe", no: "No" };

// Proportions of the board each column gets. "no" is a collapsed deck by
// default so it needs almost nothing; "keep" earns the most room because it is
// the material that survives.
const WEIGHT = { unsorted: 1.5, keep: 1.15, maybe: 0.85, no: 0.5 };

export function hash(str) {
  let h = 2166136261;
  for (let i = 0; i < str.length; i += 1) {
    h ^= str.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return (h >>> 0) / 4294967295;
}

export function cardSize(card, board) {
  const on = board || card.board;
  const k = on === "groups" ? BOARD2_SCALE : 1;
  if (card.kind === "swatch") return { w: Math.round(76 * k), h: Math.round(94 * k) };
  const h = 104 + Math.round(hash(card.id + "h") * 58);
  return { w: Math.round(118 * k), h: Math.round(h * k) };
}

/* ---- free pile ---------------------------------------------------------- */

export function scatter(id, i, n, box, size) {
  const a = hash(id + "x");
  const b = hash(id + "y");
  const c = hash(id + "r");
  const cx = box.x + box.w / 2;
  const cy = box.y + box.h / 2;
  const t = (i + 1) / (n + 1);
  // sqrt keeps density even across the disc; a floor here would open a hole in
  // the middle and read as a wreath rather than a pile.
  const ring = Math.sqrt(t);
  const angle = t * Math.PI * 2 * 7.3 + a * 1.7;
  return {
    x: Math.round(cx + Math.cos(angle) * (box.w - size.w) * 0.5 * ring * (0.55 + 0.45 * a) - size.w / 2),
    y: Math.round(cy + Math.sin(angle) * (box.h - size.h) * 0.5 * ring * (0.55 + 0.45 * b) - size.h / 2),
    rot: (c - 0.5) * 17,
  };
}

export function tidy(i, n, box, size) {
  const cols = Math.max(1, Math.floor(box.w / (size.w + 14)));
  const col = i % cols;
  const row = Math.floor(i / cols);
  const rowH = 150;
  return {
    x: Math.round(box.x + 8 + col * (size.w + 14)),
    y: Math.round(box.y + 8 + row * rowH),
    rot: 0,
  };
}

/* ---- columns ------------------------------------------------------------ */

/** Column frames for the lanes that currently hold anything. */
export function laneBoxes(counts) {
  const live = LANES.filter((l) => counts[l] > 0);
  if (!live.length) return {};
  const total = live.reduce((sum, l) => sum + WEIGHT[l], 0);
  const gap = 22;
  const usable = PILE.w - gap * (live.length + 1);
  const out = {};
  let x = PILE.x + gap;
  for (const lane of live) {
    const w = (usable * WEIGHT[lane]) / total;
    out[lane] = { x: Math.round(x), y: PILE.y + 16, w: Math.round(w), h: PILE.h - 32 };
    x += w + gap;
  }
  return out;
}

/**
 * Place one card inside its lane.
 * - keep    → spread, so you can look at it as a set
 * - maybe   → a loose fan, present but not demanding
 * - no      → a physical deck, one card thick, unless expanded
 * - unsorted→ still a pile
 */
export function placeInLane(card, lane, i, n, box, expanded) {
  const size = cardSize(card);
  const inner = { x: box.x + 12, y: box.y + 56, w: box.w - 24, h: box.h - 72 };

  if (lane === "no" && !expanded) {
    const j = Math.min(i, 12);
    return {
      x: Math.round(inner.x + inner.w / 2 - size.w / 2 + j * 1.1),
      y: Math.round(inner.y + 40 + j * 1.6),
      rot: (hash(card.id + "d") - 0.5) * 5,
    };
  }

  if (lane === "maybe" && !expanded) {
    const cols = Math.max(1, Math.floor(inner.w / 46));
    const col = i % cols;
    const row = Math.floor(i / cols);
    return {
      x: Math.round(inner.x + col * 46),
      y: Math.round(inner.y + row * 34),
      rot: (hash(card.id + "f") - 0.5) * 9,
    };
  }

  return scatter(card.id + lane, i, n, inner, size);
}
