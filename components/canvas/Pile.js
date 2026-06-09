"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { apiFetch } from "../../lib/api/client";
import styles from "./Pile.module.css";

/**
 * The pile — your imported inspiration as a tactile, hand-tossed stack you rifle
 * through. Pull a card onto the board and it snaps flat into clean board material.
 * Messy → ordered is the product's overwhelm → relief arc, made physical (the
 * /spike feeling, now on your REAL pins and wired to the real canvas).
 *
 * The pile PERSISTS — it's the well, always there to go back to. Pulling never
 * empties it; a pulled card stays, marked, so nothing disappears on you (Lorin's
 * no-silent-narrowing rule). Relief comes from the board filling with order, not
 * from the pile draining.
 *
 * Drag a card across onto the board surface (hit-tested via `surfaceRef`) to drop
 * it where you point; a plain click adds it at the board's cascade (also the
 * keyboard path — each card is a button). Dependency-free: CSS + pointer-drag.
 * GSAP inertia/Flip is the named production upgrade, not here yet.
 */

// Deterministic pseudo-random so the toss is stable across renders (and SSR):
// Math.random would reshuffle the pile on every paint.
const rand = (seed) => {
  const x = Math.sin(seed * 999.13) * 10000;
  return x - Math.floor(x);
};

// The pile is a bounded, scrollable scatter — a loose 2-column grid with per-card
// jitter, tilt, and vertical overlap so it reads tossed, not tiled, while still
// holding any number of pins without an infinite canvas.
const CONTENT_W = 392; // panel inner width (see Pile.module.css .pileCanvas)
const COLS = 2;
const CELL_W = CONTENT_W / COLS; // 196
const ROW_STEP = 138; // < card height → cards overlap down the pile
const JITTER = 22;

function layout(pins) {
  return pins.map((pin, i) => {
    const w = 132 + Math.round(rand(i + 3) * 26); // 132–158
    const h = Math.round(w * (0.96 + rand(i + 7) * 0.42));
    const col = i % COLS;
    const row = Math.floor(i / COLS);
    const slack = CELL_W - w; // room to jitter inside the column
    const x = Math.round(col * CELL_W + (rand(i) - 0.5) * JITTER + slack / 2);
    const y = Math.round(row * ROW_STEP + (rand(i + 50) - 0.5) * JITTER + 8);
    const tilt = +((rand(i + 9) * 2 - 1) * 6.5).toFixed(2); // -6.5°…+6.5°
    return { id: pin.pinId || String(i), pin, w, h, x: Math.max(0, x), y, tilt, z: i + 1 };
  });
}

