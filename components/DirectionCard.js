"use client";

import { useState } from "react";
import Link from "next/link";
import styles from "./DirectionCard.module.css";

/**
 * The Direction — the through-line artifact. It leads the Compose rail and
 * answers, before any control: what is this, where did it come from, what's
 * still empty. Everything in it is yours (a palette pulled from your board, your
 * words about why), so nothing reads as "a sample that came from nowhere."
 *
 * The fill readout is the guidance: a filled pin means that part is yours
 * already; a hollow pin names what's left to do. Structure the artifact, keep
 * the path free.
 */
export default function DirectionCard({
  name,
  onRename,
  why,
  onWhy,
  boardName,
  boardHref = "/moodboard",
  colorCount = 0,
  pieceCount = 0,
  hasType = false,
}) {
  const [editingName, setEditingName] = useState(false);
  const [editingWhy, setEditingWhy] = useState(false);

  const rows = [
    {
      key: "palette",
      label: "Palette",
      filled: colorCount > 0,
      value: colorCount > 0 ? `${colorCount} colour${colorCount === 1 ? "" : "s"}` : "none yet",
      from: colorCount > 0 ? boardName : null,
    },
    {
      key: "pieces",
      label: "Pieces",
      filled: pieceCount > 0,
      value: pieceCount > 0 ? `${pieceCount} pulled from your board` : "none pulled yet",
      from: null,
    },
    {
      key: "type",
      label: "Type",
      filled: hasType,
      value: hasType ? "chosen" : "pick a pairing below",
      from: null,
    },
    {
      key: "mark",
      label: "Mark",
      filled: false,
      value: "name it to generate one, or add your own",
      from: null,
    },
  ];

  return (
    <section className={styles.card} aria-label="Your direction">
      <p className={styles.eyebrow}>Your direction</p>

      {editingName ? (
        <input
          className={styles.nameInput}
          defaultValue={name}
          autoFocus
          onBlur={(e) => {
            onRename?.(e.target.value.trim());
            setEditingName(false);
          }}
          onKeyDown={(e) => {
            if (e.key === "Enter") e.currentTarget.blur();
            if (e.key === "Escape") setEditingName(false);
          }}
          aria-label="Direction name"
        />
      ) : onRename ? (
        <button
          type="button"
          className={styles.name}
          onClick={() => setEditingName(true)}
          title="Rename this direction"
        >
          {name || "Untitled direction"}
        </button>
      ) : (
        <h2 className={styles.name}>{name || "Untitled direction"}</h2>
      )}

      {editingWhy ? (
        <textarea
          className={styles.whyInput}
          defaultValue={why}
          autoFocus
          rows={2}
          placeholder="What is this, and why? (quiet, sun-faded, coastal…)"
          onBlur={(e) => {
            onWhy?.(e.target.value.trim());
            setEditingWhy(false);
          }}
          onKeyDown={(e) => {
            if (e.key === "Escape") setEditingWhy(false);
          }}
          aria-label="What this direction is and why"
        />
      ) : why ? (
        <button
          type="button"
          className={styles.why}
          onClick={() => setEditingWhy(true)}
          title="Edit the why"
        >
          “{why}”
        </button>
      ) : (
        <button type="button" className={styles.whyPrompt} onClick={() => setEditingWhy(true)}>
          + Say what this is, and why
        </button>
      )}

      <ul className={styles.list}>
        {rows.map((r) => (
          <li key={r.key} className={`${styles.row} ${r.filled ? styles.filled : styles.empty}`}>
            <span className={styles.dot} aria-hidden="true" />
            <span className={styles.rowLabel}>{r.label}</span>
            <span className={styles.rowValue}>
              {r.value}
              {r.from && (
                <>
                  {" "}· from{" "}
                  <Link href={boardHref} className={styles.fromLink}>
                    {r.from}
                  </Link>
                </>
              )}
            </span>
          </li>
        ))}
      </ul>
    </section>
  );
}
