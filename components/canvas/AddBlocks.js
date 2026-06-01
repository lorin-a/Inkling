"use client";

import { useEffect, useRef, useState } from "react";
import ColorPicker from "./ColorPicker";
import styles from "./canvas.module.css";

/**
 * The "add" cluster, floating top-left of the board. The PinTray covers adding
 * images; this adds the other block types — text, color swatches (from the
 * project's own palette), and shapes (rectangle / line).
 */
export default function AddBlocks({ onAddText, onAddSwatch, onAddShape }) {
  const [open, setOpen] = useState(null); // "swatch" | "shape" | null
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
    </div>
  );
}
