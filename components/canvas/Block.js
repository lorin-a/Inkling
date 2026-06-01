"use client";

import { useRef } from "react";
import styles from "./canvas.module.css";

/**
 * A positioned block on the board: the generic geometry + chrome wrapper.
 * Payload rendering (image, and later swatch / type / texture) is the
 * `children`; this owns move, 8-way resize, z-order, delete, and — from day
 * one — full keyboard operation (arrows nudge, Alt+arrows resize) so the
 * board meets WCAG 2.5.7 without a pointer. Hand-rolled exactly so this
 * stays true.
 *
 * Pointer move + resize both run through the root via pointer capture: a
 * pointerdown on a [data-resize] handle resizes, anywhere else moves, and
 * [data-noselect] children (credit link, toolbar) opt out so they stay
 * clickable. One coordinate space, no zoom — board px == client px.
 */

const MIN = 64; // smallest a block can shrink to, px
const HANDLES = ["nw", "n", "ne", "e", "se", "s", "sw", "w"];

// Layer icons read as "this card in front of / behind another" — far clearer
// than the old ⤓⤒ glyphs, which looked like up/down nudges that did nothing.
function ForwardIcon() {
  return (
    <svg width="15" height="15" viewBox="0 0 15 15" fill="none" aria-hidden="true">
      <rect x="1.5" y="1.5" width="8" height="8" rx="1.5" stroke="currentColor" strokeWidth="1.3" />
      <rect x="5.5" y="5.5" width="8" height="8" rx="1.5" fill="currentColor" />
    </svg>
  );
}
function BackIcon() {
  return (
    <svg width="15" height="15" viewBox="0 0 15 15" fill="none" aria-hidden="true">
      <rect x="1.5" y="1.5" width="8" height="8" rx="1.5" fill="currentColor" />
      <rect x="5.5" y="5.5" width="8" height="8" rx="1.5" fill="var(--bg-elevated)" stroke="currentColor" strokeWidth="1.3" />
    </svg>
  );
}

export default function Block({
  block,
  selected,
  label,
  canLayer,
  onSelect,
  onChange,
  onDelete,
  onForward,
  onBackward,
  children,
}) {
  const drag = useRef(null);

  function onPointerDown(e) {
    if (e.button != null && e.button !== 0) return; // left / primary only
    if (e.target.closest("[data-noselect]")) return; // links + toolbar buttons
    onSelect();
    const handle = e.target.closest("[data-resize]");
    e.currentTarget.setPointerCapture(e.pointerId);
    drag.current = {
      mode: handle ? "resize" : "move",
      dir: handle?.dataset.resize || "",
      px: e.clientX,
      py: e.clientY,
      x: block.x,
      y: block.y,
      w: block.w,
      h: block.h,
    };
  }

  function onPointerMove(e) {
    const d = drag.current;
    if (!d) return;
    const dx = e.clientX - d.px;
    const dy = e.clientY - d.py;
    if (d.mode === "move") {
      onChange({ x: Math.max(0, Math.round(d.x + dx)), y: Math.max(0, Math.round(d.y + dy)) });
      return;
    }
    onChange(resize(d, dx, dy));
  }

  function onPointerUp(e) {
    if (drag.current) {
      try { e.currentTarget.releasePointerCapture(e.pointerId); } catch {}
      drag.current = null;
    }
  }

  function onKeyDown(e) {
    const step = e.shiftKey ? 10 : 1;
    const resizing = e.altKey;
    switch (e.key) {
      case "ArrowLeft":
      case "ArrowRight":
      case "ArrowUp":
      case "ArrowDown": {
        e.preventDefault();
        const sx = e.key === "ArrowLeft" ? -step : e.key === "ArrowRight" ? step : 0;
        const sy = e.key === "ArrowUp" ? -step : e.key === "ArrowDown" ? step : 0;
        if (resizing) {
          onChange({ w: Math.max(MIN, block.w + sx), h: Math.max(MIN, block.h + sy) });
        } else {
          onChange({ x: Math.max(0, block.x + sx), y: Math.max(0, block.y + sy) });
        }
        break;
      }
      case "Delete":
      case "Backspace":
        e.preventDefault();
        onDelete();
        break;
      case "]":
        e.preventDefault();
        onForward();
        break;
      case "[":
        e.preventDefault();
        onBackward();
        break;
      default:
        break;
    }
  }

  return (
    <div
      className={`${styles.block} ${selected ? styles.blockSelected : ""}`}
      style={{ left: block.x, top: block.y, width: block.w, height: block.h, zIndex: block.z || 0 }}
      tabIndex={0}
      role="group"
      aria-label={label}
      onPointerDown={onPointerDown}
      onPointerMove={onPointerMove}
      onPointerUp={onPointerUp}
      onPointerCancel={onPointerUp}
      onFocus={onSelect}
      onKeyDown={onKeyDown}
    >
      {children}

      {selected && (
        <>
          <div className={styles.toolbar} data-noselect role="toolbar" aria-label="Block actions">
            {canLayer && (
              <>
                <button type="button" className={styles.toolBtn} onClick={onForward} title="Bring forward (])" aria-label="Bring forward"><ForwardIcon /></button>
                <button type="button" className={styles.toolBtn} onClick={onBackward} title="Send backward ([)" aria-label="Send backward"><BackIcon /></button>
                <span className={styles.toolDivider} aria-hidden="true" />
              </>
            )}
            <button type="button" className={`${styles.toolBtn} ${styles.toolDelete}`} onClick={onDelete} title="Delete (⌫)" aria-label="Delete block">✕</button>
          </div>
          {HANDLES.map((dir) => (
            <span key={dir} data-resize={dir} className={`${styles.handle} ${styles[`handle_${dir}`]}`} aria-hidden="true" />
          ))}
        </>
      )}
    </div>
  );
}

// Apply a resize delta for the grabbed direction, honoring the minimum size
// and anchoring the opposite edge (drag a west handle and the east edge holds).
function resize(d, dx, dy) {
  let { x, y, w, h } = d;
  if (d.dir.includes("e")) w = d.w + dx;
  if (d.dir.includes("s")) h = d.h + dy;
  if (d.dir.includes("w")) { w = d.w - dx; x = d.x + dx; }
  if (d.dir.includes("n")) { h = d.h - dy; y = d.y + dy; }
  if (w < MIN) { if (d.dir.includes("w")) x -= MIN - w; w = MIN; }
  if (h < MIN) { if (d.dir.includes("n")) y -= MIN - h; h = MIN; }
  return {
    x: Math.max(0, Math.round(x)),
    y: Math.max(0, Math.round(y)),
    w: Math.round(w),
    h: Math.round(h),
  };
}
