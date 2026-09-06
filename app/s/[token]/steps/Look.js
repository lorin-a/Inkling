"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import styles from "../studio.module.css";
import Canvas from "../Canvas";
import Card from "../Card";
import useCardDrag from "../useCardDrag";
import { PILE, cardSize, scatter, tidy, pileBox } from "../../../../lib/studio/geometry";

const SIZE = { w: PILE.x + PILE.w + 90, h: PILE.y + PILE.h + 90 };

/**
 * Step 1. Everything, before any judgment. The pile is the default (she
 * loves the mess); lining it up is opt-in. Clicking a card starts voting
 * from that card. Nothing else lives on this screen.
 */
export default function Look({ cards, setCards, votes, log, snapshot, selected, setSelected, topZ, canvasRef, tidied, setTidied, startVoting, voted, total, setNoteText, setNoteColor, removeNote, noteBlur, onZoom }) {
  const mine = useMemo(() => cards.filter((c) => c.board === "pile"), [cards]);
  const box = useMemo(() => pileBox(total), [total]);
  const [arriving, setArriving] = useState(false);

  // First arrival only: the references come in rather than being there.
  useEffect(() => {
    let key;
    try { key = `inkling-arrived-${location.pathname}`; if (window.localStorage.getItem(key)) return; window.localStorage.setItem(key, "1"); } catch { /* fine */ }
    setArriving(true);
    const id = setTimeout(() => setArriving(false), 2600);
    return () => clearTimeout(id);
  }, []);

  // Frame the board on arrival. No mount guard: React runs effects twice in
  // development and a guard that trips on the first run skips the real one.
  useEffect(() => {
    const id = setTimeout(() => canvasRef.current?.fit(box), 30);
    return () => clearTimeout(id);
  }, [canvasRef, box]);

  const relayout = useCallback((useTidy) => {
    setCards((cs) => {
      const pile = cs.filter((c) => c.board === "pile" && c.kind === "reference");
      let i = 0;
      return cs.map((c) => {
        if (c.board !== "pile" || c.kind !== "reference" || c.pinned) return c;
        const size = cardSize(c);
        const k = i; i += 1;
        return { ...c, ...(useTidy ? tidy(k, pile.length, box, size) : scatter(c.id, k, pile.length, box, size)) };
      });
    });
  }, [setCards, box]);

  const toggleTidy = () => {
    const next = !tidied;
    log("tidy_toggle", { tidied: next });
    setTidied(next);
    relayout(next);
  };

  const { drag, onPointerDown, onPointerMove, onPointerUp } = useCardDrag({
    canvasRef, setCards, snapshot, topZRef: topZ,
    onClick: (card) => {
      setSelected(card.id);
      if (card.kind === "reference") { log("vote_open", { card: card.id, via: "pile" }); startVoting("unvoted", card.id); }
    },
    onDrop: (card) => {
      log("move", { card: card.id, board: "pile" });
      setCards((cs) => cs.map((c) => (c.id === card.id ? { ...c, pinned: true } : c)));
    },
  });

  return (
    <div className={styles.stepBody}>
      <div className={styles.toolbar}>
        <button type="button" className={styles.action} onClick={() => startVoting("unvoted")} disabled={total === 0 || voted >= total}>
          {voted === 0 ? "Start voting" : `Keep voting (${total - voted} left)`}
        </button>
        <button type="button" className={styles.quiet} onClick={toggleTidy} aria-pressed={tidied}>
          {tidied ? "Scatter the pile" : "Line up the pile"}
        </button>
        <span className={styles.toolbarNote}>{total} cards. Drag to move. Scroll to pan, pinch or ⌘ + scroll to zoom.</span>
      </div>

      <Canvas ref={canvasRef} size={SIZE} onZoom={onZoom} onEmptyPointerDown={() => { setSelected(null); return false; }}>
        <section className={styles.board} style={{ left: box.x, top: box.y, width: box.w, height: box.h }} aria-label="Everything you gathered">
          <h2 className={styles.boardTitle}>Everything you gathered</h2>
          {mine.length === 0 && (
            <div className={styles.boardHint}>
              <p><strong>Nothing here yet.</strong></p>
              <p>Import a board first, then come back.</p>
            </div>
          )}
        </section>
        {mine.map((card, i) => (
          <Card
            key={card.id}
            card={card}
            size={cardSize(card)}
            vote={votes[card.id]}
            selected={selected === card.id}
            dragging={drag?.id === card.id}
            arriving={arriving && card.kind === "reference"}
            delay={Math.min(i * 9, 1800)}
            revealed={card.revealed}
            onPointerDown={(e) => onPointerDown(e, card)}
            onPointerMove={onPointerMove}
            onPointerUp={(e) => onPointerUp(e, cards)}
            onPointerCancel={() => {}}
            onKeyDown={(e) => {
              if (e.key === "Enter" || e.key === " ") { e.preventDefault(); if (card.kind === "reference") startVoting("unvoted", card.id); return; }
              const px = e.shiftKey ? 48 : 12;
              const d = { ArrowLeft: [-px, 0], ArrowRight: [px, 0], ArrowUp: [0, -px], ArrowDown: [0, px] }[e.key];
              if (!d) return;
              e.preventDefault();
              snapshot();
              setCards((cs) => cs.map((c) => (c.id === card.id ? { ...c, x: c.x + d[0], y: c.y + d[1], pinned: true } : c)));
            }}
            onNoteChange={setNoteText}
            onNoteColor={setNoteColor}
            onNoteRemove={removeNote}
            onNoteBlur={noteBlur}
          />
        ))}
      </Canvas>
    </div>
  );
}
