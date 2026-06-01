"use client";

import { useRef } from "react";
import Block from "./Block";
import ImageBlock from "./ImageBlock";
import styles from "./canvas.module.css";

/**
 * The spatial surface. A scrollable pinboard (no pan/zoom in v1) that holds
 * absolutely-positioned blocks. Owns nothing but layout + the deselect
 * gesture; selection and block mutation live a level up so the board bar and
 * keyboard share one source of truth.
 *
 * Blocks render in z order (the array is kept sorted by z), and the wrapper
 * is type-agnostic — image is the only payload today, swatch / type / texture
 * slot in here later with no change to geometry.
 */
export default function Board({
  blocks,
  selectedId,
  onSelect,
  onChangeBlock,
  onDeleteBlock,
  onForward,
  onBackward,
  empty,
}) {
  const surfaceRef = useRef(null);

  // A pointerdown that lands on the bare surface (not a block) clears
  // selection. Blocks stopPropagation implicitly by being the event target.
  function onSurfacePointerDown(e) {
    if (e.target === surfaceRef.current) onSelect(null);
  }

  const ordered = [...blocks].sort((a, b) => (a.z || 0) - (b.z || 0));

  return (
    <div className={styles.surfaceScroll}>
      <div
        ref={surfaceRef}
        className={styles.surface}
        onPointerDown={onSurfacePointerDown}
      >
        {empty && (
          <div className={styles.emptyHint}>
            <p className={styles.emptyTitle}>An empty board</p>
            <p className={styles.emptyBody}>
              Open the pins panel and click to drop references here. Drag to
              arrange, drag a corner to resize, and every image keeps a link
              back to its source.
            </p>
          </div>
        )}

        {ordered.map((block) => (
          <Block
            key={block.id}
            block={block}
            selected={block.id === selectedId}
            label={blockLabel(block)}
            canLayer={ordered.length > 1}
            onSelect={() => onSelect(block.id)}
            onChange={(patch) => onChangeBlock(block.id, patch)}
            onDelete={() => onDeleteBlock(block.id)}
            onForward={() => onForward(block.id)}
            onBackward={() => onBackward(block.id)}
          >
            {block.type === "image" && <ImageBlock payload={block.payload} />}
          </Block>
        ))}
      </div>
    </div>
  );
}

function blockLabel(block) {
  if (block.type === "image") {
    const c = block.payload?.credit || block.payload?.sourceDomain || "a source";
    return `Image reference from ${c}. Arrow keys move, Alt with arrows resize, Delete removes.`;
  }
  return "Board block";
}
