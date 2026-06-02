"use client";

import { cropLayout } from "./crop";
import {
  finishUsesInks,
  finishUsesGrain,
  duotoneStops,
  DEFAULT_INTENSITY,
  FALLBACK_SHADOW,
  FALLBACK_LIGHT,
  GRAIN_URL,
  RISO_GRAIN_URL,
} from "./finish";
import styles from "./canvas.module.css";

/**
 * The image payload inside a Block. The block is a *frame*; the image is
 * positioned inside it via the crop model (cover + focal point + zoom) so the
 * user chooses which part shows. See crop.js for the math, Block.js for the
 * drag-to-pan crop mode.
 *
 * An optional per-image `finish` (grain / Riso / duotone / halftone) rides on
 * top of the image — never the credit chip, which stays crisp and clickable.
 * Duotone is an SVG colour map; grain is a tiling noise overlay; Riso is both;
 * halftone is a grayscale base under a dot screen. All static (export-safe).
 *
 * Carries its pin's credit inline and keeps it visible + clickable: the credit
 * chip is a real link to the source, never decoration. Preserving that
 * attribution is a hard requirement — every reference traces back to where it
 * came from. The chip is data-noselect so clicking it opens the source instead
 * of starting a drag.
 */
export default function ImageBlock({ payload, frameW, frameH, blockId }) {
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

  // ---- finish -------------------------------------------------------------
  const finish = payload?.finish;
  const type = finish?.type;
  const intensity = finish?.intensity ?? DEFAULT_INTENSITY;
  const shadow = finish?.shadow || FALLBACK_SHADOW;
  const light = finish?.light || FALLBACK_LIGHT;
  const usesInks = type ? finishUsesInks(type) : false;
  const usesGrain = type ? finishUsesGrain(type) : false;
  const isHalftone = type === "halftone";
  const isBW = type === "bw";
  const needsGray = isHalftone || isBW; // a grayscale base under the dots / on its own
  // Unique per block so multiple duotoned images don't collide on filter id.
  const filterId = `finish-${blockId || "x"}`;
  const stops = usesInks ? duotoneStops(shadow, light) : null;

  return (
    <div className={styles.imageBlock}>
      <img
        className={styles.image}
        style={imgStyle}
        src={src}
        alt={creditText ? `Reference from ${creditText}` : "Moodboard reference"}
        draggable={false}
      />

      {/* Duotone / Riso: the colour-mapped layer, blended over the original by
          intensity so the slider reads as "how far toward two inks." */}
      {usesInks && box && stops && (
        <>
          <svg width="0" height="0" className={styles.finishDefs} aria-hidden="true">
            <filter id={filterId} colorInterpolationFilters="sRGB">
              <feColorMatrix
                type="matrix"
                values="0.2126 0.7152 0.0722 0 0 0.2126 0.7152 0.0722 0 0 0.2126 0.7152 0.0722 0 0 0 0 0 1 0"
              />
              <feComponentTransfer>
                <feFuncR type="table" tableValues={stops.r.join(" ")} />
                <feFuncG type="table" tableValues={stops.g.join(" ")} />
                <feFuncB type="table" tableValues={stops.b.join(" ")} />
              </feComponentTransfer>
            </filter>
          </svg>
          <img
            className={styles.image}
            style={{ ...imgStyle, filter: `url(#${filterId})`, opacity: intensity, pointerEvents: "none" }}
            src={src}
            alt=""
            aria-hidden="true"
            draggable={false}
          />
        </>
      )}

      {/* B&W on its own, or the contrasty grayscale base under a halftone screen.
          Intensity blends toward the original, so the slider reads as strength. */}
      {needsGray && box && (
        <img
          className={styles.image}
          style={{
            ...imgStyle,
            filter: isHalftone ? "grayscale(1) contrast(1.25)" : "grayscale(1) contrast(1.04)",
            opacity: intensity,
            pointerEvents: "none",
          }}
          src={src}
          alt=""
          aria-hidden="true"
          draggable={false}
        />
      )}
      {isHalftone && (
        <div
          className={styles.halftone}
          style={{ opacity: 0.35 + intensity * 0.45 }}
          aria-hidden="true"
        />
      )}

      {/* Grain / Riso grit: a tiling noise overlay, multiplied onto the image. */}
      {usesGrain && (
        <div
          className={styles.grain}
          style={{
            backgroundImage: type === "riso" ? RISO_GRAIN_URL : GRAIN_URL,
            opacity: type === "riso" ? intensity * 0.55 : intensity * 0.4,
          }}
          aria-hidden="true"
        />
      )}

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
