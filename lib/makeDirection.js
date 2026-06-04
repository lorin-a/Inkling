import { apiFetch } from "./api/client";
import { colorName } from "./nameThatColor";
import { dedupe } from "./palettePool";
import { PAD, ZP, ZONE_GAP, ZONES_TOP, ensureZone, membersInZone } from "./boardZones";

/**
 * Turn what resonated into your **master board** — the one place where everything you
 * curated upstream lands, *organized for you*: your gathered colours in a Color zone,
 * the references you kept in an Imagery zone, a Type zone waiting for the faces you keep
 * on /type, and your own words at the top. This is the relief moment (overwhelm →
 * tangible): you finish reacting and arrive to find it already sorted, not a blank
 * canvas you have to fill again.
 *
 * The auto-sort files YOUR choices by their intrinsic dimension as a *starting
 * arrangement you then drag and re-sort* — the tool never decides your taste, it just
 * spares you re-choosing. Nothing is capped or hidden; every colour and pin lands.
 *
 * One master per project (VISION §15: one master → carve a few directions later). Re-running
 * MERGES: new colours / pins append into their zones (deduped), your arrangement is kept.
 *
 * Principles honoured: your words are placed verbatim; credit/source is preserved on every
 * reference; nothing is invented — the board is only what you kept and gathered.
 */

const ACTIVE_KEY = "moodbuilder.moodboard.activeId";
const HEX6 = /^#[0-9a-fA-F]{6}$/;

// Layout constants (board coords). Shared zone geometry (PAD/ZP/ZONE_GAP/ZONES_TOP)
// lives in ./boardZones so the type seam files into the same zones.
const SW = 58, SGAP = 10, SW_COLS = 4;        // colour swatch grid
const IMG_COLW = 200, IMG_GAP = 14;           // imagery masonry
const TYPE_W = 380, TYPE_H = 260;             // empty Type zone default
const NOTE_W = 620;

const isHex = (s) => typeof s === "string" && HEX6.test(s);
const newBlockId = () => `bk_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 7)}`;

// Preload each reference so the masonry lays out at true aspect. Falls back to 1:1.
function preloadRatios(srcs) {
  return Promise.all(
    srcs.map(
      (src) =>
        new Promise((resolve) => {
          if (!src || typeof Image === "undefined") return resolve(1);
          let settled = false;
          const done = (r) => { if (!settled) { settled = true; resolve(r && isFinite(r) && r > 0 ? r : 1); } };
          const img = new Image();
          img.onload = () => done(img.naturalWidth / img.naturalHeight);
          img.onerror = () => done(1);
          setTimeout(() => done(1), 4000);
          img.src = src;
        }),
    ),
  );
}

function swatchBlock(hex, x, y, z) {
  return { id: newBlockId(), type: "swatch", x, y, w: SW, h: SW, z, payload: { hex, name: colorName(hex).name, style: "plain" } };
}

function imageBlock(pin, ratio, x, y, w, h, z) {
  const src = pin.thumbnail || pin.imageDisplay || pin.imageOriginal;
  return {
    id: newBlockId(),
    type: "image",
    x, y, w, h, z,
    payload: {
      src,
      sourceUrl: pin.sourceUrl || pin.pinUrl || null,
      pinId: pin.pinId,
      credit: pin.pinner || pin.sourceDomain || pin.title || "source",
      sourceDomain: pin.sourceDomain || null,
      ratio,
      focal: { x: 0.5, y: 0.5 },
      zoom: 1,
    },
  };
}

/**
 * Compose the master: merge what was curated into the existing board (or lay it out fresh
 * if the board is empty). Pure-ish (only Image preloads). Returns { name, blocks, sections }.
 */
