"use client";

import { useEffect, useState } from "react";
import { apiFetch } from "../../lib/api/client";
import { colorName } from "../../lib/nameThatColor";
import ColorPicker from "./ColorPicker";
import {
  FINISHES,
  finishUsesInks,
  withDefaults,
  DEFAULT_INTENSITY,
  FALLBACK_SHADOW,
  FALLBACK_LIGHT,
} from "./finish";
import styles from "./canvas.module.css";

/**
 * Finish chooser for an image block. The reframe Lorin asked for: there's no
 * abstract texture swatch — the live board image *is* the preview, so picking a
 * finish here updates the reference behind the popover in real time. Pick a type,
 * tune intensity, and (for duotone / Riso) the two inks, which default from the
 * project palette so the finish traces back to your taste. "Apply to all images"
 * pushes the current finish across the board for the unified Riso look.
 *
 * data-noselect + stopPropagation keep interaction here from dragging or
 * deselecting the block.
 */
export default function FinishPopover({ finish, onChange, onApplyAll, onClose }) {
  const [palette, setPalette] = useState([]);
  const [inkOpen, setInkOpen] = useState(null); // "shadow" | "light" | null

  const type = finish?.type || "none";
  const intensity = finish?.intensity ?? DEFAULT_INTENSITY;
  const showInks = finishUsesInks(type);

  // The project's own colours, so a duotone defaults to (and can be picked from)
  // your palette rather than arbitrary inks.
  useEffect(() => {
    let cancelled = false;
    apiFetch("/api/library/palette", { cache: "no-store" })
      .then((r) => r.json())
      .then((d) => {
        if (cancelled) return;
        const out = [];
        const push = (h) => { if (typeof h === "string" && h.startsWith("#")) out.push(h.toLowerCase()); };
        (d.brand || []).forEach(push);
        (d.starred || []).forEach(push);
        (d.palette || []).forEach(push);
        setPalette(out);
      })
      .catch(() => {});
    return () => { cancelled = true; };
  }, []);

  function pickType(key) {
    onChange(withDefaults(key, finish || {}, palette));
    setInkOpen(null);
  }
  function setIntensity(v) {
    if (finish) onChange({ ...finish, intensity: v });
  }
  function setInk(which, hex) {
    if (finish) onChange({ ...finish, [which]: hex });
    setInkOpen(null);
  }

  return (
    <div className={styles.finishPop} data-noselect onPointerDown={(e) => e.stopPropagation()}>
      <div className={styles.fontPopHead}>
        <span>Finish</span>
        <button type="button" className={styles.fontPopClose} onClick={onClose} aria-label="Close">✕</button>
      </div>

      <div className={styles.finishChips}>
        {FINISHES.map((f) => (
          <button
            key={f.key}
            type="button"
            className={`${styles.finishChip} ${type === f.key ? styles.finishChipOn : ""}`}
            onClick={() => pickType(f.key)}
            aria-pressed={type === f.key}
          >
            {f.label}
          </button>
        ))}
      </div>

      {type !== "none" && (
        <>
          <label className={styles.finishField}>
            <span className={styles.finishLabel}>Intensity {Math.round(intensity * 100)}%</span>
            <input
              type="range"
              min="0.1"
              max="1"
              step="0.05"
              value={intensity}
              onChange={(e) => setIntensity(parseFloat(e.target.value))}
              className={styles.finishRange}
              aria-label="Finish intensity"
            />
          </label>

          {showInks && (
            <div className={styles.finishInks}>
              {[
                { which: "shadow", label: "Shadow", fallback: FALLBACK_SHADOW },
                { which: "light", label: "Light", fallback: FALLBACK_LIGHT },
              ].map(({ which, label, fallback }) => {
                const hex = finish?.[which] || fallback;
                return (
                  <button
                    key={which}
                    type="button"
                    className={`${styles.finishInk} ${inkOpen === which ? styles.finishInkOn : ""}`}
                    onClick={() => setInkOpen(inkOpen === which ? null : which)}
                    aria-expanded={inkOpen === which}
                    title={`${label} ink — ${colorName(hex).name || hex.toUpperCase()}`}
                  >
                    <span className={styles.finishInkSwatch} style={{ background: hex }} aria-hidden="true" />
                    {label}
                  </button>
                );
              })}
            </div>
          )}

          {inkOpen && (
            <div className={styles.finishInkPicker} role="menu" aria-label={`${inkOpen} ink colour`}>
              <ColorPicker onPick={(hex) => setInk(inkOpen, hex)} />
            </div>
          )}

          <button
            type="button"
            className={styles.finishApplyAll}
            onClick={() => onApplyAll(finish)}
          >
            Apply to all images
          </button>
        </>
      )}
    </div>
  );
}
