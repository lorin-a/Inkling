"use client";

import { useEffect, useMemo, useState, useCallback } from "react";
import InlineMark from "./InlineMark";
import { getSvgColors } from "../lib/svgRemap";
import styles from "./MarksFrame.module.css";

/**
 * Gallery of hand-drawn marks for the active project. Reads from
 * /api/marks. Drop SVGs onto the frame to add. Hover a cell to reveal
 * a delete button. Click any mark to recolor its internal fills + strokes.
 *
 * The frame's surface toggles between the palette's lightest and darkest
 * hexes so marks can be checked against both light and dark backgrounds.
 */
export default function MarksFrame({ palette }) {
  const [variant, setVariant] = useState("light");
  const [editing, setEditing] = useState(null);
  const [markOverrides, setMarkOverrides] = useState({});
  const [rawCache, setRawCache] = useState({});
  const [marks, setMarks] = useState([]);
  const [loading, setLoading] = useState(true);
  const [dragOver, setDragOver] = useState(false);
  const [uploadError, setUploadError] = useState(null);
  const [busy, setBusy] = useState(false);

  const { light, dark } = surfaceColors(palette);
  const bg = variant === "light" ? light : dark;

  const refresh = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/marks", { cache: "no-store" });
      const data = await res.json();
      setMarks(data.marks || []);
    } catch {
      setMarks([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { refresh(); }, [refresh]);

  // Pre-fetch raw SVG markup for each mark so the editor reads original
  // colors without waiting on a network round-trip.
  useEffect(() => {
    if (marks.length === 0) { setRawCache({}); return; }
    let cancelled = false;
    Promise.all(
      marks.map((m) =>
        fetch(m.url)
          .then((r) => (r.ok ? r.text() : null))
          .then((text) => ({ file: m.file, text }))
          .catch(() => ({ file: m.file, text: null })),
      ),
    ).then((results) => {
      if (cancelled) return;
      const next = {};
      for (const { file, text } of results) {
        if (text) next[file] = text;
      }
      setRawCache(next);
    });
    return () => { cancelled = true; };
  }, [marks]);

  function setMarkOverride(file, origHex, targetHex) {
    setMarkOverrides((prev) => {
      const forMark = { ...(prev[file] || {}) };
      if (targetHex == null) delete forMark[origHex.toLowerCase()];
      else forMark[origHex.toLowerCase()] = targetHex;
      return { ...prev, [file]: forMark };
    });
  }

  function resetMark(file) {
    setMarkOverrides((prev) => {
      const next = { ...prev };
      delete next[file];
      return next;
    });
  }

  async function handleFiles(fileList) {
    const svgFiles = Array.from(fileList).filter((f) => f.name.toLowerCase().endsWith(".svg"));
    if (svgFiles.length === 0) {
      setUploadError("Drop .svg files only.");
      return;
    }
    setUploadError(null);
    setBusy(true);
    try {
      const fd = new FormData();
      for (const f of svgFiles) fd.append("files", f);
      const res = await fetch("/api/marks", { method: "POST", body: fd });
      const data = await res.json();
      const failures = (data.results || []).filter((r) => !r.ok);
      if (failures.length > 0) {
        setUploadError(failures.map((f) => `${f.name}: ${f.error}`).join(", "));
      }
      await refresh();
    } catch (e) {
      setUploadError(e.message);
    } finally {
      setBusy(false);
    }
  }

  async function handleDelete(file) {
    if (!confirm(`Delete ${file}?`)) return;
    setBusy(true);
    try {
      await fetch(`/api/marks?file=${encodeURIComponent(file)}`, { method: "DELETE" });
      resetMark(file);
      await refresh();
    } finally {
      setBusy(false);
    }
  }

  function onDragOver(e) {
    e.preventDefault();
    setDragOver(true);
  }
  function onDragLeave() { setDragOver(false); }
  function onDrop(e) {
    e.preventDefault();
    setDragOver(false);
    if (e.dataTransfer?.files?.length) handleFiles(e.dataTransfer.files);
  }

  return (
    <div
      className={`${styles.wrap} ${dragOver ? styles.wrapDragOver : ""}`}
      onDragOver={onDragOver}
      onDragLeave={onDragLeave}
      onDrop={onDrop}
    >
      <header className={styles.header}>
        <h2 className={styles.title}>Marks</h2>
        <p className={styles.hint}>
          {marks.length === 0
            ? "Drop .svg files anywhere on this frame to add marks."
            : "Click any mark to recolor. Drop .svg files to add."}
        </p>
        <div className={styles.headerActions}>
          <label className={styles.uploadBtn}>
            <input
              type="file"
              accept=".svg,image/svg+xml"
              multiple
              hidden
              onChange={(e) => e.target.files && handleFiles(e.target.files)}
            />
            Add SVG
          </label>
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
        </div>
      </header>

      {uploadError && <div className={styles.errorBar}>{uploadError}</div>}

      {marks.length === 0 && !loading ? (
        <div
          className={styles.empty}
          style={{
            background: bg,
            color: variant === "light" ? "rgba(0,0,0,0.7)" : "rgba(255,255,255,0.85)",
          }}
        >
          <p
            className={styles.emptyTitle}
            style={{ color: variant === "light" ? "rgba(0,0,0,0.7)" : "rgba(255,255,255,0.85)" }}
          >
            No marks yet
          </p>
          <p
            className={styles.emptyHint}
            style={{ color: variant === "light" ? "rgba(0,0,0,0.5)" : "rgba(255,255,255,0.6)" }}
          >
            Drop hand-drawn SVGs here, or click <em>Add SVG</em>.
          </p>
        </div>
      ) : (
        <div className={styles.grid} style={{ background: bg }}>
          {marks.map((m) => (
            <figure key={m.file} className={styles.cell}>
              <button
                type="button"
                className={styles.cellBtn}
                onClick={() => setEditing(m.file)}
                title="Click to recolor this mark"
              >
                <div className={styles.markBox}>
                  <InlineMark
                    src={m.url}
                    width="100%"
                    height="100%"
                    palette={palette}
                    overrides={markOverrides[m.file]}
                  />
                </div>
              </button>
              <button
                type="button"
                className={styles.deleteBtn}
                onClick={(e) => { e.stopPropagation(); handleDelete(m.file); }}
                disabled={busy}
                aria-label={`Delete ${m.name}`}
                title="Delete this mark"
              >
                ×
              </button>
              <figcaption
                className={styles.caption}
                style={{ color: variant === "light" ? "#1a1a1a" : "rgba(255,255,255,0.7)" }}
              >
                {m.name}
                {markOverrides[m.file] && Object.keys(markOverrides[m.file]).length > 0 && (
                  <span className={styles.captionDot} title="Has custom colors" />
                )}
              </figcaption>
            </figure>
          ))}
        </div>
      )}

      {editing && rawCache[editing] && (
        <MarkEditor
          file={editing}
          name={(marks.find((m) => m.file === editing) || {}).name || editing}
          rawSvg={rawCache[editing]}
          src={(marks.find((m) => m.file === editing) || {}).url}
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

function MarkEditor({ file, name, rawSvg, src, palette, overrides, onSet, onReset, onClose, backgroundVariant }) {
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
            <InlineMark src={src} width="100%" height="100%" palette={palette} overrides={overrides} />
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
