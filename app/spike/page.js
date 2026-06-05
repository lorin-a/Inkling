"use client";

/**
 * SPIKE — the pile.
 *
 * A throwaway sandbox to test ONE feeling: inspiration as a tactile, hand-tossed
 * pile you rifle through, that resolves into order when you pull a card onto a
 * clean board. Messy → ordered is the product's overwhelm → relief arc, made
 * physical. Built with zero new dependencies (CSS transforms, pointer-drag, the
 * FLIP technique by hand) so the feeling is what's under test, not a library.
 * GSAP earns its place later, in production, if this lands.
 *
 * Lives at /spike, isolated from the real flow. Not wired to anything.
 */

import { useCallback, useMemo, useRef, useState } from "react";
import data from "../../lib/sampleStudio.data.json";
import styles from "./page.module.css";

// Deterministic pseudo-random so server and client render the same scatter
// (no hydration mismatch — Math.random would differ across the boundary).
const rand = (seed) => {
  const x = Math.sin(seed * 999.13) * 10000;
  return x - Math.floor(x);
};

const PINS = Object.values(data.pins || {}).slice(0, 14);

// The pile area is a logical canvas; cards are scattered within it. Sizes,
// tilts and positions are all derived from the index so the mess is stable.
const PILE_W = 720;
const PILE_H = 560;

function makeCard(pin, i) {
  const w = 150 + Math.round(rand(i + 3) * 64); // 150–214
  const h = Math.round(w * (0.92 + rand(i + 7) * 0.5));
  const x = Math.round(28 + rand(i) * (PILE_W - w - 56));
  const y = Math.round(20 + rand(i + 50) * (PILE_H - h - 40));
  const tilt = +((rand(i + 9) * 2 - 1) * 7).toFixed(2); // -7°…+7°
  return { id: pin.pinId || String(i), pin, w, h, x, y, tilt, z: i + 1 };
}

export default function PileSpike() {
  const cards = useMemo(() => PINS.map(makeCard), []);
  const initialPos = useMemo(() => {
    const p = {};
    cards.forEach((c) => (p[c.id] = { x: c.x, y: c.y }));
    return p;
  }, [cards]);

  const [positions, setPositions] = useState(initialPos);
  const [placed, setPlaced] = useState([]); // ids on the board, in pull order
  const [draggingId, setDraggingId] = useState(null);
  const boardRef = useRef(null);

  const reset = useCallback(() => {
    setPositions(initialPos);
    setPlaced([]);
  }, [initialPos]);

  const onPointerDown = useCallback(
    (e, id) => {
      if (e.button != null && e.button !== 0) return;
      e.preventDefault();
      const startX = e.clientX;
      const startY = e.clientY;
      const orig = positions[id] || { x: 0, y: 0 };
      setDraggingId(id);

      const move = (ev) => {
        setPositions((p) => ({
          ...p,
          [id]: { x: orig.x + (ev.clientX - startX), y: orig.y + (ev.clientY - startY) },
        }));
      };
      const up = (ev) => {
        window.removeEventListener("pointermove", move);
        window.removeEventListener("pointerup", up);
        setDraggingId(null);
        const r = boardRef.current?.getBoundingClientRect();
        const over =
          r &&
          ev.clientX >= r.left &&
          ev.clientX <= r.right &&
          ev.clientY >= r.top &&
          ev.clientY <= r.bottom;
        if (over) setPlaced((pl) => (pl.includes(id) ? pl : [...pl, id]));
      };
      window.addEventListener("pointermove", move);
      window.addEventListener("pointerup", up);
    },
    [positions],
  );

  const cardById = useMemo(() => Object.fromEntries(cards.map((c) => [c.id, c])), [cards]);
  const pileCards = cards.filter((c) => !placed.includes(c.id));
  const placedCards = placed.map((id) => cardById[id]).filter(Boolean);

  return (
    <div className={styles.page}>
      <header className={styles.bar}>
        <span className={styles.spikeTag}>Spike</span>
        <span className={styles.barNote}>
          Rifle through the pile. Pull what resonates onto the board, and watch it settle.
        </span>
        <button type="button" className={styles.reset} onClick={reset}>
          Re-pile
        </button>
      </header>

      <div className={styles.work}>
        {/* THE PILE — free, tilted, overlapping. Intuition leads. */}
        <section className={styles.pileWrap} aria-label="Your inspiration, as it came">
          <p className={styles.zoneLabel}>The pile</p>
          <div className={styles.pile} style={{ width: PILE_W, height: PILE_H }}>
            {pileCards.map((c) => {
              const pos = positions[c.id] || { x: c.x, y: c.y };
              const dragging = draggingId === c.id;
              return (
                <div
                  key={c.id}
                  className={`${styles.slot} ${dragging ? styles.dragging : ""}`}
                  style={{
                    left: pos.x,
                    top: pos.y,
                    zIndex: dragging ? 999 : c.z,
                    animationDelay: `${c.z * 45}ms`,
                  }}
                >
                  <div
                    className={styles.card}
                    style={{ "--tilt": `${c.tilt}deg`, width: c.w }}
                    onPointerDown={(e) => onPointerDown(e, c.id)}
                    title="Drag me onto the board"
                  >
                    <img
                      className={styles.img}
                      src={c.pin.imageDisplay}
                      alt={c.pin.alt || c.pin.title || "Inspiration"}
                      style={{ height: c.h }}
                      draggable={false}
                    />
                    <span className={styles.grain} aria-hidden="true" />
                  </div>
                </div>
              );
            })}
          </div>
        </section>

        {/* THE BOARD — calm, ordered. Structure receives. */}
        <section className={styles.boardWrap}>
          <p className={styles.zoneLabel}>
            Your direction <span className={styles.count}>{placed.length} pulled</span>
          </p>
          <div ref={boardRef} className={styles.board}>
            {placedCards.length === 0 && (
              <p className={styles.boardEmpty}>Pull a card here. It will snap flat and find its place.</p>
            )}
            <div className={styles.boardGrid}>
              {placedCards.map((c) => (
                <figure key={c.id} className={styles.placed}>
                  <img
                    className={styles.placedImg}
                    src={c.pin.imageDisplay}
                    alt={c.pin.alt || c.pin.title || "Inspiration"}
                    draggable={false}
                  />
                </figure>
              ))}
            </div>
          </div>
        </section>
      </div>
    </div>
  );
}
