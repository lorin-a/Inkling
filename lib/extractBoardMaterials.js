import { dedupe } from "./palettePool";

/**
 * Distil a moodboard board into the raw material the Brand studio composes from.
 * This is the distill → compose seam: a board you built becomes a source the
 * shuffle draws on, so the identity is synthesised from your own gathered taste.
 *
 * Pure — no I/O, no React. Pass the board doc + the library's per-pin palettes
 * (already shipped by /api/library/palette) so image blocks can contribute the
 * extracted colours of the references on them, not just explicit swatches.
 *
 * Colours are assembled in *intent* order so dedupe (keep-first) favours the
 * highest-signal choices:
 *   1. swatch hexes      — colours the user deliberately placed
 *   2. shape fills       — also deliberate
 *   3. finish inks       — duotone/Riso shadow + light
 *   4. pin palettes      — colours extracted from the reference images
 *
 * `fonts` and `finishes` are returned for the next two seams (type + finish
 * carry-through) but are not consumed yet — v1 wires colours only.
 */

const HEX6 = /^#[0-9a-fA-F]{6}$/; // dedupe() assumes 6-digit hex; keep it safe

export function extractBoardMaterials(board, { pinPalettes = [] } = {}) {
  if (!board || !Array.isArray(board.blocks)) {
    return { colors: [], fonts: [], finishes: [] };
  }
  const blocks = board.blocks;

  const paletteByPin = new Map();
  for (const p of pinPalettes || []) {
    if (p?.pinId && Array.isArray(p.palette)) paletteByPin.set(p.pinId, p.palette);
  }

  const isHex = (s) => typeof s === "string" && HEX6.test(s);
  const colors = [];
  const fonts = [];
  const finishes = [];

  // 1 — swatch hexes
  for (const b of blocks) {
    if (b?.type === "swatch" && isHex(b.payload?.hex)) colors.push(b.payload.hex);
  }
  // 2 — shape fills
  for (const b of blocks) {
    if (b?.type === "shape" && isHex(b.payload?.fill)) colors.push(b.payload.fill);
  }
  // 3 — finish inks (and collect the finishes for a future seam)
  for (const b of blocks) {
    if (b?.type !== "image") continue;
    const f = b.payload?.finish;
    if (f?.type && f.type !== "none") {
      if (isHex(f.shadow)) colors.push(f.shadow);
      if (isHex(f.light)) colors.push(f.light);
      finishes.push(f);
    }
  }
  // 4 — extracted palettes of the pins on the board
  for (const b of blocks) {
    if (b?.type !== "image" || !b.payload?.pinId) continue;
    const pal = paletteByPin.get(b.payload.pinId);
    if (Array.isArray(pal)) for (const h of pal) if (isHex(h)) colors.push(h);
  }
  // fonts (future seam — collected, not yet consumed)
  for (const b of blocks) {
    if (b?.type === "text" && b.payload?.font != null) fonts.push(b.payload.font);
  }

  return { colors: dedupe(colors), fonts, finishes };
}
