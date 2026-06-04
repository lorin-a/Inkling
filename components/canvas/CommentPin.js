"use client";

import { useEffect, useRef, useState } from "react";
import styles from "./canvas.module.css";

/**
 * A comment pin on the board (VISION §16F): a numbered marker you drop anywhere — on a
 * reference or in open space — that holds a short thread. Your own notes now; the same
 * shape is the client-comment layer once boards are shared (each message carries an
 * `author`). Position-anchored (like Figma comments), not tied to a block.
 *
 * Drag to move, click to open the thread; arrow keys nudge, Delete removes — the same
 * pointer + keyboard model as Block/Section so the whole board behaves consistently.
 */

const MOVE_THRESHOLD = 4; // px before a press counts as a drag, not a click

export default function CommentPin({ comment, number, selected, renderX, renderY, onSelect, onChange, onMove, onDelete }) {
  const rootRef = useRef(null);
  const inputRef = useRef(null);
  const drag = useRef(null);
  const [draft, setDraft] = useState("");

  const messages = comment.messages || [];
  const resolved = !!comment.resolved;

  // A freshly placed pin (no messages) opens straight into the composer.
  useEffect(() => {
    if (selected && inputRef.current) inputRef.current.focus();
  }, [selected]);

  function onPointerDown(e) {
    if (e.button != null && e.button !== 0) return;
    if (e.target.closest("[data-noselect]")) return; // the open popover
    e.stopPropagation(); // don't let the board treat this as a bare-surface click
    e.currentTarget.setPointerCapture(e.pointerId);
    drag.current = { px: e.clientX, py: e.clientY, x: renderX, y: renderY, moved: false };
  }

  function onPointerMove(e) {
    const d = drag.current;
    if (!d) return;
    const dx = e.clientX - d.px;
    const dy = e.clientY - d.py;
    if (!d.moved && Math.abs(dx) + Math.abs(dy) < MOVE_THRESHOLD) return;
    d.moved = true;
    onMove(Math.max(0, Math.round(d.x + dx)), Math.max(0, Math.round(d.y + dy)));
  }

  function onPointerUp(e) {
    const d = drag.current;
    if (!d) return;
    try { e.currentTarget.releasePointerCapture(e.pointerId); } catch {}
    drag.current = null;
    if (!d.moved) onSelect(); // a press without a drag = open/close the thread
  }

  function onKeyDown(e) {
    // Keys typed in the composer belong to it.
    if (e.target.closest("[data-noselect]")) return;
    const step = e.shiftKey ? 10 : 1;
    switch (e.key) {
      case "ArrowLeft": case "ArrowRight": case "ArrowUp": case "ArrowDown": {
        e.preventDefault();
        const sx = e.key === "ArrowLeft" ? -step : e.key === "ArrowRight" ? step : 0;
        const sy = e.key === "ArrowUp" ? -step : e.key === "ArrowDown" ? step : 0;
        onMove(Math.max(0, renderX + sx), Math.max(0, renderY + sy));
        break;
      }
      case "Enter": case " ":
        e.preventDefault();
        onSelect();
        break;
      case "Delete": case "Backspace":
        e.preventDefault();
        onDelete();
        break;
      default: break;
    }
  }

  function post() {
    const text = draft.trim();
    if (!text) return;
    onChange({ messages: [...messages, { author: "You", text, at: new Date().toISOString() }] });
    setDraft("");
    if (inputRef.current) inputRef.current.focus();
  }

  return (
    <div
      ref={rootRef}
      className={`${styles.commentPin} ${resolved ? styles.commentResolved : ""} ${selected ? styles.commentPinOpen : ""}`}
      style={{ left: renderX, top: renderY }}
      tabIndex={0}
      role="button"
      aria-label={`Comment ${number}${resolved ? ", resolved" : ""}, ${messages.length} ${messages.length === 1 ? "note" : "notes"}`}
      onPointerDown={onPointerDown}
      onPointerMove={onPointerMove}
      onPointerUp={onPointerUp}
      onPointerCancel={onPointerUp}
      onKeyDown={onKeyDown}
    >
      <span className={styles.commentNumber} aria-hidden="true">{resolved ? "✓" : number}</span>

      {selected && (
        <div
          className={styles.commentPop}
          data-noselect
          role="dialog"
          aria-label={`Comment ${number}`}
          onPointerDown={(e) => e.stopPropagation()}
        >
          <div className={styles.commentThread}>
            {messages.length === 0 ? (
              <p className={styles.commentEmpty}>Jot a note about what you’re looking at.</p>
            ) : (
              messages.map((m, i) => (
                <div key={i} className={styles.commentMsg}>
                  <span className={styles.commentAuthor}>{m.author || "You"}</span>
                  <p className={styles.commentText}>{m.text}</p>
                </div>
              ))
            )}
          </div>

          <textarea
            ref={inputRef}
            className={styles.commentInput}
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) { e.preventDefault(); post(); }
            }}
            placeholder={messages.length ? "Reply…" : "Add a note…"}
            rows={2}
            aria-label="Write a note"
          />

          <div className={styles.commentActions}>
            <button type="button" className={styles.commentResolveBtn} onClick={() => onChange({ resolved: !resolved })}>
              {resolved ? "Reopen" : "Resolve"}
            </button>
            <button type="button" className={styles.commentDeleteBtn} onClick={onDelete}>Delete</button>
            <button type="button" className={styles.commentPost} onClick={post} disabled={!draft.trim()}>Post</button>
          </div>
        </div>
      )}
    </div>
  );
}
