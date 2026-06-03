/**
 * The tagged-reference atom — one normalized record for everything you pull into
 * the well (VISION §15): a visual (a cropped region of an image, a color, or a
 * type specimen) + the user's tags + its dimension + unbroken provenance.
 *
 * An atom is NOT a new block type. On a board it instantiates as an ordinary
 * block (image / swatch / text), so crop, finish, layering, and the credit link
 * all work unchanged — the atom is the *well record*, the block is its *on-board
 * instance*, soft-linked by `atomId`.
 *
 * Shape:
 *   {
 *     id,            // "at_…" — stable; a future votes.target_type='reference'
 *                    //   / comments address THIS id with no remodel
 *     kind,          // "image" | "color" | "type"
 *     dimension,     // a slug from lib/canvasDimensions (type|color|imagery|…)
 *     tags,          // string[] — the user's words (never an auto-verdict)
 *     visual,        // image:{src,ratio,crop:{focal:{x,y},zoom}}
 *                    //   color:{hex,name} · type:{text,font,size}
 *     source: { sourceUrl, sourceDomain, credit, pinId, projectId },  // preserved
 *     createdAt, updatedAt,   // stamped by the store on create
 *   }
 *
 * The atomFrom* builders return DRAFTS (no id / timestamps) — the store assigns
 * those on create, so ids and times have one owner.
 */

const rand = () => Math.random().toString(36).slice(2, 7);

export function newAtomId() {
  return `at_${Date.now().toString(36)}_${rand()}`;
}
function newBlockId() {
  return `bk_${Date.now().toString(36)}_${rand()}`;
}

const DEFAULT_BASE_WIDTH = 260;

/** A cropped region of an image block → an image atom draft (the block's crop IS
 *  the atom's visual; no re-crop, no pixel read, so cross-origin is fine). */
export function atomFromImageBlock(block, { projectId = null, dimension = "", tags = [] } = {}) {
  const p = block?.payload || {};
  return {
    kind: "image",
    dimension,
    tags,
    visual: {
      src: p.src,
      ratio: p.ratio || 1,
      crop: { focal: p.focal || { x: 0.5, y: 0.5 }, zoom: p.zoom || 1 },
    },
    source: {
      sourceUrl: p.sourceUrl || null,
      sourceDomain: p.sourceDomain || null,
      credit: p.credit || p.sourceDomain || "source",
      pinId: p.pinId || null,
      projectId,
    },
  };
}

/** A whole library pin (no crop) → an image atom draft. Caller passes `ratio`
 *  (preload the image, as the board's addPin does) so thumbnails frame right. */
export function atomFromPin(pin, { projectId = null, dimension = "", tags = [], ratio = 1 } = {}) {
  const src = pin?.imageDisplay || pin?.thumbnail236 || pin?.imageOriginal || pin?.src;
  return {
    kind: "image",
    dimension,
    tags,
    visual: { src, ratio: ratio || 1, crop: { focal: { x: 0.5, y: 0.5 }, zoom: 1 } },
    source: {
      sourceUrl: pin?.sourceUrl || pin?.pinUrl || null,
      sourceDomain: pin?.sourceDomain || null,
      credit: pin?.pinner || pin?.sourceDomain || pin?.title || "source",
      pinId: pin?.pinId || null,
      projectId,
    },
  };
}

/** The eyedropper's color → a color atom draft (the color special-case). */
export function atomFromColor({ hex, name = "" } = {}, { projectId = null, dimension = "color", tags = [], source = {} } = {}) {
  return {
    kind: "color",
    dimension,
    tags,
    visual: { hex, name },
    source: { sourceUrl: null, sourceDomain: null, credit: name || hex, pinId: null, projectId, ...source },
  };
}

/** A kept typeface → a type atom draft (the type special-case). */
export function atomFromType({ text, font, size = 40 } = {}, { projectId = null, dimension = "type", tags = [], source = {} } = {}) {
  return {
    kind: "type",
    dimension,
    tags,
    visual: { text, font, size },
    source: { sourceUrl: null, sourceDomain: null, credit: font?.family || "type", pinId: null, projectId, ...source },
  };
}

/**
 * An atom → a board block (its on-board instance). image→image block (crop +
 * source + tags + atomId), color→swatch block, type→text block. `placement`
 * supplies { x, y, z } from the board's cascade.
 */
export function atomToBlock(atom, placement = {}) {
  const { x = 48, y = 48, z = 1, baseWidth = DEFAULT_BASE_WIDTH } = placement;
  const base = { id: newBlockId(), x, y, z };

  if (atom.kind === "color") {
    const v = atom.visual || {};
    return { ...base, type: "swatch", w: 160, h: 160, payload: { hex: v.hex, name: v.name || "", style: "card", atomId: atom.id, tags: atom.tags || [] } };
  }
  if (atom.kind === "type") {
    const v = atom.visual || {};
    return {
      ...base,
      type: "text",
      w: 360,
      h: 96,
      payload: { text: v.text, font: v.font, size: v.size || 40, caption: `${v.font?.family || ""}`.trim(), tags: atom.tags || [], atomId: atom.id },
    };
  }
  // image (default)
  const v = atom.visual || {};
  const s = atom.source || {};
  const ratio = v.ratio || 1;
  const w = baseWidth;
  const h = Math.max(80, Math.round(baseWidth / ratio));
  return {
    ...base,
    type: "image",
    w,
    h,
    payload: {
      src: v.src,
      ratio,
      focal: v.crop?.focal || { x: 0.5, y: 0.5 },
      zoom: v.crop?.zoom || 1,
      sourceUrl: s.sourceUrl || null,
      sourceDomain: s.sourceDomain || null,
      credit: s.credit || s.sourceDomain || "source",
      pinId: s.pinId || null,
      tags: atom.tags || [],
      atomId: atom.id,
    },
  };
}
