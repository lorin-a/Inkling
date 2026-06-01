"use client";

import FontPicker from "../FontPicker";
import { TEXT_FONTS } from "./blockOptions";
import styles from "./canvas.module.css";

/**
 * Typeface chooser for a text block. Quick picks first — the three defaults and
 * the project's own brand fonts (the faces you're composing with) — then the
 * full FontPicker (Google search/browse, custom URL, upload) for anything else.
 *
 * onPick receives either a preset key string ("sans"|"serif"|"mono") or a font
 * value object { family, source, url? }. data-noselect + stopPropagation keep
 * interaction here from dragging or deselecting the block.
 */
export default function TextFontPopover({ current, projectFonts = [], onPick, onClose }) {
  return (
    <div
      className={styles.fontPop}
      data-noselect
      onPointerDown={(e) => e.stopPropagation()}
    >
      <div className={styles.fontPopHead}>
        <span>Typeface</span>
        <button type="button" className={styles.fontPopClose} onClick={onClose} aria-label="Close">✕</button>
      </div>

      <div className={styles.fontQuick}>
        {TEXT_FONTS.map((f) => (
          <button
            key={f.key}
            type="button"
            className={`${styles.fontQuickBtn} ${current === f.key ? styles.fontQuickOn : ""}`}
            style={{ fontFamily: f.css }}
            onClick={() => onPick(f.key)}
          >
            {f.label}
          </button>
        ))}
      </div>

      {projectFonts.length > 0 && (
        <>
          <div className={styles.fontGroupLabel}>From your brand</div>
          <div className={styles.fontQuick}>
            {projectFonts.map((pf, i) => (
              <button
                key={`${pf.value.family}-${i}`}
                type="button"
                className={styles.fontQuickBtn}
                style={{ fontFamily: pf.stack }}
                title={pf.value.family}
                onClick={() => onPick(pf.value)}
              >
                {pf.label}
              </button>
            ))}
          </div>
        </>
      )}

      <div className={styles.fontGroupLabel}>Find a typeface</div>
      <FontPicker
        current={typeof current === "object" ? current : null}
        onPick={(v) => onPick(v)}
        onClear={() => onPick("sans")}
      />
    </div>
  );
}
