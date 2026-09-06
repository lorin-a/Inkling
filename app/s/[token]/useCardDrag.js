"use client";

import { useCallback, useState } from "react";

/**
 * Picking a card up and putting it down on a canvas. A press that never
 * moves is a click (`onClick`); a press that moves is a drag, and on release
 * `onDrop` gets the card where it landed and where it came from. Every drag
 * starts with a snapshot so ⌘Z can put it back.
 */
export default function useCardDrag({ canvasRef, setCards, snapshot, topZRef, onClick, onDrop, disabled }) {
  const [drag, setDrag] = useState(null);

  const onPointerDown = useCallback((e, card) => {
    if (e.button !== 0 || disabled) return;
    e.stopPropagation();
    e.currentTarget.setPointerCapture(e.pointerId);
    const p = canvasRef.current.toCanvas(e.clientX, e.clientY);
    const z = topZRef.current + 1;
    topZRef.current = z;
    setCards((cs) => cs.map((c) => (c.id === card.id ? { ...c, z } : c)));
    snapshot();
    setDrag({ id: card.id, dx: p.x - card.x, dy: p.y - card.y, ox: card.x, oy: card.y, moved: false, from: card.board, pointer: e.pointerId, sx: e.clientX, sy: e.clientY });
  }, [canvasRef, setCards, snapshot, topZRef, disabled]);

  const onPointerMove = useCallback((e) => {
    if (!drag || e.pointerId !== drag.pointer) return;
    if (!drag.moved && Math.hypot(e.clientX - drag.sx, e.clientY - drag.sy) < 5) return;
    const p = canvasRef.current.toCanvas(e.clientX, e.clientY);
    const nx = Math.round(p.x - drag.dx);
    const ny = Math.round(p.y - drag.dy);
    setCards((cs) => cs.map((c) => (c.id === drag.id ? { ...c, x: nx, y: ny } : c)));
    if (!drag.moved) setDrag((d) => (d ? { ...d, moved: true } : d));
    canvasRef.current.nudge(e.clientX, e.clientY);
  }, [drag, canvasRef, setCards]);

  const onPointerUp = useCallback((e, cardsNow) => {
    if (!drag || e.pointerId !== drag.pointer) return;
    const card = cardsNow.find((c) => c.id === drag.id);
    setDrag(null);
    if (!card) return;
    if (!drag.moved) { onClick?.(card, drag); return; }
    onDrop?.(card, drag);
  }, [drag, onClick, onDrop]);

  return { drag, onPointerDown, onPointerMove, onPointerUp, cancel: () => setDrag(null) };
}
