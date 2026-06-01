"use client";

import styles from "./canvas.module.css";

/**
 * A color swatch block: a block of the color with its name + hex underneath.
 * Pulled from the project's own palette when added, so swatches on the board
 * trace back to the colors the project actually uses. The Block wrapper owns
 * select / move / resize / layer; this is just the face.
 */
export default function SwatchBlock({ payload }) {
  const hex = payload?.hex || "#cccccc";
  const name = payload?.name || hex.toUpperCase();

  return (
    <div className={styles.swatchBlock}>
      <div className={styles.swatchColor} style={{ background: hex }} />
      <div className={styles.swatchCaption}>
        <span className={styles.swatchName}>{name}</span>
        <span className={styles.swatchHex}>{hex.toUpperCase()}</span>
      </div>
    </div>
  );
}
