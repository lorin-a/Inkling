"use client";

import { cropLayout } from "./crop";
import styles from "./canvas.module.css";

/**
 * The image payload inside a Block. The block is a *frame*; the image is
 * positioned inside it via the crop model (cover + focal point + zoom) so the
 * user chooses which part shows. See crop.js for the math, Block.js for the
 * drag-to-pan crop mode.
 *
 * Carries its pin's credit inline and keeps it visible + clickable: the credit
 * chip is a real link to the source, never decoration. Preserving that
 * attribution is a hard requirement — every reference traces back to where it
 * came from. The chip is data-noselect so clicking it opens the source instead
 * of starting a drag.
 */
export default function ImageBlock({ payload, frameW, frameH }) {
  const { src, sourceUrl, credit, sourceDomain } = payload || {};
  const creditText = credit || sourceDomain || "source";

  // Aspect ratio: stored at add time; fall back to the frame's own ratio (true
  // for a block that hasn't been resized since it was dropped).
  const ratio = payload?.ratio || (frameW && frameH ? frameW / frameH : 1);
  const fx = payload?.focal?.x ?? 0.5;
  const fy = payload?.focal?.y ?? 0.5;
  const zoom = payload?.zoom ?? 1;

  const box = frameW && frameH ? cropLayout(frameW, frameH, ratio, fx, fy, zoom) : null;
  const imgStyle = box
    ? { position: "absolute", left: box.left, top: box.top, width: box.width, height: box.height, maxWidth: "none" }
    : undefined;

  return (
    <div className={styles.imageBlock}>
      <img
        className={styles.image}
        style={imgStyle}
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