async function composeMaster(existing, { pins = [], colours = [], reflectionYes = "", reflectionNo = "" }) {
  const blocks = [...(existing?.blocks || [])];
  const sections = (existing?.sections || []).map((s) => ({ ...s })); // clone so we can grow
  let z = blocks.reduce((m, b) => Math.max(m, b.z || 0), 0) + 1;

  // Only what isn't already here — never duplicate, never clobber her arrangement.
  const haveHex = new Set(blocks.filter((b) => b.type === "swatch" && isHex(b.payload?.hex)).map((b) => b.payload.hex.toLowerCase()));
  const havePin = new Set(blocks.filter((b) => b.type === "image" && b.payload?.pinId).map((b) => b.payload.pinId));
  const newColours = dedupe(colours.filter(isHex)).filter((h) => !haveHex.has(h.toLowerCase()));
  const newPins = pins.filter((p) => p?.pinId && !havePin.has(p.pinId));

  // ---- the zone row (created once; reused on re-runs at their saved positions) ----
  // Compute each zone's width from its content FIRST, so a freshly-created row lays out
  // left-to-right without overlap (a zone grown after its neighbour was placed would
  // collide, and blocks would get counted in two zones).
  const colorCols = Math.min(SW_COLS, Math.max(1, newColours.length));
  const colorWFresh = Math.max(180, 2 * ZP + colorCols * SW + (colorCols - 1) * SGAP);
  const imgCols = Math.min(3, Math.max(2, Math.round(Math.sqrt(Math.max(newPins.length, 1)))));
  const imageryWFresh = 2 * ZP + imgCols * IMG_COLW + (imgCols - 1) * IMG_GAP;

  const colorZone = ensureZone(sections, "Color", { x: PAD, y: ZONES_TOP, w: colorWFresh, h: 180 });
  const imageryZone = ensureZone(sections, "Imagery", { x: colorZone.x + colorZone.w + ZONE_GAP, y: ZONES_TOP, w: imageryWFresh, h: 320 });
  ensureZone(sections, "Type", { x: imageryZone.x + imageryZone.w + ZONE_GAP, y: ZONES_TOP, w: TYPE_W, h: TYPE_H });

  // ---- colours → Color zone (grid, appended after any existing swatches) ----
  const colorStart = membersInZone(colorZone, blocks, "swatch").length;
  newColours.forEach((hex, k) => {
    const i = colorStart + k;
    const col = i % SW_COLS;
    const row = Math.floor(i / SW_COLS);
    blocks.push(swatchBlock(hex, colorZone.x + ZP + col * (SW + SGAP), colorZone.y + ZP + row * (SW + SGAP), z++));
  });
  if (newColours.length) {
    const rows = Math.ceil((colorStart + newColours.length) / SW_COLS);
    const cols = Math.min(SW_COLS, colorStart + newColours.length);
    colorZone.w = Math.max(colorZone.w, 2 * ZP + cols * SW + (cols - 1) * SGAP);
    colorZone.h = Math.max(colorZone.h, 2 * ZP + rows * SW + (rows - 1) * SGAP);
  }

  // ---- pins → Imagery zone ----
  if (newPins.length) {
    const ratios = await preloadRatios(newPins.map((p) => p.thumbnail || p.imageDisplay || p.imageOriginal));
    const isFresh = membersInZone(imageryZone, blocks, "image").length === 0;
    if (isFresh) {
      // Masonry by true aspect (shortest column first) — only on the first lay-down,
      // so we never reshuffle references she's since arranged. Same column count the
      // zone width was sized for (imgCols), so blocks sit inside their zone.
      const COLS = imgCols;
      const colH = new Array(COLS).fill(0);
      newPins.forEach((p, i) => {
        const ratio = ratios[i] || 1;
        const h = Math.round(IMG_COLW / ratio);
        let c = 0;
        for (let k = 1; k < COLS; k++) if (colH[k] < colH[c]) c = k;
        const x = imageryZone.x + ZP + c * (IMG_COLW + IMG_GAP);
        const y = imageryZone.y + ZP + colH[c];
        blocks.push(imageBlock(p, ratio, x, y, IMG_COLW, h, z++));
        colH[c] += h + IMG_GAP;
      });
      imageryZone.h = Math.max(imageryZone.h, 2 * ZP + Math.max(...colH) - IMG_GAP);
    } else {
      // Appending later: drop new references in a row beneath the zone's current content.
      const bottom = membersInZone(imageryZone, blocks, "image")
        .reduce((m, b) => Math.max(m, b.y + b.h), imageryZone.y + ZP);
      let x = imageryZone.x + ZP;
      let rowY = bottom + IMG_GAP;
      let rowH = 0;
      newPins.forEach((p, i) => {
        const ratio = ratios[i] || 1;
        const h = Math.round(IMG_COLW / ratio);
        if (x + IMG_COLW > imageryZone.x + imageryZone.w - ZP && x > imageryZone.x + ZP) {
          x = imageryZone.x + ZP;
          rowY += rowH + IMG_GAP;
          rowH = 0;
        }
        blocks.push(imageBlock(p, ratio, x, rowY, IMG_COLW, h, z++));
        x += IMG_COLW + IMG_GAP;
        rowH = Math.max(rowH, h);
      });
      imageryZone.h = Math.max(imageryZone.h, rowY + rowH + ZP - imageryZone.y);
    }
  }

  // ---- your words → a note at the top (only if there isn't one already) ----
  const yes = (reflectionYes || "").trim();
  const no = (reflectionNo || "").trim();
  const hasWords = blocks.some((b) => b.type === "text" && (b.payload?.text || "").length > 0 && b.y < ZONES_TOP);
  if ((yes || no) && !hasWords) {
    const noteText = [yes, no ? `Not this: ${no}` : ""].filter(Boolean).join("\n\n");
    const noteH = Math.min(96, Math.max(56, 40 + Math.ceil(noteText.length / 70) * 20));
    blocks.unshift({ id: newBlockId(), type: "text", x: PAD, y: 40, w: NOTE_W, h: noteH, z: 0, payload: { text: noteText } });
  }

  // Name from the lead colour, but never overwrite a board she's already named.
  const lead = (newColours[0] || [...haveHex][0]) || null;
  const generic = !existing?.name || /^(untitled|first board)$/i.test(existing.name);
  const name = generic ? (lead ? colorName(lead).name : "Untitled") : existing.name;

  return { name, blocks, sections };
}

/**
 * Create / refresh the master direction: find the project's master board (its first board),
 * compose the curated material onto it (merge, sorted into zones), persist, and make it
 * active so /moodboard opens to it. Returns the board.
 */
export async function createDirection(input) {
  const list = await apiFetch("/api/moodboards", { cache: "no-store" }).then((r) => r.json());
  let master = (list.boards || [])[0] || null;

  if (!master?.id) {
    const created = await apiFetch("/api/moodboards", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name: "Untitled" }),
    }).then((r) => r.json());
    master = created.board;
    if (!master?.id) throw new Error("Could not create your board.");
    master.blocks = master.blocks || [];
    master.sections = master.sections || [];
  }

  const { name, blocks, sections } = await composeMaster(master, input);

  await apiFetch(`/api/moodboards/${master.id}`, {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ name, blocks, sections }),
  });

  try { localStorage.setItem(ACTIVE_KEY, master.id); } catch { /* storage off — board still exists */ }

  return { ...master, name, blocks, sections };
}

/**
 * The board document (name + blocks + sections) without persistence — kept for callers
 * that want to preview a fresh lay-down. Builds onto an empty board.
 */
export async function buildDirectionBoard(input) {
  return composeMaster({ blocks: [], sections: [], name: "" }, input);
}
