"use client";

import { useEffect, useRef, useState } from "react";
import ColorPicker from "./ColorPicker";
import styles from "./canvas.module.css";

/**
 * The "add" cluster, floating top-left of the board. The pile (your inspiration)
 * covers adding images; this adds the other block types — text, color swatches
 * (from the project's own palette), shapes (rectangle / line), and a hand-made
 * section (curation already auto-sorts the board into zones; this is for framing
 * your own). The last button reopens your inspiration to pull more from.
 */
export default function AddBlocks({ onAddText, onAddSwatch, onAddShape, onAddSection, onToggleComment, commenting, onOpenLibrary, libraryOpen }) {
  const [open, setOpen] = useState(null); // "swatch" | "shape" | "section" | null
  const rootRef = useRef(null);

  useEffect(() => {
    if (!open) return;
    const onDown = (e) => {
      if (rootRef.current && !rootRef.current.contains(e.target)) setOpen(null);
    };
    const onKey = (e) => { if (e.key === "Escape") setOpen(null); };
    window.addEventListener("mousedown", onDown);
    window.addEventListener("keydown", onKey);
    return () => {
      window.removeEventListener("mousedown", onDown);
      window.removeEventListener("keydown", onKey);
    };
  }, [open]);

  return (
    <div className={styles.addCluster} ref={rootRef}>
      <button type="button" className={styles.addBtn} onClick={onAddText}>
        <span className={styles.addGlyph} aria-hidden="true">T</span> Text
      </button>

      <div className={styles.addItem}>
        <button
          type="button"
          className={styles.addBtn}
          onClick={() => setOpen((v) => (v === "swatch" ? null : "swatch"))}
          aria-haspopup="menu"
          aria-expanded={open === "swatch"}
        >
          <span className={styles.addGlyph} aria-hidden="true">◧</span> Swatch
        </button>
        {open === "swatch" && (
          <div className={styles.swatchPicker} role="menu" aria-label="Add a color swatch">
            <ColorPicker onPick={(hex, name) => { onAddSwatch(hex, name); setOpen(null); }} />
          </div>
        )}
      </div>

      <div className={styles.addItem}>
        <button
          type="button"
          className={styles.addBtn}
          onClick={() => setOpen((v) => (v === "shape" ? null : "shape"))}
          aria-haspopup="menu"
          aria-expanded={open === "shape"}
        >
          <span className={styles.addGlyph} aria-hidden="true">▱</span> Shape
        </button>
        {open === "shape" && (
          <div className={styles.shapeMenu} role="menu" aria-label="Add a shape">
            <button type="button" role="menuitem" className={styles.shapeMenuItem} onClick={() => { onAddShape("rect"); setOpen(null); }}>
              <span className={styles.shapeSwatchRect} aria-hidden="true" /> Rectangle
            </button>
            <button type="button" role="menuitem" className={styles.shapeMenuItem} onClick={() => { onAddShape("line"); setOpen(null); }}>
              <span className={styles.shapeSwatchLine} aria-hidden="true" /> Line
            </button>
          </div>
        )}
      </div>

      {/* One-tap: curation already auto-sorts into zones, so this is just for when you
          want to frame a cluster of your own by hand. */}
      <button type="button" className={styles.addBtn} onClick={onAddSection}>
        <span className={styles.addGlyph} aria-hidden="true">▦</span> Section
      </button>

      <span className={styles.addDivider} aria-hidden="true" />

      {/* A mode: toggle on, then click the board to drop a comment pin. */}
      <button
        type="button"
        className={`${styles.addBtn} ${commenting ? styles.addBtnOn : ""}`}
        onClick={onToggleComment}
        aria-pressed={!!commenting}
        title="Drop comment pins on the board"
      >
        <span className={styles.addGlyph} aria-hidden="true">💬</span> Comment
      </button>

      <span className={styles.addDivider} aria-hidden="true" />

      {/* Your inspiration (the pile) is summoned, not docked — the canvas is the
          figure. Hidden while the pile is open (it has its own close). */}
      {!libraryOpen && (
        <button
          type="button"
          className={styles.addBtn}
          onClick={onOpenLibrary}
          title="Open your inspiration — the pile of pins to pull onto the board"
        >
          <span className={styles.addGlyph} aria-hidden="true">＋</span> Inspiration
        </button>
      )}
    </div>
  );
}
