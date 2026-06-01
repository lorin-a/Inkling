"use client";

import { useEffect, useRef, useState } from "react";
import styles from "./canvas.module.css";

/**
 * The row of boards for this project. Many boards = many directions, so
 * switching is one click and naming is inline (double-click a tab, or the
 * active tab's pencil). Create + delete live here too. Mirrors the quiet
 * chrome of the rest of the tool — this is a designer's pinboard, not a
 * spreadsheet of tabs.
 */
export default function BoardBar({
  boards,
  activeId,
  onSwitch,
  onCreate,
  onRename,
  onDelete,
  saving,
}) {
  const [editingId, setEditingId] = useState(null);
  const [draft, setDraft] = useState("");
  const inputRef = useRef(null);

  useEffect(() => {
    if (editingId && inputRef.current) {
      inputRef.current.focus();
      inputRef.current.select();
    }
  }, [editingId]);

  function startEdit(board) {
    setEditingId(board.id);
    setDraft(board.name || "");
  }

  function commitEdit() {
    if (editingId) {
      const name = draft.trim() || "Untitled board";
      onRename(editingId, name);
    }
    setEditingId(null);
  }

  return (
    <div className={styles.boardBar}>
      <div className={styles.boardTabs} role="tablist" aria-label="Boards">
        {boards.map((board) => {
          const active = board.id === activeId;
          if (editingId === board.id) {
            return (
              <input
                key={board.id}
                ref={inputRef}
                className={styles.tabInput}
                value={draft}
                onChange={(e) => setDraft(e.target.value)}
                onBlur={commitEdit}
                onKeyDown={(e) => {
                  if (e.key === "Enter") commitEdit();
                  if (e.key === "Escape") setEditingId(null);
                }}
                maxLength={120}
                aria-label="Board name"
              />
            );
          }
          return (
            <button
              key={board.id}
              type="button"
              role="tab"
              aria-selected={active}
              className={`${styles.tab} ${active ? styles.tabActive : ""}`}
              onClick={() => (active ? startEdit(board) : onSwitch(board.id))}
              onDoubleClick={() => startEdit(board)}
              title={active ? "Click to rename" : `Switch to ${board.name}`}
            >
              {board.name || "Untitled board"}
            </button>
          );
        })}

        <button type="button" className={styles.newBoard} onClick={() => onCreate()} title="New board">
          <span aria-hidden="true">+</span> New board
        </button>
      </div>

      <div className={styles.boardBarRight}>
        <span className={styles.saveState} aria-live="polite">
          {saving ? "Saving…" : "Saved"}
        </span>
        {boards.length > 1 && activeId && (
          <button
            type="button"
            className={styles.deleteBoard}
            onClick={() => {
              const b = boards.find((x) => x.id === activeId);
              if (b && window.confirm(`Delete "${b.name || "this board"}"? This can't be undone.`)) {
                onDelete(activeId);
              }
            }}
            title="Delete this board"
          >
            Delete board
          </button>
        )}
      </div>
    </div>
  );
}
