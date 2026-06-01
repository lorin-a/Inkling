"use client";

import styles from "./canvas.module.css";

/**
 * A shape block — a rectangle or a line/divider — for structuring a collage.
 * Fill comes from the project palette (recolor via the Fill control on the
 * toolbar). A line renders bare (the block is transparent) so it reads as a
 * rule on the board, not a boxed object.
 */
export default function ShapeBlock({ payload }) {
  const kind = payload?.kind || "rect";
  const fill = payload?.fill || "#cccccc";

  if (kind === "line") {
    return (
      <div className={styles.shapeLineWrap}>
        <div className={styles.shapeLine} style={{ background: fill }} />
      </div>
    );
  }

  return <div className={styles.shapeRect} style={{ background: fill }} />;
}
