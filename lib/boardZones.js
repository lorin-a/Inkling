/**
 * Shared affinity-zone helpers for the master board (VISION §15/§16D). Pure — no I/O,
 * no React — so both the curation→board seam (lib/makeDirection.js) and the type seam
 * (lib/addTypeToBoard.js) file references into the *same* zones, by name, without drift.
 *
 * A zone is a section: { id, name, x, y, w, h, note }. Membership is computed from a
 * block's centre, never stored, so sorting stays purely spatial.
 */

export const PAD = 48;          // left margin on the board
export const ZP = 18;           // a zone's inner padding (frame edge → content)
export const ZONE_GAP = 48;     // gap between zones in the row
export const ZONES_TOP = 128;   // clears the top-left add cluster

export const newSectionId = () => `sc_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 7)}`;

/** A block "belongs to" a zone when its centre is inside the zone's rect. */
export function centerInside(zone, b) {
  const cx = b.x + b.w / 2;
  const cy = b.y + b.h / 2;
  return cx >= zone.x && cx <= zone.x + zone.w && cy >= zone.y && cy <= zone.y + zone.h;
}

/**
 * Find a zone by name (case-insensitive), or create one at `rect` and push it onto
 * `sections`. Returns the live zone object (mutate its h to grow it to fit content).
 */
export function ensureZone(sections, name, rect) {
  const found = sections.find((s) => (s.name || "").toLowerCase() === name.toLowerCase());
  if (found) return found;
  const zone = { id: newSectionId(), name, note: "", ...rect };
  sections.push(zone);
  return zone;
}

/** Blocks whose centre falls in the zone (optionally filtered to one block type). */
export function membersInZone(zone, blocks, type) {
  return blocks.filter((b) => (!type || b.type === type) && centerInside(zone, b));
}
