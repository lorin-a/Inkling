"use client";

import styles from "./canvas.module.css";

/**
 * The image payload inside a Block. Carries its pin's credit inline and keeps
 * it visible + clickable: the credit chip is a real link to the source, never
 * decoration. Preserving that attribution is a hard requirement of the tool —
 * every reference traces back to where it came from.
 *
 * The chip is marked data-noselect so clicking it opens the source instead of
 * starting a drag, and stays out of the block's move/resize gestures.
 */
export default function ImageBlock({ payload }) {
  const { src, sourceUrl, credit, sourceDomain } = payload || {};
  const creditText = credit || sourceDomain || "source";

  return (
    <div className={styles.imageBlock}>
      <img
        className={styles.image}
        src={src}
        alt={creditText ? `Reference from ${creditText}` : "Moodboard reference"}
        draggable={false}
      />
      {sourceUrl ? (
        <a
          className={styles.credit}
          href={sourceUrl}
          target="_blank"
          rel="noopener noreferrer"
          data-noselect
          title={`Source: ${sourceUrl}`}
        >
          {sourceDomain || creditText}
          <span aria-hidden="true" className={styles.creditArrow}>↗</span>
        </a>
      ) : (
        <span className={styles.credit} data-noselect title={creditText}>
          {creditText}
        </span>
      )}
    </div>
  );
}
