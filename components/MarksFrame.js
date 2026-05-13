"use client";

import { useState } from "react";
import InlineMark from "./InlineMark";
import styles from "./MarksFrame.module.css";

const MARK_NAMES = [
  "cursive",
  "flood",
  "fog",
  "frenzy",
  "signal",
  "spiral",
  "squiggle",
  "tangle",
  "underline",
];

/**
 * Dedicated frame for the hand-drawn marks gallery. Marks render with their
 * native Figma colors — they are intentional multi-color assets and the
 * shuffle palette does not repaint them.
 *
 * The background of the frame toggles between the palette's lightest and
 * darkest hexes so marks can be checked against both light and dark surfaces.
 */
export default function MarksFrame({ palette }) {
  const [variant, setVariant] = useState("light");
  const { light, dark } = surfaceColors(palette);
  const bg = variant === "light" ? light : dark;

  return (
    <div className={styles.wrap}>
      <header className={styles.header}>
        <h2 className={styles.title}>Marks</h2>
        <p className={styles.hint}>Hand-drawn brand assets. Native colors preserved across shuffles.</p>
        <div className={styles.toggle} role="tablist" aria-label="Surface variant">
          <button
            type="button"
            role="tab"
            aria-selected={variant === "light"}
            className={`${styles.toggleBtn} ${variant === "light" ? styles.toggleBtnActive : ""}`}
            onClick={() => setVariant("light")}
          >
            Light
          </button>
          <button
            type="button"
            role="tab"
            aria-selected={variant === "dark"}
            className={`${styles.toggleBtn} ${variant === "dark" ? styles.toggleBtnActive : ""}`}
            onClick={() => setVariant("dark")}
          >
            Dark
          </button>
        </div>
      </header>

      <div className={styles.grid} style={{ background: bg }}>
        {MARK_NAMES.map((name) => (
          <figure key={name} className={styles.cell}>
            <div className={styles.markBox}>
              <InlineMark name={name} width="100%" height="100%" palette={palette} />
            </div>
            <figcaption className={styles.caption} style={{ color: variant === "light" ? "#1a1a1a" : "rgba(255,255,255,0.7)" }}>
              {name}
            </figcaption>
          </figure>
        ))}
      </div>
    </div>
  );
}

function surfaceColors(palette) {
  if (!palette?.length) return { light: "#ffffff", dark: "#1a1a1a" };
  const lum = (hex) => {
    const h = hex.replace("#", "");
    const r = parseInt(h.slice(0, 2), 16) / 255;
    const g = parseInt(h.slice(2, 4), 16) / 255;
    const b = parseInt(h.slice(4, 6), 16) / 255;
    return 0.2126 * r + 0.7152 * g + 0.0722 * b;
  };
  const sorted = palette.slice().sort((a, b) => lum(a) - lum(b));
  return { dark: sorted[0], light: sorted[sorted.length - 1] };
}
