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
  const [trayOpen, setTrayOpen] = useState(true);

  const blocks = active?.blocks || [];

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
  }, [setBlocks]);

  const bringForward = useCallback((id) => {
    setBlocks((bs) => {
      const maxZ = bs.reduce((m, b) => Math.max(m, b.z || 0), 0);
      return bs.map((b) => (b.id === id ? { ...b, z: maxZ + 1 } : b));
    });
  }, [setBlocks]);

  const sendBackward = useCallback((id) => {
    setBlocks((bs) => {
      const minZ = bs.reduce((m, b) => Math.min(m, b.z || 0), 0);
      return bs.map((b) => (b.id === id ? { ...b, z: minZ - 1 } : b));
    });
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
          payload,
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
            onSwitch={(id) => { setActiveId(id); setSelectedId(null); }}
            onCreate={() => { createBoard("Untitled board"); setSelectedId(null); }}
            onRename={renameBoard}
            onDelete={(id) => { deleteBoard(id); setSelectedId(null); }}
            saving={saving}
          />

          <div className={styles.work}>
            <Board
              blocks={blocks}
              selectedId={selectedId}
              onSelect={setSelectedId}
              onChangeBlock={changeBlock}
              onDeleteBlock={deleteBlock}
              onForward={bringForward}
              onBackward={sendBackward}
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
