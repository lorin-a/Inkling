"use client";

import ImageBlock from "./ImageBlock";
import SwatchBlock from "./SwatchBlock";
import TextBlock from "./TextBlock";
import ShapeBlock from "./ShapeBlock";
import styles from "./canvas.module.css";

/**
 * The left pane of carve mode: a scaled, read-only view of your everything board that
 * you drag pieces OUT of. Dragging a piece carries a *copy* (the everything board is
 * never touched) which the new board on the right accepts as a drop. The whole point
 * of the funnel made tangible — pull what you want forward by hand.
 *
 * Read-only on purpose: items here only drag-to-duplicate, they don't rearrange, so
 * there's no two-drag-system conflict with the editable board on the right.
 */

const SCALE = 0.55;

export default function CarveSource({ board }) {
  const blocks = board?.blocks || [];
  const contentW = blocks.reduce((m, b) => Math.max(m, b.x + b.w), 0) + 80;
  const contentH = blocks.reduce((m, b) => Math.max(m, b.y + b.h), 0) + 80;

  function onDragStart(e, b) {
    const draft = { type: b.type, w: b.w, h: b.h, payload: { ...b.payload } };
    e.dataTransfer.setData("application/json", JSON.stringify(draft));
    e.dataTransfer.effectAllowed = "copy";
  }

  return (
    <div className={styles.carveSource}>
      {blocks.length === 0 ? (
        <p className={styles.carveSourceEmpty}>This board is empty — nothing to carve from yet.</p>
      ) : (
        <div className={styles.carveSourceInner} style={{ width: contentW * SCALE, height: contentH * SCALE }}>
          <div
            className={styles.carveScaled}
            style={{ width: contentW, height: contentH, transform: `scale(${SCALE})` }}
          >
            {blocks.map((b) => (
              <div
                key={b.id}
                className={styles.carveItem}
                style={{ left: b.x, top: b.y, width: b.w, height: b.h }}
                draggable
                onDragStart={(e) => onDragStart(e, b)}
                title="Drag onto your new board to copy it over"
              >
                {b.type === "image" && <ImageBlock payload={b.payload} frameW={b.w} frameH={b.h} blockId={b.id} />}
                {b.type === "swatch" && <SwatchBlock payload={b.payload} />}
                {b.type === "text" && <TextBlock payload={b.payload} selected={false} onChange={() => {}} />}
                {b.type === "shape" && <ShapeBlock payload={b.payload} />}
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
