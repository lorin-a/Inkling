"use client";

import { useState } from "react";
import styles from "./studio.module.css";

/**
 * Comments on one card. Anyone can add a line; everyone sees it at once. This
 * is the shared vocabulary: what each person likes, dislikes, or reads in a
 * card, said to the others, kept with the card wherever it goes.
 */
export default function Thread({ cardId, comments = [], onAdd, onDelete, compact = false, autoFocus = false }) {
  const [draft, setDraft] = useState("");
  const [busy, setBusy] = useState(false);

  const submit = async (e) => {
    e.preventDefault();
    const text = draft.trim();
    if (!text || busy) return;
    setBusy(true);
    await onAdd(cardId, text);
    setDraft("");
    setBusy(false);
  };

  return (
    <div className={`${styles.thread} ${compact ? styles.threadCompact : ""}`} data-ui onPointerDown={(e) => e.stopPropagation()}>
      {comments.length > 0 && (
        <ul className={styles.threadList}>
          {comments.map((c) => (
            <li key={c.id} className={styles.threadItem}>
              <span className={styles.threadBy}>{c.mine ? "You" : c.by}</span>
              <span className={styles.threadText}>{c.text}</span>
              {c.mine && <button type="button" className={styles.threadDelete} aria-label="Delete your comment" onClick={() => onDelete(c.id, cardId)}>×</button>}
            </li>
          ))}
        </ul>
      )}
      <form className={styles.threadForm} onSubmit={submit}>
        <input
          className={styles.threadInput}
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          placeholder={comments.length ? "Add a comment" : "Comment: what you like, dislike, or read in it"}
          aria-label="Add a comment"
          maxLength={600}
          autoFocus={autoFocus}
          onKeyDown={(e) => e.stopPropagation()}
        />
        <button type="submit" className={styles.quietSmall} disabled={!draft.trim() || busy}>Post</button>
      </form>
    </div>
  );
}
