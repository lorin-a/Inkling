"use client";

import { useEffect, useRef } from "react";
import { dispDims, clampFocal, clampZoom, ZOOM_MIN, ZOOM_MAX } from "./crop";
import styles from "./canvas.module.css";

/**
 * A positioned block on the board: the generic geometry + chrome wrapper.
 * Payload rendering (image, and later swatch / type / texture) is the
 * `children`; this owns move, 8-way resize, z-order, delete, crop, and — from
 * day one — full keyboard operation (arrows nudge, Alt+arrows resize, arrows
 * pan in crop mode) so the board meets WCAG 2.5.7 without a pointer.
 *
 * Two pointer modes share the root via pointer capture:
 *   - normal: pointerdown on a [data-resize] handle resizes, anywhere else
 *     moves; [data-noselect] children (credit link, toolbar) opt out.
 *   - crop: pointerdown anywhere pans the image inside the frame (focal point);
 *     resize handles + the normal toolbar are hidden, a crop bar takes over.
 */

const MIN = 64; // smallest a block can shrink to, px
const HANDLES = ["nw", "n", "ne", "e", "se", "s", "sw", "w"];

// Directional, not depth-cued: up arrow = forward a layer, down = backward.
// (Overlapping-square glyphs read ambiguously at this size.) A faint layer bar
// grounds the arrow so it reads as "move through the stack," not "scroll."
function ForwardIcon() {
  return (
    <svg width="15" height="15" viewBox="0 0 15 15" fill="none" aria-hidden="true">
      <path d="M7.5 2.5 L11.5 6.5 H3.5 Z" fill="currentColor" />
      <rect x="3" y="9.5" width="9" height="2.5" rx="1.25" fill="currentColor" opacity="0.4" />
    </svg>
  );
}
function BackIcon() {
  return (
    <svg width="15" height="15" viewBox="0 0 15 15" fill="none" aria-hidden="true">
      <rect x="3" y="3" width="9" height="2.5" rx="1.25" fill="currentColor" opacity="0.4" />
      <path d="M7.5 12.5 L11.5 8.5 H3.5 Z" fill="currentColor" />
    </svg>
  );
}
function CropIcon() {
  return (
    <svg width="15" height="15" viewBox="0 0 15 15" fill="none" aria-hidden="true">
      <path d="M4 1v10h10M1 4h10v10" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}
function StyleIcon() {
  return (
    <svg width="15" height="15" viewBox="0 0 15 15" fill="none" aria-hidden="true">
      <rect x="1.5" y="4" width="6" height="6" rx="1.2" fill="currentColor" />
      <circle cx="10.5" cy="7" r="3" fill="currentColor" opacity="0.45" />
    </svg>
  );
}

export default function Block({
  block,
  renderZ,
  selected,
  label,
  canLayer,
  cropping,
  bare,
  onSelect,
  onChange,
  onDelete,
  onForward,
  onBackward,
  onEnterCrop,
  onExitCrop,
  onCropChange,
  onStyle,
  onFont,
  children,
}) {
  const rootRef = useRef(null);
  const drag = useRef(null);

  // The image's aspect ratio (for crop math): stored on the payload, else the
  // frame's own ratio (true for an un-resized block).
  const ratio = block.payload?.ratio || block.w / block.h;
  const zoom = block.payload?.zoom ?? 1;

  // Focus the block when crop mode opens so keyboard pan works immediately.
  useEffect(() => {
    if (cropping && rootRef.current) rootRef.current.focus();
  }, [cropping]);

  function onPointerDown(e) {
    if (e.button != null && e.button !== 0) return; // primary only
    if (e.target.closest("[data-noselect]")) return; // links, toolbars, slider

    if (cropping) {
      onSelect();
      e.currentTarget.setPointerCapture(e.pointerId);
      drag.current = {
        mode: "crop",
        px: e.clientX,
        py: e.clientY,
        fx: block.payload?.focal?.x ?? 0.5,
        fy: block.payload?.focal?.y ?? 0.5,
      };
      return;
    }

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
    if (d.mode === "crop") {
      const { dispW, dispH } = dispDims(block.w, block.h, ratio, zoom);
      const nx = d.fx - (dispW > 0 ? dx / dispW : 0);
      const ny = d.fy - (dispH > 0 ? dy / dispH : 0);
      onCropChange({ focal: clampFocal(nx, ny, block.w, block.h, ratio, zoom) });
      return;
    }
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

  function setZoom(next) {
    const z = clampZoom(next);
    const focal = clampFocal(
      block.payload?.focal?.x ?? 0.5,
      block.payload?.focal?.y ?? 0.5,
      block.w, block.h, ratio, z
    );
    onCropChange({ zoom: z, focal });
  }

  function onKeyDown(e) {
    if (cropping) {
      const panStep = e.shiftKey ? 0.06 : 0.02;
      switch (e.key) {
        case "ArrowLeft":
        case "ArrowRight":
        case "ArrowUp":
        case "ArrowDown": {
          e.preventDefault();
          const dfx = e.key === "ArrowLeft" ? -panStep : e.key === "ArrowRight" ? panStep : 0;
          const dfy = e.key === "ArrowUp" ? -panStep : e.key === "ArrowDown" ? panStep : 0;
          const cur = block.payload?.focal || { x: 0.5, y: 0.5 };
          onCropChange({ focal: clampFocal(cur.x + dfx, cur.y + dfy, block.w, block.h, ratio, zoom) });
          break;
        }
        case "+":
        case "=":
          e.preventDefault();
          setZoom(zoom + 0.15);
          break;
        case "-":
        case "_":
          e.preventDefault();
          setZoom(zoom - 0.15);
          break;
        case "Escape":
        case "Enter":
          e.preventDefault();
          onExitCrop();
          break;
        default:
          break;
      }
      return;
    }

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
      case "Enter":
        if (block.type === "image" && onEnterCrop) {
          e.preventDefault();
          onEnterCrop();
        }
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
      ref={rootRef}
      className={`${styles.block} ${bare ? styles.bare : ""} ${selected ? styles.blockSelected : ""} ${cropping ? styles.blockCropping : ""}`}
      style={{ left: block.x, top: block.y, width: block.w, height: block.h, zIndex: cropping ? 9999 : (renderZ || 0) }}
      tabIndex={0}
      role="group"
      aria-label={label}
      onPointerDown={onPointerDown}
      onPointerMove={onPointerMove}
      onPointerUp={onPointerUp}
      onPointerCancel={onPointerUp}
      onFocus={cropping ? undefined : onSelect}
      onDoubleClick={() => { if (!cropping && block.type === "image" && onEnterCrop) onEnterCrop(); }}
      onKeyDown={onKeyDown}
    >
      {children}

      {cropping && (
        <div className={styles.cropBar} data-noselect role="toolbar" aria-label="Crop image">
          <span className={styles.cropHint} aria-hidden="true">Drag to reframe</span>
          <input
            className={styles.zoomSlider}
            type="range"
            min={ZOOM_MIN}
            max={ZOOM_MAX}
            step="0.01"
            value={zoom}
            onChange={(e) => setZoom(parseFloat(e.target.value))}
            aria-label="Zoom"
            title="Zoom"
          />
          <button type="button" className={styles.cropDone} onClick={onExitCrop}>Done</button>
        </div>
      )}

      {selected && !cropping && (
        <>
          <div className={styles.toolbar} data-noselect role="toolbar" aria-label="Block actions">
            {block.type === "image" && (
              <button type="button" className={styles.toolBtn} onClick={onEnterCrop} title="Crop (double-click)" aria-label="Crop image"><CropIcon /></button>
            )}
            {block.type === "swatch" && (
              <button type="button" className={styles.toolBtn} onClick={onStyle} title="Swatch style" aria-label="Change swatch style"><StyleIcon /></button>
            )}
            {block.type === "text" && (
              <button type="button" className={styles.toolBtn} onClick={onFont} title="Typeface" aria-label="Change typeface"><span className={styles.toolText}>Aa</span></button>
            )}
            {canLayer && (
              <>
                <button type="button" className={styles.toolBtn} onClick={onForward} title="Bring forward (])" aria-label="Bring forward one layer"><ForwardIcon /></button>
                <button type="button" className={styles.toolBtn} onClick={onBackward} title="Send backward ([)" aria-label="Send backward one layer"><BackIcon /></button>
              </>
            )}
            <span className={styles.toolDivider} aria-hidden="true" />
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
