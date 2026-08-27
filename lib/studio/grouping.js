/**
 * Board 2 — where a pile becomes a meaning.
 *
 * Board 1 answers "which of these". Board 2 answers "what are these ABOUT",
 * and that is the conversion event the whole tool is built on (playtest Q5):
 * if names do not come out of piles, sorting does not produce language and the
 * thesis is wrong.
 *
 * So the geometry here serves one gesture: put things near each other, then
 * draw a frame around them. That is affinity mapping, in the order designers
 * actually do it — the cluster comes first and the frame comes second. The
 * previous build had it backwards (make an empty box, then fill it), which is
 * a form, not a gesture.
 *
 * Nothing in here ever groups anything on its own. It can NOTICE that cards
 * are sitting together and offer to draw the frame, but the drawing is always
 * her hand. Same law as carrying.
 */

/** The panel band at the top of every group: name, not-this, the colours. */
export const GROUP_HEAD = 104;

export const GROUP_MIN = { w: 300, h: GROUP_HEAD + 130 };

/** The part of a group that actually holds cards. */
export function groupField(g) {
  return { x: g.x, y: g.y + GROUP_HEAD, w: g.w, h: Math.max(40, g.h - GROUP_HEAD) };
}

export function centerOf(card, size) {
  return { x: card.x + size.w / 2, y: card.y + size.h / 2 };
}

export function inBox(pt, box) {
  return pt.x > box.x && pt.x < box.x + box.w && pt.y > box.y && pt.y < box.y + box.h;
}

/** Cards whose centre sits in this group's field. Membership is spatial, never a list. */
export function membersOf(g, cards, sizeOf) {
  const field = groupField(g);
  return cards.filter((c) => c.board === "groups" && inBox(centerOf(c, sizeOf(c)), field));
}

/* ---- arriving ----------------------------------------------------------- */

/**
 * Carried keeps arrive as a tidy grid, not a scatter.
 *
 * The pile is the right shape for gathering, because a mess invites you to
 * rummage. It is the wrong shape here: sixty-three overlapping cards are
 * unreadable, and this board asks her to SEE a pattern before she can name
 * one. So board 2 opens legible and she makes the mess herself, by pulling
 * clusters out of it.
 */
export function gridPlace(i, box, size, gap = 12, rowH = null) {
  const cols = Math.max(1, Math.floor((box.w + gap) / (size.w + gap)));
  const col = i % cols;
  const row = Math.floor(i / cols);
  // A fixed row height, not each card's own: reference cards vary in height and
  // a per-card rhythm makes the grid rag instead of read.
  const step = rowH ?? size.h + gap;
  return {
    x: Math.round(box.x + col * (size.w + gap)),
    y: Math.round(box.y + row * step),
    rot: 0,
  };
}

/* ---- seeing a grouping form --------------------------------------------- */

/**
 * Single-link clustering over the loose cards, by the gap between their edges
 * rather than their centres — two big cards touching are together; two small
 * ones the same distance apart are not.
 *
 * This is the answer to "nothing helps me see a grouping forming". The tool
 * reflects the cluster her hands already made and offers to draw the frame.
 * It never draws it.
 */
export function looseClusters(cards, groups, sizeOf, { gap = 58, min = 3, max = 12 } = {}) {
  const fields = groups.map(groupField);
  const loose = cards.filter((c) => {
    if (c.board !== "groups") return false;
    const ctr = centerOf(c, sizeOf(c));
    return !fields.some((f) => inBox(ctr, f));
  });
  if (loose.length < min) return [];

  const rects = loose.map((c) => {
    const s = sizeOf(c);
    return { id: c.id, x: c.x, y: c.y, w: s.w, h: s.h };
  });

  const near = (a, b) => {
    const dx = Math.max(0, Math.max(a.x - (b.x + b.w), b.x - (a.x + a.w)));
    const dy = Math.max(0, Math.max(a.y - (b.y + b.h), b.y - (a.y + a.h)));
    return Math.hypot(dx, dy) <= gap;
  };

  const seen = new Set();
  const out = [];
  for (const seed of rects) {
    if (seen.has(seed.id)) continue;
    const stack = [seed];
    const bag = [];
    seen.add(seed.id);
    while (stack.length) {
      const cur = stack.pop();
      bag.push(cur);
      for (const other of rects) {
        if (seen.has(other.id) || !near(cur, other)) continue;
        seen.add(other.id);
        stack.push(other);
      }
    }
    // A cluster that has swallowed the board is not a cluster, it is the board:
    // the arrival grid is one continuous neighbourhood and offering to frame it
    // would be noise. An affinity group is small and it is a minority of what is
    // still loose, or she has not actually separated anything out yet.
    if (bag.length >= min && bag.length <= max && bag.length <= loose.length * 0.5) out.push(bag);
  }
  return out;
}

/** The plain bounds of a set of rects, padded. */
export function boundsOf(rects, pad = 18) {
  const x0 = Math.min(...rects.map((r) => r.x)) - pad;
  const y0 = Math.min(...rects.map((r) => r.y)) - pad;
  const x1 = Math.max(...rects.map((r) => r.x + r.w)) + pad;
  const y1 = Math.max(...rects.map((r) => r.y + r.h)) + pad;
  return { x: Math.round(x0), y: Math.round(y0), w: Math.round(x1 - x0), h: Math.round(y1 - y0) };
}

/** A frame that hugs these cards, with room for the panel above them. */
export function hugBox(rects, pad = 16) {
  const b = boundsOf(rects, pad);
  return {
    x: b.x,
    y: b.y - GROUP_HEAD,
    w: Math.max(GROUP_MIN.w, b.w),
    h: Math.max(GROUP_MIN.h, b.h + GROUP_HEAD),
  };
}

/**
 * The colours this group is actually made of.
 *
 * Not decoration: it is what she names FROM. A group of eight references is
 * eight strips she has to hold in her head at once; pooled, it is one reading
 * she can respond to in a word. Counted rather than deduped, so a colour that
 * runs through every card in the group reads wider than one that appears once.
 */
export function groupStrip(members, max = 8) {
  const tally = new Map();
  for (const c of members) {
    const pal = c.kind === "swatch" ? [c.hex] : (c.palette || []).slice(0, 5);
    for (const hex of pal) {
      if (typeof hex !== "string") continue;
      const key = hex.toLowerCase();
      tally.set(key, (tally.get(key) || 0) + 1);
    }
  }
  return [...tally.entries()]
    .sort((a, b) => b[1] - a[1])
    .slice(0, max)
    .map(([hex, count]) => ({ hex, count }));
}
