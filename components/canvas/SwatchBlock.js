"use client";

import styles from "./canvas.module.css";

/**
 * A color swatch block, in one of three styles (cycled from the toolbar):
 *   - card   → color above a name + hex caption (the default)
 *   - plain  → just the color, full-bleed
 *   - circle → a color chip, no label (the block renders "bare" — see Block)
 *
 * Pulled from the project's own palette when added, so swatches on the board
 * trace back to the colors the project actually uses.
 */
export default function SwatchBlock({ payload }) {
  const hex = payload?.hex || "#cccccc";
  const name = payload?.name || hex.toUpperCase();
  const style = payload?.style || "card";

  if (style === "plain") {
    return <div className={styles.swatchPlain} style={{ background: hex }} />;
  }

  if (style === "circle") {
    return (
      <div className={styles.swatchCircleWrap}>
        <div className={styles.swatchCircle} style={{ background: hex }} />
      </div>
    );
  }

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
