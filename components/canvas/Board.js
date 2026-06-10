"use client";

import { useCallback, useRef } from "react";
import Link from "next/link";
import Block from "./Block";
import ImageBlock from "./ImageBlock";
import TextBlock from "./TextBlock";
import SwatchBlock from "./SwatchBlock";
import ShapeBlock from "./ShapeBlock";
import Section, { SectionNameSuggestions } from "./Section";
import CommentPin from "./CommentPin";
import styles from "./canvas.module.css";

// A block belongs to a section when its center falls inside the section's rect.
// Membership is computed, never stored: sorting is purely spatial, so nothing
// is ever hidden or moved by the tool, and a block can count in two overlapping
// zones at once (the multi-cluster affinity case).
function membersInside(section, blocks) {
  let n = 0;
  for (const b of blocks) {
    const cx = b.x + b.w / 2;
    const cy = b.y + b.h / 2;
    if (cx >= section.x && cx <= section.x + section.w && cy >= section.y && cy <= section.y + section.h) n += 1;
  }
  return n;
}

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
  onSetFont,
  onSetFill,
  onSetFinish,
  onApplyFinishAll,
  onPull,
  projectFonts,
  background,
  empty,
  sections = [],
  selectedSectionId,
  onSelectSection,
  onChangeSection,
  onDeleteSection,
  onRenameSection,
  onNoteSection,
  onAddToZone,
  comments = [],
  commenting,
  selectedCommentId,
  onPlaceComment,
  onSelectComment,
  onChangeComment,
  onMoveComment,
  onDeleteComment,
  onDropBlock,
  surfaceRef: externalSurfaceRef,
}) {
  const internalRef = useRef(null);
  // The page hands down a ref so the Pile can hit-test this surface on drop and
  // read scroll-aware coordinates. Mirror the node into both refs.
  const surfaceRef = internalRef;
  const setSurfaceRef = useCallback((node) => {
    internalRef.current = node;
    if (externalSurfaceRef) externalSurfaceRef.current = node;
  }, [externalSurfaceRef]);

  // Accept a piece dragged from the carve-mode source pane → drop a copy here.
  function onSurfaceDragOver(e) {
    if (!onDropBlock) return;
    e.preventDefault();
    e.dataTransfer.dropEffect = "copy";
  }
  function onSurfaceDrop(e) {
    if (!onDropBlock) return;
    e.preventDefault();
    try {
      const draft = JSON.parse(e.dataTransfer.getData("application/json"));
      const rect = surfaceRef.current.getBoundingClientRect();
      onDropBlock(draft, e.clientX - rect.left, e.clientY - rect.top);
    } catch { /* not a block payload — ignore */ }
  }

  // A pointerdown on the bare surface clears every selection. (Blocks, section
  // tabs, and comment pins are the event target for their own clicks, so they
  // never reach here.) Comment placement is handled by a dedicated full-surface
  // overlay below, so a pin can land ON an image, not only on empty canvas.
  function onSurfacePointerDown(e) {
    if (e.target !== surfaceRef.current) return;
    if (croppingId) onExitCrop();
    onSelect(null);
    onSelectSection?.(null);
    onSelectComment?.(null);
  }

  // In comment mode, a transparent layer covers the whole board so a click lands
  // a pin wherever you point — over a reference or in open space alike.
  function onCommentLayerDown(e) {
    if (e.button != null && e.button !== 0) return;
    const rect = surfaceRef.current.getBoundingClientRect();
    onPlaceComment?.(Math.round(e.clientX - rect.left), Math.round(e.clientY - rect.top));
  }

  // Sort by stored z, but RENDER each block at its contiguous index (0..n-1).
  // Stored z only needs to define relative order; deriving the painted
  // z-index here means it can never go negative (which would drop a block
  // behind the board surface and look like it vanished) or balloon unbounded.
  const ordered = [...blocks].sort((a, b) => (a.z || 0) - (b.z || 0));

  return (
    <div
      className={styles.surfaceScroll}
      style={background ? { backgroundColor: background } : undefined}
    >
      <div
        ref={setSurfaceRef}
        className={`${styles.surface} ${commenting ? styles.surfaceCommenting : ""}`}
        onPointerDown={onSurfacePointerDown}
        onDragOver={onSurfaceDragOver}
        onDrop={onSurfaceDrop}
      >
        {empty && sections.length === 0 && (
          <div className={styles.emptyHint}>
            <p className={styles.emptyTitle}>Your direction lands here</p>
            <p className={styles.emptyBody}>
              React to your inspiration on Color and keep a few faces on Type. What you
              choose arrives here gathered and sorted into zones, ready to play with. You
              can always add and arrange things by hand too.
            </p>
            <Link href="/recognize" className={styles.emptyLink}>
              Start with Color →
            </Link>
          </div>
        )}

        <SectionNameSuggestions />
        {sections.map((section) => (
          <Section
            key={section.id}
            section={section}
            selected={section.id === selectedSectionId}
            count={membersInside(section, blocks)}
            onSelect={() => onSelectSection?.(section.id)}
            onChange={(patch) => onChangeSection?.(section.id, patch)}
            onDelete={() => onDeleteSection?.(section.id)}
            onRename={(name) => onRenameSection?.(section.id, name)}
            onNote={(note) => onNoteSection?.(section.id, note)}
            onAddToZone={onAddToZone}
          />
        ))}

        {ordered.map((block, i) => (
          <Block
            key={block.id}
            block={block}
            renderZ={i + 1}
            selected={block.id === selectedId}
            cropping={block.id === croppingId}
            label={blockLabel(block)}
            canLayer={ordered.length > 1}
            bare={
              (block.type === "swatch" && block.payload?.style === "circle") ||
              (block.type === "shape" && block.payload?.kind === "line")
            }
            projectFonts={projectFonts}
            onSelect={() => onSelect(block.id)}
            onChange={(patch) => onChangeBlock(block.id, patch)}
            onDelete={() => onDeleteBlock(block.id)}
            onForward={() => onForward(block.id)}
            onBackward={() => onBackward(block.id)}
            onEnterCrop={() => onEnterCrop(block.id)}
            onExitCrop={onExitCrop}
            onCropChange={(patch) => onCropChange(block.id, patch)}
            onStyle={() => onCycleStyle(block.id)}
            onFont={(font) => onSetFont(block.id, font)}
            onFill={(hex) => onSetFill(block.id, hex)}
            onFinish={(finish) => onSetFinish(block.id, finish)}
            onApplyFinishAll={onApplyFinishAll}
            onPull={onPull && (block.type === "image" || block.type === "swatch" || block.type === "text") ? () => onPull(block.id) : undefined}
          >
            {block.type === "image" && (
              <ImageBlock payload={block.payload} frameW={block.w} frameH={block.h} blockId={block.id} />
            )}
            {block.type === "text" && (
              <TextBlock
                payload={block.payload}
                selected={block.id === selectedId}
                onChange={(patch) => onPayloadChange(block.id, patch)}
              />
            )}
            {block.type === "swatch" && <SwatchBlock payload={block.payload} />}
            {block.type === "shape" && <ShapeBlock payload={block.payload} />}
          </Block>
        ))}

        {comments.map((comment, i) => {
          // A comment attached to a block rides with it: its position is the host's
          // current x/y plus the stored offset. Unattached (or host deleted) → its
          // own x/y.
          const host = comment.attachedTo ? blocks.find((b) => b.id === comment.attachedTo) : null;
          const renderX = host ? host.x + (comment.dx || 0) : comment.x;
          const renderY = host ? host.y + (comment.dy || 0) : comment.y;
          return (
            <CommentPin
              key={comment.id}
              comment={comment}
              number={i + 1}
              selected={comment.id === selectedCommentId}
              renderX={renderX}
              renderY={renderY}
              onSelect={() => onSelectComment?.(comment.id === selectedCommentId ? null : comment.id)}
              onChange={(patch) => onChangeComment?.(comment.id, patch)}
              onMove={(x, y) => onMoveComment?.(comment.id, x, y)}
              onDelete={() => onDeleteComment?.(comment.id)}
            />
          );
        })}

        {commenting && (
          <div
            className={styles.commentLayer}
            onPointerDown={onCommentLayerDown}
            aria-hidden="true"
          />
        )}
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
