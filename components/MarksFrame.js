"use client";

import { useEffect, useMemo, useState } from "react";
import InlineMark from "./InlineMark";
import { getSvgColors } from "../lib/svgRemap";
import styles from "./MarksFrame.module.css";

const MARK_NAMES = [
  "cursive",
  "flood",
  "fog",
  "frenzy",
  "signal",
  "spiral",
  "squiggle",
  "tangle",
  "underline",
];

/**
 * Gallery of hand-drawn marks. Click any mark → opens an editor that lists
 * the SVG's internal colors and lets you swap each one to a palette color.
 *
 * The frame's surface toggles between the palette's lightest and darkest
 * hexes so marks can be checked against both light and dark backgrounds.
 */
export default function MarksFrame({ palette }) {
  const [variant, setVariant] = useState("light");
  const [editing, setEditing] = useState(null); // mark name or null
  // markOverrides: { [markName]: { [originalHex]: targetHex } }
  const [markOverrides, setMarkOverrides] = useState({});
  // Raw SVG markup cache per mark — fetched on demand for the editor.
  const [rawCache, setRawCache] = useState({});

  const { light, dark } = surfaceColors(palette);
  const bg = variant === "light" ? light : dark;

  // Pre-fetch raw SVG markup once so the editor can read original colors
  // without waiting on a network round-trip when clicked.
  useEffect(() => {
    let cancelled = false;
    Promise.all(
      MARK_NAMES.map((name) =>
        fetch(`/marks/${name}.svg`)
          .then((r) => (r.ok ? r.text() : null))
          .then((text) => ({ name, text }))
          .catch(() => ({ name, text: null })),
      ),
    ).then((results) => {
      if (cancelled) return;
      const next = {};
      for (const { name, text } of results) {
        if (text) next[name] = text;
      }
      setRawCache(next);
    });
    return () => { cancelled = true; };
  }, []);

  function setMarkOverride(markName, origHex, targetHex) {
    setMarkOverrides((prev) => {
      const forMark = { ...(prev[markName] || {}) };
      if (targetHex == null) delete forMark[origHex.toLowerCase()];
      else forMark[origHex.toLowerCase()] = targetHex;
      return { ...prev, [markName]: forMark };
    });
  }

  function resetMark(markName) {
    setMarkOverrides((prev) => {
      const next = { ...prev };
      delete next[markName];
      return next;
    });
  }

  return (
    <div className={styles.wrap}>
      <header className={styles.header}>
        <h2 className={styles.title}>Marks</h2>
        <p className={styles.hint}>Click any mark to recolor its individual fills + strokes.</p>
        <div className={styles.toggle} role="tablist" aria-label="Surface variant">
          <button
            type="button"
            role="tab"
            aria-selected={variant === "light"}
            className={`${styles.toggleBtn} ${variant === "light" ? styles.toggleBtnActive : ""}`}
            onClick={() => setVariant("light")}
          >
            Light
          </button>
          <button
            type="button"
            role="tab"
            aria-selected={variant === "dark"}
            className={`${styles.toggleBtn} ${variant === "dark" ? styles.toggleBtnActive : ""}`}
            onClick={() => setVariant("dark")}
          >
            Dark
          </button>
        </div>
      </header>

      <div className={styles.grid} style={{ background: bg }}>
        {MARK_NAMES.map((name) => (
          <figure key={name} className={styles.cell}>
            <button
              type="button"
              className={styles.cellBtn}
              onClick={() => setEditing(name)}
              title="Click to recolor this mark"
            >
              <div className={styles.markBox}>
                <InlineMark
                  name={name}
                  width="100%"
                  height="100%"
                  palette={palette}
                  overrides={markOverrides[name]}
                />
              </div>
            </button>
            <figcaption
              className={styles.caption}
              style={{ color: variant === "light" ? "#1a1a1a" : "rgba(255,255,255,0.7)" }}
            >
              {name}
              {markOverrides[name] && Object.keys(markOverrides[name]).length > 0 && (
                <span className={styles.captionDot} title="Has custom colors" />
              )}
            </figcaption>
          </figure>
        ))}
      </div>

      {editing && rawCache[editing] && (
        <MarkEditor
          name={editing}
          rawSvg={rawCache[editing]}
          palette={palette}
          overrides={markOverrides[editing] || {}}
          onSet={(orig, target) => setMarkOverride(editing, orig, target)}
          onReset={() => resetMark(editing)}
          onClose={() => setEditing(null)}
          backgroundVariant={bg}
        />
      )}
    </div>
  );
}

