"use client";

import { useEffect, useRef, useState } from "react";
import { apiFetch } from "../../lib/api/client";
import { colorName } from "../../lib/nameThatColor";
import styles from "./canvas.module.css";

/**
 * The "add" cluster, floating top-left of the board. The PinTray covers adding
 * images; this adds the other block types. Swatch opens a small picker of the
 * project's own colors (brand + starred + pin pool) so a dropped swatch is one
 * the project actually uses — taste-driven, not a generic color wheel.
 */
export default function AddBlocks({ onAddText, onAddSwatch }) {
  const [picker, setPicker] = useState(false);
  const [colors, setColors] = useState([]);
  const rootRef = useRef(null);

  useEffect(() => {
    let cancelled = false;
    apiFetch("/api/library/palette", { cache: "no-store" })
      .then((r) => r.json())
      .then((d) => {
        if (cancelled) return;
        const seen = new Set();
        const out = [];
        const push = (hex) => {
          if (!hex || typeof hex !== "string") return;
          const h = hex.toLowerCase();
          if (seen.has(h)) return;
          seen.add(h);
          out.push(h);
        };
        (d.brand || []).forEach(push);
        (d.starred || []).forEach(push);
        (d.palette || []).slice(0, 48).forEach(push);
        setColors(out.slice(0, 54));
      })
      .catch(() => {});
    return () => { cancelled = true; };
  }, []);

  useEffect(() => {
    if (!picker) return;
    const onDown = (e) => {
      if (rootRef.current && !rootRef.current.contains(e.target)) setPicker(false);
    };
    const onKey = (e) => { if (e.key === "Escape") setPicker(false); };
    window.addEventListener("mousedown", onDown);
    window.addEventListener("keydown", onKey);
    return () => {
      window.removeEventListener("mousedown", onDown);
      window.removeEventListener("keydown", onKey);
    };
  }, [picker]);

  return (
    <div className={styles.addCluster} ref={rootRef}>
      <button type="button" className={styles.addBtn} onClick={onAddText}>
        <span className={styles.addGlyph} aria-hidden="true">T</span> Text
      </button>
      <button
        type="button"
        className={styles.addBtn}
        onClick={() => setPicker((v) => !v)}
        aria-haspopup="menu"
        aria-expanded={picker}
      >
        <span className={styles.addGlyph} aria-hidden="true">◧</span> Swatch
      </button>

      {picker && (
        <div className={styles.swatchPicker} role="menu" aria-label="Add a color swatch">
          {colors.length === 0 ? (
            <p className={styles.pickerEmpty}>No project colors yet.</p>
          ) : (
            colors.map((hex) => (
              <button
                key={hex}
                type="button"
                role="menuitem"
                className={styles.pickerSwatch}
                style={{ background: hex }}
                title={`${colorName(hex).name || hex} · ${hex.toUpperCase()}`}
                aria-label={`Add ${colorName(hex).name || hex}`}
                onClick={() => { onAddSwatch(hex, colorName(hex).name || hex.toUpperCase()); setPicker(false); }}
              />
            ))
          )}
        </div>
      )}
    </div>
  );
}
