"use client";

import { useState } from "react";
import Link from "next/link";
import palette from "../../data/palette.json";
import FigmaFrame from "../../components/FigmaFrame";
import styles from "./page.module.css";

const SWATCH = 56;
const FRAME_W = 1920;
const FRAME_H = 1080;

export default function ColorsPage() {
  const [hovered, setHovered] = useState(null);

  // Show only the inspiration grid for now; curated row coordinates need
  // recalculation from Figma metadata (some were rotated containers I
  // mis-positioned). Their hexes still live in palette.json and feed the
  // Brand page pool.
  const sourceSwatches = palette.raw.filter((sw) => sw.group === "source");

  return (
    <div className={styles.page}>
      <header className={styles.bar}>
        <Link href="/" className={styles.back}>
          ← Moodbuilder
        </Link>
        <div className={styles.barMeta}>
          <span>Colors — Figma frame 255:756</span>
          <span className={styles.dot} />
          <span>{sourceSwatches.length} swatches · inspiration grid</span>
        </div>
        <button
          type="button"
          className={styles.copyBtn}
          onClick={() => copyAll(sourceSwatches)}
        >
          Copy all hexes
        </button>
      </header>

      <FigmaFrame width={FRAME_W} height={FRAME_H} background="#ffffff">
        {sourceSwatches.map((sw) => (
          <button
            key={sw.id}
            type="button"
            className={styles.swatch}
            style={{
              left: sw.x,
              top: sw.y,
              width: SWATCH,
              height: SWATCH,
              backgroundColor: sw.hex,
            }}
            onMouseEnter={() => setHovered(sw)}
            onMouseLeave={() => setHovered(null)}
            onClick={() => navigator.clipboard?.writeText(sw.hex)}
            title={`${sw.hex} (click to copy)`}
            aria-label={`Swatch ${sw.hex} in group ${sw.group}`}
          />
        ))}
      </FigmaFrame>

      <div className={styles.readout} aria-live="polite">
        {hovered ? (
          <>
            <span className={styles.chip} style={{ backgroundColor: hovered.hex }} />
            <span className={styles.hex}>{hovered.hex.toUpperCase()}</span>
            <span className={styles.group}>{hovered.group}</span>
          </>
        ) : (
          <span className={styles.hint}>Hover any swatch · click to copy hex</span>
        )}
      </div>
    </div>
  );
}

function copyAll(swatches) {
  const lines = swatches.map((s) => s.hex).join("\n");
  navigator.clipboard?.writeText(lines);
}