export default function Pile({ surfaceRef, usedPinIds, onPullToBoard, onClose }) {
  const [pins, setPins] = useState(null);
  const [drag, setDrag] = useState(null); // { id, pin, w, h, gx, gy } — gx/gy = fixed viewport top-left
  const movedRef = useRef(false);

  useEffect(() => {
    let cancelled = false;
    apiFetch("/api/library", { cache: "no-store" })
      .then((r) => r.json())
      .then((data) => {
        if (cancelled) return;
        const list = Object.values(data.pins || {}).filter(
          (p) => p.imageDisplay || p.thumbnail236 || p.imageOriginal,
        );
        list.sort((a, b) => (b.addedAt || "").localeCompare(a.addedAt || ""));
        setPins(list);
      })
      .catch(() => setPins([]));
    return () => { cancelled = true; };
  }, []);

  const cards = useMemo(() => (pins ? layout(pins) : []), [pins]);
  const canvasH = useMemo(() => {
    if (!cards.length) return 0;
    return Math.max(...cards.map((c) => c.y + c.h)) + 40;
  }, [cards]);

  const onPointerDown = useCallback(
    (e, card) => {
      if (e.button != null && e.button !== 0) return;
      e.preventDefault();
      const rect = e.currentTarget.getBoundingClientRect();
      const offX = e.clientX - rect.left;
      const offY = e.clientY - rect.top;
      const startX = e.clientX;
      const startY = e.clientY;
      movedRef.current = false;
      setDrag({ id: card.id, pin: card.pin, w: rect.width, h: rect.height, gx: rect.left, gy: rect.top });

      const move = (ev) => {
        if (Math.abs(ev.clientX - startX) > 4 || Math.abs(ev.clientY - startY) > 4) movedRef.current = true;
        setDrag((d) => (d ? { ...d, gx: ev.clientX - offX, gy: ev.clientY - offY } : d));
      };
      const up = (ev) => {
        window.removeEventListener("pointermove", move);
        window.removeEventListener("pointerup", up);
        const moved = movedRef.current;
        setDrag(null);
        const surface = surfaceRef?.current;
        if (moved && surface) {
          const r = surface.getBoundingClientRect();
          const over =
            ev.clientX >= r.left && ev.clientX <= r.right && ev.clientY >= r.top && ev.clientY <= r.bottom;
          // getBoundingClientRect already reflects the board's scroll, so the
          // pointer minus the rect origin is the correct surface-local drop point.
          if (over) {
            onPullToBoard(card.pin, { x: Math.round(ev.clientX - r.left), y: Math.round(ev.clientY - r.top) });
            return;
          }
        }
        if (!moved) onPullToBoard(card.pin); // a click (no drag) lands at the board cascade
      };
      window.addEventListener("pointermove", move);
      window.addEventListener("pointerup", up);
    },
    [surfaceRef, onPullToBoard],
  );

  return (
    <aside className={styles.pile} aria-label="Your inspiration, as it came in">
      <header className={styles.head}>
        <span className={styles.title}>Your inspiration</span>
        <button type="button" className={styles.close} onClick={onClose} aria-label="Collapse your inspiration">
          ✕
        </button>
      </header>

      <p className={styles.sub}>
        {pins == null
          ? "Gathering your inspiration…"
          : pins.length === 0
            ? "No pins yet — import a board to fill the pile."
            : "Rifle through. Drag what resonates onto your board — it snaps flat into place."}
      </p>

      <div className={styles.scroll}>
        {pins != null && pins.length === 0 ? (
          <p className={styles.empty}>Once you import inspiration, it spills out here as a pile to sort through.</p>
        ) : (
          <div className={styles.pileCanvas} style={{ height: canvasH }}>
            {cards.map((c) => {
              const used = usedPinIds?.has(c.pin.pinId);
              const lifted = drag?.id === c.id;
              return (
                <button
                  key={c.id}
                  type="button"
                  className={`${styles.slot} ${used ? styles.used : ""}`}
                  style={{
                    left: c.x,
                    top: c.y,
                    width: c.w,
                    zIndex: c.z,
                    visibility: lifted ? "hidden" : "visible",
                    animationDelay: `${Math.min(c.z, 16) * 40}ms`,
                  }}
                  onPointerDown={(e) => onPointerDown(e, c)}
                  title={used ? "Already on your board — drag or click to add again" : "Drag onto your board, or click to add"}
                  aria-label={`${c.pin.title || c.pin.alt || "Inspiration"}${used ? " — already on your board" : ""}`}
                >
                  <span className={styles.card} style={{ "--tilt": `${c.tilt}deg` }}>
                    <img
                      className={styles.img}
                      src={c.pin.thumbnail236 || c.pin.imageDisplay || c.pin.imageOriginal}
                      alt={c.pin.title || c.pin.alt || "Inspiration"}
                      style={{ height: c.h }}
                      loading="lazy"
                      draggable={false}
                    />
                    <span className={styles.grain} aria-hidden="true" />
                    {used && <span className={styles.check} aria-hidden="true">✓</span>}
                  </span>
                </button>
              );
            })}
          </div>
        )}
      </div>

      {/* The lifted card, rendered fixed so it rides free of the pile's overflow
          while you carry it toward the board. De-tilted: out of the pile, in hand. */}
      {drag && (
        <span
          className={styles.ghost}
          style={{ left: drag.gx, top: drag.gy, width: drag.w }}
          aria-hidden="true"
        >
          <img
            className={styles.img}
            src={drag.pin.thumbnail236 || drag.pin.imageDisplay || drag.pin.imageOriginal}
            alt=""
            style={{ height: drag.h }}
            draggable={false}
          />
          <span className={styles.grain} />
        </span>
      )}
    </aside>
  );
}
