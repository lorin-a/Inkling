"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import ProjectSwitcher from "../../components/ProjectSwitcher";
import StageNav from "../../components/StageNav";
import FontLoader, { fontStack } from "../../components/FontLoader";
import { apiFetch } from "../../lib/api/client";
import Board from "../../components/canvas/Board";
import BoardBar from "../../components/canvas/BoardBar";
import Pile from "../../components/canvas/Pile";
import CarveSource from "../../components/canvas/CarveSource";
import DirectionCard from "../../components/DirectionCard";
import AddBlocks from "../../components/canvas/AddBlocks";
import { SWATCH_STYLES, nextIn, fontKey } from "../../components/canvas/blockOptions";
import { useBoards } from "../../lib/useBoards";
import styles from "./page.module.css";

// New blocks land at a gentle cascade so a burst of clicks doesn't stack into
// one spot you have to dig apart.
const CASCADE = 28;
const BASE_WIDTH = 260; // a dropped image's starting width, px

// Hand-made section defaults. Curation auto-sorts the board into zones; this is the
// size of a section you frame yourself when you want to.
const SECTION_W = 360;
const SECTION_H = 300;
const SECTION_PAD = 48;
// Drop below this y so a section's floating title tab clears the top-left add cluster
// (top:16, ~44px tall) — a tab tucked under the toolbar reads as "nothing happened."
const SECTION_TOP = 128;

function newBlockId() {
  return `bk_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 7)}`;
}

function newSectionId() {
  return `sc_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 7)}`;
}

function newCommentId() {
  return `cm_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 7)}`;
}

// Cascade position + top-of-stack z for a freshly added block.
function placement(blocks) {
  const n = blocks.length;
  const maxZ = blocks.reduce((m, b) => Math.max(m, b.z || 0), 0);
  return { x: 48 + (n % 7) * CASCADE, y: 48 + (n % 7) * CASCADE, z: maxZ + 1 };
}

// Move a block ONE layer forward or backward — swap it with its immediate
// neighbour in the stack, so it can land between other blocks (collage
// layering). Then renumber every block's z to a contiguous 0..n-1. Keeps the
// array (and React keys) in place; only the z values change.
function stepZ(blocks, id, dir) {
  const order = [...blocks].sort((a, b) => (a.z || 0) - (b.z || 0));
  const i = order.findIndex((b) => b.id === id);
  if (i === -1) return blocks;
  const j = dir === "forward" ? i + 1 : i - 1; // forward = toward the front (higher)
  if (j < 0 || j >= order.length) return blocks; // already at the end
  [order[i], order[j]] = [order[j], order[i]];
  const zById = new Map(order.map((b, k) => [b.id, k]));
  return blocks.map((b) => ({ ...b, z: zById.get(b.id) }));
}