function MarkEditor({ name, rawSvg, palette, overrides, onSet, onReset, onClose, backgroundVariant }) {
  const colors = useMemo(() => getSvgColors(rawSvg), [rawSvg]);

  useEffect(() => {
    const onKey = (e) => { if (e.key === "Escape") onClose(); };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  return (
    <div className={styles.modalBackdrop} onClick={onClose}>
      <div className={styles.modal} onClick={(e) => e.stopPropagation()} role="dialog" aria-label={`Edit ${name}`}>
        <button type="button" className={styles.modalClose} onClick={onClose} aria-label="Close">×</button>

        <div className={styles.modalLeft} style={{ background: backgroundVariant }}>
          <div className={styles.modalPreview}>
            <InlineMark name={name} width="100%" height="100%" palette={palette} overrides={overrides} />
          </div>
        </div>

        <div className={styles.modalRight}>
          <header className={styles.modalHeader}>
            <h2 className={styles.modalTitle}>{name}</h2>
            <p className={styles.modalSub}>{colors.length} internal color{colors.length === 1 ? "" : "s"} · click a palette swatch to remap</p>
          </header>

          {colors.length === 0 ? (
            <p className={styles.modalEmpty}>No editable colors found in this SVG (it may use named colors or gradients only).</p>
          ) : (
            <div className={styles.colorList}>
              {colors.map((origHex) => {
                const overrideHex = overrides[origHex.toLowerCase()];
                return (
                  <div key={origHex} className={styles.colorRow}>
                    <div className={styles.colorRowHeader}>
                      <span className={styles.originalChip} style={{ backgroundColor: origHex }} />
                      <span className={styles.originalHex}>{origHex.toUpperCase()}</span>
                      <span className={styles.arrow}>→</span>
                      <span
                        className={styles.targetChip}
                        style={{ backgroundColor: overrideHex || derivedTarget(origHex, rawSvg, palette) }}
                        title={overrideHex ? "Custom override" : "Auto-mapped from palette"}
                      />
                      {overrideHex && (
                        <button
                          type="button"
                          className={styles.colorResetBtn}
                          onClick={() => onSet(origHex, null)}
                          title="Reset to auto pick"
                        >
                          reset
                        </button>
                      )}
                    </div>
                    <div className={styles.paletteRow}>
                      {(palette || []).map((p, i) => (
                        <button
                          key={`${origHex}-${i}`}
                          type="button"
                          className={`${styles.paletteSwatch} ${overrideHex?.toLowerCase() === p.toLowerCase() ? styles.paletteSwatchActive : ""}`}
                          style={{ backgroundColor: p }}
                          onClick={() => onSet(origHex, p)}
                          title={`Map ${origHex} → ${p}`}
                          aria-label={`Map ${origHex} to ${p}`}
                        />
                      ))}
                    </div>
                  </div>
                );
              })}
            </div>
          )}

          <div className={styles.modalActions}>
            <button type="button" className={styles.linkBtn} onClick={onReset} disabled={Object.keys(overrides).length === 0}>
              Reset all
            </button>
            <button type="button" className={styles.primaryBtn} onClick={onClose}>
              Done
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

function derivedTarget(origHex, rawSvg, palette) {
  if (!palette || palette.length === 0) return origHex;
  // Mirror the auto map in svgRemap: sort the SVG's unique colors and
  // palette by luminance, interpolate by index.
  const uniqueColors = getSvgColors(rawSvg).sort((a, b) => luminance(a) - luminance(b));
  const sortedPal = [...palette].sort((a, b) => luminance(a) - luminance(b));
  const idx = uniqueColors.findIndex((c) => c.toLowerCase() === origHex.toLowerCase());
  if (idx < 0) return origHex;
  const t = uniqueColors.length === 1 ? 0.5 : idx / (uniqueColors.length - 1);
  return sortedPal[Math.round(t * (sortedPal.length - 1))];
}

function luminance(hex) {
  const h = hex.replace("#", "");
  if (h.length !== 6) return 0;
  const r = parseInt(h.slice(0, 2), 16) / 255;
  const g = parseInt(h.slice(2, 4), 16) / 255;
  const b = parseInt(h.slice(4, 6), 16) / 255;
  const lin = (v) => (v <= 0.03928 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4));
  return 0.2126 * lin(r) + 0.7152 * lin(g) + 0.0722 * lin(b);
}

function surfaceColors(palette) {
  if (!palette?.length) return { light: "#ffffff", dark: "#1a1a1a" };
  const lum = (hex) => {
    const h = hex.replace("#", "");
    const r = parseInt(h.slice(0, 2), 16) / 255;
    const g = parseInt(h.slice(2, 4), 16) / 255;
    const b = parseInt(h.slice(4, 6), 16) / 255;
    return 0.2126 * r + 0.7152 * g + 0.0722 * b;
  };
  const sorted = palette.slice().sort((a, b) => lum(a) - lum(b));
  return { dark: sorted[0], light: sorted[sorted.length - 1] };
}
