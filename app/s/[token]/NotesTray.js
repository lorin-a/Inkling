"use client";

import styles from "./studio.module.css";
import { NOTE_COLORS, NOTE_COLOR_KEYS } from "./Card";

/**
 * Every note, on every step. Notes are cards on the Look and Group boards;
 * this tray is the same notes as a list, so a thought can be written down
 * from anywhere without leaving the step you are on.
 */
export default function NotesTray({ notes, onAdd, onChange, onColor, onRemove, onBlur, onClose, onJump }) {
  return (
    <aside className={styles.tray} aria-label="Notes">
      <div className={styles.trayHead}>
        <h2 className={styles.trayTitle}>Notes</h2>
        <button type="button" className={styles.trayClose} onClick={onClose} aria-label="Close notes">×</button>
      </div>
      <button type="button" className={styles.action} onClick={() => onAdd()}>+ New note</button>
      <p className={styles.trayHint}>Notes also sit on the Look and Group boards as sticky notes you can drag.</p>
      <ul className={styles.trayList}>
        {notes.length === 0 && <li className={styles.trayEmpty}>No notes yet.</li>}
        {notes.map((n) => (
          <li key={n.id} className={styles.trayNote} style={{ background: NOTE_COLORS[n.color] || NOTE_COLORS.yellow }}>
            <textarea
              className={styles.trayText}
              value={n.text || ""}
              placeholder="Type a note"
              aria-label="Note text"
              rows={2}
              onChange={(e) => onChange(n.id, e.target.value)}
              onBlur={(e) => onBlur?.(n.id, e.target.value)}
            />
            <div className={styles.trayRow}>
              <span className={styles.noteColors} role="group" aria-label="Note color">
                {NOTE_COLOR_KEYS.map((k) => (
                  <button key={k} type="button" className={`${styles.noteDot} ${n.color === k ? styles.noteDotOn : ""}`} style={{ background: NOTE_COLORS[k] }} aria-label={`${k} note`} aria-pressed={n.color === k} onClick={() => onColor(n.id, k)} />
                ))}
              </span>
              <span className={styles.trayWhere}>{n.by ? `${n.by} · ` : ""}{n.board === "groups" ? "Group board" : "Bring it in"}</span>
              <button type="button" className={styles.trayLink} onClick={() => onJump(n)}>Show</button>
              <button type="button" className={styles.trayLink} onClick={() => onRemove(n.id)}>Delete</button>
            </div>
          </li>
        ))}
      </ul>
    </aside>
  );
}
