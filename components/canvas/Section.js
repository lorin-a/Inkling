"use client";

import { useEffect, useRef, useState } from "react";
import { DIMENSIONS, isDimension, dimensionLabel } from "../../lib/canvasDimensions";
import styles from "./canvas.module.css";

/**
 * An affinity section on the workshop board (VISION §15/§16D): a named,
 * resizable zone you sort references into. It is *scaffolding*, not a
 * reference — it holds only its own frame, a label, and an optional reflective
 * note. Which blocks "belong" to it is computed from position (centers inside),
 * never stored, so a reference can sit in two overlapping zones and the tool
 * never hides or moves anyone's material.
 *
 * Layering: a zone renders BELOW the blocks (lower z), and blocks are its
 * siblings, so a block inside a zone always paints on top and stays fully
 * usable — the zone is only "hit" in the bare areas no block covers. Clicking a
 * bare area selects the zone; the floating title tab is the move handle; resize
 * handles appear when selected. The zone never grabs the blocks inside it:
 * moving a zone leaves its contents where they are (the tool moves nothing —
 * sorting is always the user dragging references, never the zone dragging them).
 *
 * Move / resize / keyboard mirror components/canvas/Block.js so the whole board
 * works the same way under pointer and keyboard alike (WCAG 2.5.7).
 */

const MIN = 120; // a zone needs room to hold things, px
const HANDLES = ["nw", "n", "ne", "e", "se", "s", "sw", "w"];

// The YES reflective prompt — draws the user's own words out, never supplies
// them (the "cultivate intuition, don't supply it" rule).
const NOTE_PROMPT = "What do these have in common in your eyes?";

function CloseIcon() {
  return (
    <svg width="13" height="13" viewBox="0 0 13 13" fill="none" aria-hidden="true">
      <path d="M3 3l7 7M10 3l-7 7" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" />
    </svg>
  );
}

