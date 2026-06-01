"use client";

import { useCallback, useMemo, useState } from "react";
import Link from "next/link";
import ProjectSwitcher from "../../components/ProjectSwitcher";
import Board from "../../components/canvas/Board";
import BoardBar from "../../components/canvas/BoardBar";
import PinTray from "../../components/canvas/PinTray";
import AddBlocks from "../../components/canvas/AddBlocks";
import { useBoards } from "../../lib/useBoards";
import styles from "./page.module.css";

// New blocks land at a gentle cascade so a burst of clicks doesn't stack into
// one spot you have to dig apart.
const CASCADE = 28;
const BASE_WIDTH = 260; // a dropped image's starting width, px

function newBlockId() {
  return `bk_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 7)}`;
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
    createBoard,
    renameBoard,
    deleteBoard,
  } = useBoards();

  const [selectedId, setSelectedId] = useState(null);
  const [croppingId, setCroppingId] = useState(null);
  const [trayOpen, setTrayOpen] = useState(true);

  const blocks = active?.blocks || [];

  // Selecting away from the block being cropped commits the crop and leaves
  // crop mode — you can't crop a block you're no longer on.
  const selectBlock = useCallback((id) => {
    setSelectedId(id);
    setCroppingId((cur) => (cur && cur !== id ? null : cur));
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
      return [...bs, { id, type: "swatch", x: p.x, y: p.y, w: 132, h: 156, z: p.z, payload: { hex, name } }];
    });
    setSelectedId(id);
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
  const addPin = useCallback((pin) => {
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
        const block = {
          id,
          type: "image",
          x: 48 + (n % 7) * CASCADE,
          y: 48 + (n % 7) * CASCADE,
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

  return (
    <div className={styles.page}>
      <header className={styles.bar}>
        <Link href="/" className={styles.back}>← Moodbuilder</Link>
        <ProjectSwitcher />
        <div className={styles.barTitle}>Moodboard</div>
      </header>

      {loading ? (
        <div className={styles.loading}>Loading your boards…</div>
      ) : (
        <>
          <BoardBar
            boards={boards}
            activeId={activeId}
            onSwitch={(id) => { setActiveId(id); setSelectedId(null); setCroppingId(null); }}
            onCreate={() => { createBoard("Untitled board"); setSelectedId(null); setCroppingId(null); }}
            onRename={renameBoard}
            onDelete={(id) => { deleteBoard(id); setSelectedId(null); setCroppingId(null); }}
            saving={saving}
          />

          <div className={styles.work}>
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
              empty={blocks.length === 0}
            />
            <AddBlocks onAddText={addText} onAddSwatch={addSwatch} />
            <PinTray
              open={trayOpen}
              onToggle={() => setTrayOpen((v) => !v)}
              onAdd={addPin}
              usedPinIds={usedPinIds}
            />
          </div>
        </>
      )}
    </div>
  );
}
