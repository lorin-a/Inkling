"use client";

import { useRef } from "react";
import Block from "./Block";
import ImageBlock from "./ImageBlock";
import TextBlock from "./TextBlock";
import SwatchBlock from "./SwatchBlock";
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
  croppingId,
  onSelect,
  onChangeBlock,
  onDeleteBlock,
  onForward,
  onBackward,
  onEnterCrop,
  onExitCrop,
  onCropChange,
  onPayloadChange,
  onCycleStyle,
  onCycleFont,
  empty,
}) {
  const surfaceRef = useRef(null);

  // A pointerdown that lands on the bare surface (not a block) clears
  // selection. Blocks stopPropagation implicitly by being the event target.
  function onSurfacePointerDown(e) {
    if (e.target === surfaceRef.current) {
      if (croppingId) onExitCrop();
      onSelect(null);
    }
  }

  // Sort by stored z, but RENDER each block at its contiguous index (0..n-1).
  // Stored z only needs to define relative order; deriving the painted
  // z-index here means it can never go negative (which would drop a block
  // behind the board surface and look like it vanished) or balloon unbounded.
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
              Click pins on the right to drop references here, or add text and
              color swatches from the top left. Drag to arrange, drag a corner to
              resize, and every image keeps a link back to its source.
            </p>
          </div>
        )}

        {ordered.map((block, i) => (
          <Block
            key={block.id}
            block={block}
            renderZ={i}
            selected={block.id === selectedId}
            cropping={block.id === croppingId}
            label={blockLabel(block)}
            canLayer={ordered.length > 1}
            bare={block.type === "swatch" && block.payload?.style === "circle"}
            onSelect={() => onSelect(block.id)}
            onChange={(patch) => onChangeBlock(block.id, patch)}
            onDelete={() => onDeleteBlock(block.id)}
            onForward={() => onForward(block.id)}
            onBackward={() => onBackward(block.id)}
            onEnterCrop={() => onEnterCrop(block.id)}
            onExitCrop={onExitCrop}
            onCropChange={(patch) => onCropChange(block.id, patch)}
            onStyle={() => onCycleStyle(block.id)}
            onFont={() => onCycleFont(block.id)}
          >
            {block.type === "image" && (
              <ImageBlock payload={block.payload} frameW={block.w} frameH={block.h} />
            )}
            {block.type === "text" && (
              <TextBlock
                payload={block.payload}
                selected={block.id === selectedId}
                onChange={(patch) => onPayloadChange(block.id, patch)}
              />
            )}
            {block.type === "swatch" && <SwatchBlock payload={block.payload} />}
          </Block>
        ))}
      </div>
    </div>
  );
}

function blockLabel(block) {
  if (block.type === "image") {
    const c = block.payload?.credit || block.payload?.sourceDomain || "a source";
    return `Image reference from ${c}. Arrow keys move, Alt with arrows resize, Enter to crop, Delete removes.`;
  }
  return "Board block";
}