export default function Section({
  section,
  selected,
  count,
  onSelect,
  onChange,
  onDelete,
  onRename,
  onNote,
  onAddToZone,
}) {
  const rootRef = useRef(null);
  const nameRef = useRef(null);
  const drag = useRef(null);
  const [editing, setEditing] = useState(false);
  const [draftName, setDraftName] = useState(section.name || "");

  useEffect(() => {
    if (editing && nameRef.current) {
      nameRef.current.focus();
      nameRef.current.select();
    }
  }, [editing]);

  function startEdit() {
    setDraftName(section.name || "");
    setEditing(true);
  }
  function commitEdit() {
    if (editing) onRename((draftName.trim() || "Untitled section").slice(0, 60));
    setEditing(false);
  }

  function onPointerDown(e) {
    if (e.button != null && e.button !== 0) return;
    if (e.target.closest("[data-noselect]")) return; // name input, buttons, note
    const handle = e.target.closest("[data-resize]");
    const movable = e.target.closest("[data-sectionmove]"); // the title tab
    // A bare-body press just selects — only the tab moves and only handles
    // resize, so a zone never drifts when you click into it to sort.
    if (!handle && !movable) { onSelect(); return; }
    onSelect();
    e.currentTarget.setPointerCapture(e.pointerId);
    drag.current = {
      mode: handle ? "resize" : "move",
      dir: handle?.dataset.resize || "",
      px: e.clientX,
      py: e.clientY,
      x: section.x,
      y: section.y,
      w: section.w,
      h: section.h,
    };
  }

  function onPointerMove(e) {
    const d = drag.current;
    if (!d) return;
    const dx = e.clientX - d.px;
    const dy = e.clientY - d.py;
    if (d.mode === "move") {
      onChange({ x: Math.max(0, Math.round(d.x + dx)), y: Math.max(0, Math.round(d.y + dy)) });
      return;
    }
    onChange(resize(d, dx, dy));
  }

  function onPointerUp(e) {
    if (drag.current) {
      try { e.currentTarget.releasePointerCapture(e.pointerId); } catch {}
      drag.current = null;
    }
  }

  function onKeyDown(e) {
    if (editing) return; // the name input owns its own keys
    const step = e.shiftKey ? 10 : 1;
    const resizing = e.altKey;
    switch (e.key) {
      case "ArrowLeft":
      case "ArrowRight":
      case "ArrowUp":
      case "ArrowDown": {
        e.preventDefault();
        const sx = e.key === "ArrowLeft" ? -step : e.key === "ArrowRight" ? step : 0;
        const sy = e.key === "ArrowUp" ? -step : e.key === "ArrowDown" ? step : 0;
        if (resizing) {
          onChange({ w: Math.max(MIN, section.w + sx), h: Math.max(MIN, section.h + sy) });
        } else {
          onChange({ x: Math.max(0, section.x + sx), y: Math.max(0, section.y + sy) });
        }
        break;
      }
      case "Enter":
        e.preventDefault();
        startEdit();
        break;
      case "Delete":
      case "Backspace":
        e.preventDefault();
        onDelete();
        break;
      default:
        break;
    }
  }

  const accent = section.accent || null;
  const note = section.note || "";
  // An empty dimension zone (Color / Imagery / Type) invites you to fill it — the
  // "+ on the container" that launches the focused tool for that dimension.
  const dimSlug = isDimension((section.name || "").toLowerCase()) ? (section.name || "").toLowerCase() : null;
  const showAdd = count === 0 && dimSlug && onAddToZone;

  return (
    <div
      ref={rootRef}
      className={`${styles.section} ${selected ? styles.sectionSelected : ""}`}
      style={{
        left: section.x,
        top: section.y,
        width: section.w,
        height: section.h,
        ...(accent ? { "--section-accent": accent } : {}),
      }}
      tabIndex={0}
      role="group"
      aria-label={`Affinity section ${section.name || "untitled"}, ${count} ${count === 1 ? "item" : "items"} inside. Drag the title to move, Alt with arrows to resize, Enter to rename, Delete to remove.`}
      onPointerDown={onPointerDown}
      onPointerMove={onPointerMove}
      onPointerUp={onPointerUp}
      onPointerCancel={onPointerUp}
      onFocus={onSelect}
      onKeyDown={onKeyDown}
    >
      {/* Floating title tab — the move handle (drag it to reposition the zone),
          and where the name / count / note live. Sits above the frame so it
          stays clear of the blocks inside. */}
      <div className={styles.sectionTab} data-sectionmove title="Drag to move this section">
        <div className={styles.sectionTabHead}>
          {editing ? (
            <input
              ref={nameRef}
              data-noselect
              className={styles.sectionNameInput}
              value={draftName}
              list="section-name-suggestions"
              onChange={(e) => setDraftName(e.target.value)}
              onBlur={commitEdit}
              onKeyDown={(e) => {
                if (e.key === "Enter") commitEdit();
                if (e.key === "Escape") setEditing(false);
              }}
              maxLength={60}
              aria-label="Section name"
            />
          ) : (
            <button
              type="button"
              data-noselect
              className={styles.sectionName}
              onClick={onSelect}
              onDoubleClick={startEdit}
              title="Double-click to rename"
            >
              {section.name || "Untitled section"}
            </button>
          )}
          <span className={styles.sectionCount} aria-hidden="true">{count}</span>
          {selected && (
            <button
              type="button"
              data-noselect
              className={styles.sectionDelete}
              onClick={onDelete}
              title="Delete section"
              aria-label={`Delete section ${section.name || "untitled"}`}
            >
              <CloseIcon />
            </button>
          )}
        </div>

        {selected ? (
          <input
            data-noselect
            className={styles.sectionNote}
            value={note}
            placeholder={NOTE_PROMPT}
            onChange={(e) => onNote(e.target.value.slice(0, 160))}
            aria-label={NOTE_PROMPT}
          />
        ) : note ? (
          <p className={styles.sectionNoteStatic}>{note}</p>
        ) : null}
      </div>

      {showAdd && (
        <button
          type="button"
          data-noselect
          className={styles.zoneAdd}
          onClick={(e) => { e.stopPropagation(); onAddToZone(dimSlug); }}
          title={`Add ${dimensionLabel(dimSlug).toLowerCase()} by reacting to your inspiration`}
        >
          <span className={styles.zoneAddPlus} aria-hidden="true">+</span>
          add {dimensionLabel(dimSlug).toLowerCase()}
        </button>
      )}

      {selected &&
        HANDLES.map((dir) => (
          <span
            key={dir}
            data-resize={dir}
            className={`${styles.sectionHandle} ${styles[`handle_${dir}`]}`}
            aria-hidden="true"
          />
        ))}
    </div>
  );
}

// One <datalist> of dimension names, shared by every section's rename input.
export function SectionNameSuggestions() {
  return (
    <datalist id="section-name-suggestions">
      {DIMENSIONS.map((d) => (
        <option key={d.slug} value={d.label} />
      ))}
    </datalist>
  );
}

// Resize delta for the grabbed direction, honoring the minimum and anchoring
// the opposite edge — the same math as Block's resize, with a larger minimum.
function resize(d, dx, dy) {
  let { x, y, w, h } = d;
  if (d.dir.includes("e")) w = d.w + dx;
  if (d.dir.includes("s")) h = d.h + dy;
  if (d.dir.includes("w")) { w = d.w - dx; x = d.x + dx; }
  if (d.dir.includes("n")) { h = d.h - dy; y = d.y + dy; }
  if (w < MIN) { if (d.dir.includes("w")) x -= MIN - w; w = MIN; }
  if (h < MIN) { if (d.dir.includes("n")) y -= MIN - h; h = MIN; }
  return {
    x: Math.max(0, Math.round(x)),
    y: Math.max(0, Math.round(y)),
    w: Math.round(w),
    h: Math.round(h),
  };
}