export default function MoodboardPage() {
  const {
    boards,
    active,
    activeId,
    setActiveId,
    loading,
    saving,
    setBlocks,
    setSections,
    setComments,
    createBoard,
    renameBoard,
    deleteBoard,
    setBoardBackground,
    undo,
    redo,
  } = useBoards();

  const [selectedId, setSelectedId] = useState(null);
  const [selectedSectionId, setSelectedSectionId] = useState(null);
  const [selectedCommentId, setSelectedCommentId] = useState(null);
  const [commenting, setCommenting] = useState(false);
  const [croppingId, setCroppingId] = useState(null);
  const [carving, setCarving] = useState(false);       // split-screen carve mode
  const [carveSourceId, setCarveSourceId] = useState(null); // the "everything" board on the left
  const [pileOpen, setPileOpen] = useState(false); // the tactile pile of your imported pins (the Gather surface)
  const surfaceRef = useRef(null); // the board's inner surface node, so the pile can hit-test drops
  const autoOpenedPile = useRef(false); // open the pile once on entry to an empty board, then leave it to the user
  const [dirOpen, setDirOpen] = useState(false); // the Direction artifact, docked + collapsible on the board
  const [why, setWhy] = useState(""); // your words about this direction — the SAME per-board key Compose reads
  const [projectFonts, setProjectFonts] = useState({}); // { title, subhead, body } font values

  // The project's chosen brand fonts, offered as quick picks on text blocks.
  useEffect(() => {
    apiFetch("/api/project", { cache: "no-store" })
      .then((r) => r.json())
      .then((p) => setProjectFonts(p?.fonts || {}))
      .catch(() => {});
  }, []);

  // In comment mode, Esc cancels placing.
  useEffect(() => {
    if (!commenting) return;
    const onKey = (e) => { if (e.key === "Escape") setCommenting(false); };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [commenting]);

  // Undo / redo (Cmd/Ctrl+Z, Shift to redo). Skip when typing in a field so the
  // browser's own text undo still works there.
  useEffect(() => {
    const onKey = (e) => {
      const mod = e.metaKey || e.ctrlKey;
      if (!mod || e.key.toLowerCase() !== "z") return;
      const t = e.target;
      if (t && (t.tagName === "INPUT" || t.tagName === "TEXTAREA" || t.isContentEditable)) return;
      e.preventDefault();
      if (e.shiftKey) redo(); else undo();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [undo, redo]);

  const blocks = active?.blocks || [];
  const sections = active?.sections || [];
  const comments = active?.comments || [];

  // Entering an empty board IS the Gather moment — spill the pile open so there's
  // something to pull from. Only once: after that the pile is yours to open/close.
  useEffect(() => {
    if (loading || autoOpenedPile.current) return;
    autoOpenedPile.current = true;
    if (!blocks.some((b) => b.type === "image")) setPileOpen(true);
  }, [loading, blocks]);

  // The Direction's "why" — your words about this board. Stored under the SAME
  // per-board key Compose reads/writes, so the artifact fills once and travels.
  const whyKey = activeId ? `moodbuilder.direction.why.${activeId}` : null;
  useEffect(() => {
    if (!whyKey) { setWhy(""); return; }
    try { setWhy(localStorage.getItem(whyKey) || ""); } catch { setWhy(""); }
  }, [whyKey]);
  const saveWhy = useCallback((text) => {
    setWhy(text);
    if (!whyKey) return;
    try { if (text) localStorage.setItem(whyKey, text); else localStorage.removeItem(whyKey); } catch { /* storage off */ }
  }, [whyKey]);

  // The fill readout, computed from what's actually on this board.
  const dirColorCount = useMemo(() => blocks.filter((b) => b.type === "swatch").length, [blocks]);
  const dirPieceCount = useMemo(() => blocks.filter((b) => b.type === "image").length, [blocks]);
  const dirHasType = useMemo(() => blocks.some((b) => b.type === "text"), [blocks]);

  // Brand fonts as { label, value, stack } for the typeface popover.
  const projectFontQuick = useMemo(() => {
    const out = [];
    const seen = new Set();
    for (const key of ["title", "subhead", "body"]) {
      const v = projectFonts?.[key];
      if (v?.family && !seen.has(v.family)) {
        seen.add(v.family);
        out.push({ label: v.family, value: v, stack: fontStack(v, "sans") });
      }
    }
    return out;
  }, [projectFonts]);

  // Unique Google/custom fonts used by text blocks on this board — one
  // FontLoader each so the faces actually render.
  const textFontLoaders = useMemo(() => {
    const map = new Map();
    for (const b of blocks) {
      if (b.type === "text" && b.payload?.font && typeof b.payload.font === "object") {
        const k = fontKey(b.payload.font);
        if (k && !map.has(k)) map.set(k, b.payload.font);
      }
    }
    return [...map.entries()];
  }, [blocks]);

  // Selecting away from the block being cropped commits the crop and leaves
  // crop mode — you can't crop a block you're no longer on.
  const selectBlock = useCallback((id) => {
    setSelectedId(id);
    if (id) { setSelectedSectionId(null); setSelectedCommentId(null); } // one thing in focus
    setCroppingId((cur) => (cur && cur !== id ? null : cur));
  }, []);

  // Selecting a section clears any block / comment selection (and crop) — one thing in
  // focus at a time, so the toolbars never stack.
  const selectSection = useCallback((id) => {
    setSelectedSectionId(id);
    if (id) { setSelectedId(null); setSelectedCommentId(null); setCroppingId(null); }
  }, []);

  const selectComment = useCallback((id) => {
    setSelectedCommentId(id);
    if (id) { setSelectedId(null); setSelectedSectionId(null); setCroppingId(null); }
  }, []);

  const enterCrop = useCallback((id) => {
    setSelectedId(id);
    setCroppingId(id);
  }, []);

  const exitCrop = useCallback(() => setCroppingId(null), []);

  // Merge a patch into a block's payload — crop focal/zoom, text edits, etc.
  const changePayload = useCallback((id, patch) => {
    setBlocks((bs) => bs.map((b) => (b.id === id ? { ...b, payload: { ...b.payload, ...patch } } : b)));
  }, [setBlocks]);

  const addText = useCallback(() => {
    const id = newBlockId();
    setBlocks((bs) => {
      const p = placement(bs);
      return [...bs, { id, type: "text", x: p.x, y: p.y, w: 240, h: 72, z: p.z, payload: { text: "" } }];
    });
    setSelectedId(id);
  }, [setBlocks]);

  const addSwatch = useCallback((hex, name) => {
    const id = newBlockId();
    setBlocks((bs) => {
      const p = placement(bs);
      return [...bs, { id, type: "swatch", x: p.x, y: p.y, w: 132, h: 156, z: p.z, payload: { hex, name, style: "card" } }];
    });
    setSelectedId(id);
  }, [setBlocks]);

  const addShape = useCallback((kind) => {
    const id = newBlockId();
    const geom = kind === "line"
      ? { w: 220, h: 28, fill: "#1a1a1a" }
      : { w: 180, h: 120, fill: "#c9c4bd" };
    setBlocks((bs) => {
      const p = placement(bs);
      return [...bs, { id, type: "shape", x: p.x, y: p.y, w: geom.w, h: geom.h, z: p.z, payload: { kind, fill: geom.fill } }];
    });
    setSelectedId(id);
  }, [setBlocks]);

  const setFill = useCallback((id, hex) => {
    changePayload(id, { fill: hex });
  }, [changePayload]);

  // Cycle a swatch through its styles (card → plain → circle) or a text block
  // through its typefaces (sans → serif → mono).
  const cycleStyle = useCallback((id) => {
    setBlocks((bs) => bs.map((b) => (
      b.id === id ? { ...b, payload: { ...b.payload, style: nextIn(SWATCH_STYLES, b.payload?.style || "card") } } : b
    )));
  }, [setBlocks]);

  const setFont = useCallback((id, font) => {
    changePayload(id, { font });
  }, [changePayload]);

  // Per-image finish (grain / Riso / duotone / halftone). `finish` is the whole
  // finish object or null (= clean); the popover composes it with defaults.
  const setFinish = useCallback((id, finish) => {
    changePayload(id, { finish });
  }, [changePayload]);

  // The unified-Riso escape hatch: push one finish across every image on the
  // board (and leave non-image blocks untouched).
  const applyFinishAll = useCallback((finish) => {
    setBlocks((bs) => bs.map((b) => (
      b.type === "image" ? { ...b, payload: { ...b.payload, finish } } : b
    )));
  }, [setBlocks]);

  const usedPinIds = useMemo(
    () => new Set(blocks.filter((b) => b.type === "image").map((b) => b.payload?.pinId)),
    [blocks]
  );

  const changeBlock = useCallback((id, patch) => {
    setBlocks((bs) => bs.map((b) => (b.id === id ? { ...b, ...patch } : b)));
  }, [setBlocks]);

  const deleteBlock = useCallback((id) => {
    setBlocks((bs) => bs.filter((b) => b.id !== id));
    setSelectedId((cur) => (cur === id ? null : cur));
    setCroppingId((cur) => (cur === id ? null : cur));
  }, [setBlocks]);

  // One layer forward / backward, so a block can sit between others. Storage
  // stays contiguous 0..n-1 (the rendered z-index is derived from sort order in
  // Board, so it can never go negative or balloon).
  const moveForward = useCallback((id) => {
    setBlocks((bs) => stepZ(bs, id, "forward"));
  }, [setBlocks]);

  const moveBackward = useCallback((id) => {
    setBlocks((bs) => stepZ(bs, id, "backward"));
  }, [setBlocks]);

  // Drop a library pin onto the board. We preload the image to size the block
  // to its real aspect ratio, so the first thing you see isn't a cropped
  // square — references read true, then you resize from there.
  // `at` (optional) is a board-local drop point from the pile: the reference
  // lands where you let go, snapping flat into clean board material. Without it
  // (a click, or the library grid) the block joins the gentle cascade.
  const addPin = useCallback((pin, at = null) => {
    const src = pin.imageDisplay || pin.thumbnail236 || pin.imageOriginal;
    if (!src) return;
    const id = `bk_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 7)}`;
    const payload = {
      src,
      sourceUrl: pin.sourceUrl || pin.pinUrl || null,
      pinId: pin.pinId,
      credit: pin.pinner || pin.sourceDomain || pin.title || "source",
      sourceDomain: pin.sourceDomain || null,
    };

    const place = (ratio) => {
      const w = BASE_WIDTH;
      const h = Math.round(BASE_WIDTH / (ratio || 1));
      setBlocks((bs) => {
        const n = bs.length;
        const maxZ = bs.reduce((m, b) => Math.max(m, b.z || 0), 0);
        // Drop where you let go, biased so the cursor lands near the block's
        // upper-middle (not its corner); otherwise cascade.
        const x = at ? Math.max(8, Math.round(at.x - w / 2)) : 48 + (n % 7) * CASCADE;
        const y = at ? Math.max(8, Math.round(at.y - 28)) : 48 + (n % 7) * CASCADE;
        const block = {
          id,
          type: "image",
          x,
          y,
          w,
          h,
          z: maxZ + 1,
          // ratio + focal/zoom drive the crop model (see components/canvas/crop).
          payload: { ...payload, ratio: ratio || 1, focal: { x: 0.5, y: 0.5 }, zoom: 1 },
        };
        return [...bs, block];
      });
      setSelectedId(id);
    };

    const img = new Image();
    img.onload = () => place(img.naturalWidth / img.naturalHeight);
    img.onerror = () => place(1);
    img.src = src;
  }, [setBlocks]);

  // NOTE: the cross-project "well" (atoms store) is shelved as of 2026-06-09 (one
  // clean concept: your inspiration). WellTray / PullTagPopover / lib/atoms and the
  // /api/atoms route remain on disk, unwired, so it's reversible. The board→well
  // "pull" gesture is off too (onPull no longer passed to Board).

  // ---- Affinity sections (the workshop layer) ------------------------------
  // Membership is computed by position (see Board), so these handlers only ever
  // touch a section's own frame / label / note — never the blocks. Sorting
  // stays a thing the user does by dragging; the tool moves nothing.
  const addSection = useCallback((name = "Untitled section") => {
    const id = newSectionId();
    setSections((ss) => {
      const n = ss.length;
      return [
        ...ss,
        {
          id,
          name,
          x: SECTION_PAD + (n % 4) * CASCADE,
          y: SECTION_TOP + (n % 4) * CASCADE,
          w: SECTION_W,
          h: SECTION_H,
          note: "",
        },
      ];
    });
    selectSection(id);
  }, [setSections, selectSection]);

  const changeSection = useCallback((id, patch) => {
    setSections((ss) => ss.map((s) => (s.id === id ? { ...s, ...patch } : s)));
  }, [setSections]);

  const deleteSection = useCallback((id) => {
    setSections((ss) => ss.filter((s) => s.id !== id));
    setSelectedSectionId((cur) => (cur === id ? null : cur));
  }, [setSections]);

  const renameSection = useCallback((id, name) => {
    setSections((ss) => ss.map((s) => (s.id === id ? { ...s, name } : s)));
  }, [setSections]);

  const noteSection = useCallback((id, note) => {
    setSections((ss) => ss.map((s) => (s.id === id ? { ...s, note } : s)));
  }, [setSections]);

  // ---- Comment pins (annotation; the seed of the client-comment layer) -------
  const toggleComment = useCallback(() => {
    setCommenting((on) => !on);
    selectComment(null);
  }, [selectComment]);

  // Drop a pin where the board was clicked, open it, and leave comment mode so the
  // next click doesn't keep dropping pins. If the click lands on a block, the comment
  // attaches to it (stored as an offset) so it rides along when the block moves.
  const placeComment = useCallback((x, y) => {
    const id = newCommentId();
    const host = blocks
      .filter((b) => x >= b.x && x <= b.x + b.w && y >= b.y && y <= b.y + b.h)
      .sort((a, b) => (b.z || 0) - (a.z || 0))[0];
    const attached = host ? { attachedTo: host.id, dx: x - host.x, dy: y - host.y } : { attachedTo: null, dx: 0, dy: 0 };
    setComments((cs) => [...cs, { id, x, y, ...attached, messages: [], resolved: false, createdAt: new Date().toISOString() }]);
    setCommenting(false);
    selectComment(id);
  }, [blocks, setComments, selectComment]);

  const updateComment = useCallback((id, patch) => {
    setComments((cs) => cs.map((c) => (c.id === id ? { ...c, ...patch } : c)));
  }, [setComments]);

  // Move a pin. If it's attached to a block, keep it attached by re-deriving the
  // offset from the block's current position; otherwise just store the new x/y.
  const moveComment = useCallback((id, x, y) => {
    setComments((cs) => cs.map((c) => {
      if (c.id !== id) return c;
      const host = c.attachedTo ? blocks.find((b) => b.id === c.attachedTo) : null;
      if (host) return { ...c, x, y, dx: x - host.x, dy: y - host.y };
      return { ...c, x, y };
    }));
  }, [blocks, setComments]);

  const deleteComment = useCallback((id) => {
    setComments((cs) => cs.filter((c) => c.id !== id));
    setSelectedCommentId((cur) => (cur === id ? null : cur));
  }, [setComments]);

  // Open a comment from the history list: leave placing mode and select it so its
  // pin opens on the board.
  const openComment = useCallback((id) => {
    setCommenting(false);
    selectComment(id);
  }, [selectComment]);

  // ---- Carve a direction (split view) ---------------------------------------
  // Everything board on the left (read-only source), a fresh "next round" board on
  // the right. Dragging a piece across drops a COPY — the everything board is never
  // touched. The new board becomes active so the right pane edits it directly.
  const startCarve = useCallback(async () => {
    if (!active) return;
    const sourceId = active.id;
    const created = await createBoard("Next round");
    if (!created?.id) return;
    setCarveSourceId(sourceId);
    setSelectedId(null);
    setSelectedSectionId(null);
    setSelectedCommentId(null);
    setCommenting(false);
    setCarving(true);
  }, [active, createBoard]);

  // A piece dragged from the everything board → a copy on the new board at the drop point.
  const dropCopyToBoard = useCallback((draft, x, y) => {
    if (!draft) return;
    const id = newBlockId();
    setBlocks((bs) => {
      const maxZ = bs.reduce((m, b) => Math.max(m, b.z || 0), 0);
      return [...bs, { ...draft, id, x: Math.max(0, Math.round(x)), y: Math.max(0, Math.round(y)), z: maxZ + 1 }];
    });
  }, [setBlocks]);

  const finishCarve = useCallback(() => setCarving(false), []);

  // Cancel: drop the new board and return to the everything board (deleteBoard
  // restores the first board as active, which is the source).
  const cancelCarve = useCallback(() => {
    const newId = activeId;
    setCarving(false);
    if (newId) deleteBoard(newId);
  }, [activeId, deleteBoard]);

  // The active board's canvas — reused in the normal layout and as the right pane of
  // carve mode (where it also accepts dropped copies from the everything board).
  const boardEl = (
    <Board
      blocks={blocks}
      selectedId={selectedId}
      croppingId={croppingId}
      onSelect={selectBlock}
      onChangeBlock={changeBlock}
      onDeleteBlock={deleteBlock}
      onForward={moveForward}
      onBackward={moveBackward}
      onEnterCrop={enterCrop}
      onExitCrop={exitCrop}
      onCropChange={changePayload}
      onPayloadChange={changePayload}
      onCycleStyle={cycleStyle}
      onSetFont={setFont}
      onSetFill={setFill}
      onSetFinish={setFinish}
      onApplyFinishAll={applyFinishAll}
      projectFonts={projectFontQuick}
      background={active?.background || null}
      empty={blocks.length === 0}
      sections={sections}
      selectedSectionId={selectedSectionId}
      onSelectSection={selectSection}
      onChangeSection={changeSection}
      onDeleteSection={deleteSection}
      onRenameSection={renameSection}
      onNoteSection={noteSection}
      comments={comments}
      commenting={commenting}
      selectedCommentId={selectedCommentId}
      onPlaceComment={placeComment}
      onSelectComment={selectComment}
      onChangeComment={updateComment}
      onMoveComment={moveComment}
      onDeleteComment={deleteComment}
      onDropBlock={carving ? dropCopyToBoard : undefined}
      surfaceRef={surfaceRef}
      onPull={undefined}
    />
  );

  return (
    <div className={styles.page}>
      <FontLoader fonts={projectFonts} />
      {textFontLoaders.map(([k, fv]) => (
        <FontLoader key={k} fonts={{ title: fv }} />
      ))}
      <header className={styles.bar}>
        <div className={styles.barLeft}>
          <Link href="/" className={styles.back}>← Moodbuilder</Link>
          <StageNav onNarrow={startCarve} carving={carving} />
        </div>
        <div className={styles.barRight}>
          <ProjectSwitcher />
        </div>
      </header>

      {loading ? (
        <div className={styles.loading}>Loading your boards…</div>
      ) : (
        <>
          {!carving ? (
            <>
              <BoardBar
                boards={boards}
                activeId={activeId}
                background={active?.background || null}
                onSwitch={(id) => { setActiveId(id); setSelectedId(null); setCroppingId(null); }}
                onCreate={() => { createBoard("Untitled board"); setSelectedId(null); setCroppingId(null); }}
                onRename={renameBoard}
                onDelete={(id) => { deleteBoard(id); setSelectedId(null); setCroppingId(null); }}
                onSetBackground={setBoardBackground}
                saving={saving}
                comments={comments}
                onOpenComment={openComment}
              />

              <div className={styles.work}>
                {pileOpen && (
                  <Pile
                    surfaceRef={surfaceRef}
                    usedPinIds={usedPinIds}
                    onPullToBoard={addPin}
                    onClose={() => setPileOpen(false)}
                  />
                )}
                <div className={styles.boardArea}>
                  {commenting && (
                    <div className={styles.commentBanner} role="status">
                      Click anywhere on the board to drop a comment
                      <span className={styles.commentBannerEsc}>Esc to cancel</span>
                    </div>
                  )}
                  {boardEl}
                  <AddBlocks
                    onAddText={addText}
                    onAddSwatch={addSwatch}
                    onAddShape={addShape}
                    onAddSection={addSection}
                    onToggleComment={toggleComment}
                    commenting={commenting}
                    onOpenLibrary={() => setPileOpen(true)}
                    libraryOpen={pileOpen}
                  />

                  {/* The Direction travels here: the same artifact you see on Compose,
                      docked top-right, collapsed to a chip so the canvas stays the figure. */}
                  <div className={styles.directionDock}>
                    {dirOpen ? (
                      <div className={styles.directionPanel}>
                        <button
                          type="button"
                          className={styles.directionCollapse}
                          onClick={() => setDirOpen(false)}
                          aria-label="Collapse the direction"
                        >▸</button>
                        <DirectionCard
                          name={active?.name}
                          onRename={(n) => n && renameBoard(activeId, n)}
                          why={why}
                          onWhy={saveWhy}
                          boardName={active?.name}
                          colorCount={dirColorCount}
                          pieceCount={dirPieceCount}
                          hasType={dirHasType}
                        />
                      </div>
                    ) : (
                      <button
                        type="button"
                        className={styles.directionPill}
                        onClick={() => setDirOpen(true)}
                        title="Your direction — name, why, and what's in it so far"
                      >
                        <span className={styles.directionPillDot} aria-hidden="true">◆</span>
                        {active?.name || "Your direction"}
                      </button>
                    )}
                  </div>
                </div>
              </div>
            </>
          ) : (
            <div className={styles.carveWork}>
              <div className={styles.carveHeader}>
                <div className={styles.carveTitleWrap}>
                  <span className={styles.carveTitle}>Narrow into a direction</span>
                  <span className={styles.carveHint}>Drag pieces from your everything board onto the new one — each one copies over</span>
                </div>
                <input
                  className={styles.carveName}
                  value={active?.name || ""}
                  onChange={(e) => renameBoard(activeId, e.target.value)}
                  placeholder="Name this direction"
                  aria-label="Name this direction"
                />
                <button type="button" className={styles.carveCancel} onClick={cancelCarve}>Cancel</button>
                <button type="button" className={styles.carveDone} onClick={finishCarve}>Done</button>
              </div>
              <div className={styles.carveSplit}>
                <CarveSource board={boards.find((b) => b.id === carveSourceId)} />
                <div className={styles.carveTarget}>{boardEl}</div>
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
}
