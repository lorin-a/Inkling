"use client";

import styles from "./studio.module.css";

export const NOTE_COLORS = {
  yellow: "#fff2a8",
  pink: "#ffd3dc",
  blue: "#d2e7ff",
  green: "#d6f3cf",
  lilac: "#e8dcff",
};
export const NOTE_COLOR_KEYS = Object.keys(NOTE_COLORS);

const TAG_LABEL = { keep: "Keep", maybe: "Maybe", no: "No", undecided: "Undecided" };

/**
 * One card on a canvas. A reference, a sticky note, or a color. The parent
 * owns position and gestures; this only draws.
 */
export default function Card({
  card, size, vote, selected, dragging, arriving, delay, revealed, className = "",
  onPointerDown, onPointerMove, onPointerUp, onPointerCancel, onKeyDown,
  onNoteChange, onNoteColor, onNoteRemove, onNoteBlur,
}) {
  const tag = vote?.tag || null;
  const label = card.kind === "swatch"
    ? `Color ${card.hex}`
    : card.kind === "note"
      ? `Note: ${card.text || "empty"}`
      : card.alt || "Reference";
  return (
    <div
      data-card
      data-id={card.id}
      tabIndex={0}
      role="button"
      aria-label={`${label}${tag ? `, ${TAG_LABEL[tag]}` : ""}`}
      className={[
        styles.card, styles[card.kind], className,
        dragging ? styles.dragging : "",
        selected ? styles.selected : "",
        tag ? styles[`tag_${tag}`] : "",
        arriving ? styles.arrive : "",
        card.from ? styles.copy : "",
      ].join(" ")}
      style={{
        left: card.x, top: card.y, width: size.w, height: size.h, zIndex: card.z,
        transform: `rotate(${dragging ? 0 : card.rot || 0}deg)`,
        animationDelay: arriving ? `${delay}ms` : undefined,
        background: card.kind === "note" ? NOTE_COLORS[card.color] || NOTE_COLORS.yellow : undefined,
      }}
      onPointerDown={onPointerDown}
      onPointerMove={onPointerMove}
      onPointerUp={onPointerUp}
      onPointerCancel={onPointerCancel}
      onKeyDown={onKeyDown}
    >
      {card.kind === "reference" && (
        <>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={card.src} alt={card.alt} loading="lazy" decoding="async" draggable={false} />
          <span className={`${styles.strip} ${revealed ? styles.stripIn : ""}`} aria-hidden="true">
            {(card.palette || []).slice(0, 6).map((hex, j) => <i key={hex + j} style={{ background: hex, transitionDelay: `${j * 45}ms` }} />)}
          </span>
          {tag && <span className={styles.voteBadge} aria-hidden="true">{TAG_LABEL[tag]}</span>}
        </>
      )}
      {card.kind === "note" && (
        <>
          <span className={styles.noteBar} data-ui>
            <span className={styles.noteColors} role="group" aria-label="Note color">
              {NOTE_COLOR_KEYS.map((k) => (
                <button
                  key={k} type="button"
                  className={`${styles.noteDot} ${card.color === k ? styles.noteDotOn : ""}`}
                  style={{ background: NOTE_COLORS[k] }}
                  aria-label={`${k} note`}
                  aria-pressed={card.color === k}
                  onPointerDown={(e) => e.stopPropagation()}
                  onClick={(e) => { e.stopPropagation(); onNoteColor?.(card.id, k); }}
                />
              ))}
            </span>
            <button type="button" className={styles.noteRemove} aria-label="Delete note" onPointerDown={(e) => e.stopPropagation()} onClick={(e) => { e.stopPropagation(); onNoteRemove?.(card.id); }}>×</button>
          </span>
          <textarea
            className={styles.noteText}
            value={card.text || ""}
            placeholder="Type a note"
            aria-label="Note text"
            onPointerDown={(e) => e.stopPropagation()}
            onKeyDown={(e) => e.stopPropagation()}
            onChange={(e) => onNoteChange?.(card.id, e.target.value)}
            onBlur={(e) => onNoteBlur?.(card.id, e.target.value)}
          />
        </>
      )}
      {card.kind === "swatch" && (
        <>
          <span className={styles.swatchFill} style={{ background: card.hex }} />
          <span className={styles.swatchHex}>{card.hex}</span>
        </>
      )}
      {card.carried && <span className={styles.carriedMark} aria-hidden="true">in Group</span>}
    </div>
  );
}
