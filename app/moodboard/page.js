"use client";

import { useCallback, useMemo, useState } from "react";
import Link from "next/link";
import ProjectSwitcher from "../../components/ProjectSwitcher";
import Board from "../../components/canvas/Board";
import BoardBar from "../../components/canvas/BoardBar";
import PinTray from "../../components/canvas/PinTray";
import { useBoards } from "../../lib/useBoards";
import styles from "./page.module.css";

// New blocks land at a gentle cascade so a burst of clicks doesn't stack into
// one spot you have to dig apart.
const CASCADE = 28;
const BASE_WIDTH = 260; // a dropped image's starting width, px

// Move a block to the front or back of the stack, then renumber every block's
// z to a contiguous 0..n-1. Keeps the array (and React keys) in place; only the
// z values change.
function reindexZ(blocks, id, where) {
  const order = [...blocks].sort((a, b) => (a.z || 0) - (b.z || 0));
  const idx = order.findIndex((b) => b.id === id);
  if (idx === -1) return blocks;
  const [item] = order.splice(idx, 1);
  if (where === "front") order.push(item);
  else order.unshift(item);
  const zById = new Map(order.map((b, i) => [b.id, i]));
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

  const cropChange = useCallback((id, patch) => {
    setBlocks((bs) => bs.map((b) => (b.id === id ? { ...b, payload: { ...b.payload, ...patch } } : b)));
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

  // Bring to front / send to back. We reassign contiguous z (0..n-1) every time
  // so the stored order can never go negative or balloon — the rendered
  // z-index is derived from sort order in Board, but keeping storage clean
  // means a reload always paints the same stack.
  const bringToFront = useCallback((id) => {
    setBlocks((bs) => reindexZ(bs, id, "front"));
  }, [setBlocks]);

  const sendToBack = useCallback((id) => {
    setBlocks((bs) => reindexZ(bs, id, "back"));
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
              onForward={bringToFront}
              onBackward={sendToBack}
              onEnterCrop={enterCrop}
              onExitCrop={exitCrop}
              onCropChange={cropChange}
              empty={blocks.length === 0}
            />
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
