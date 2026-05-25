"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { apiFetch } from "../lib/api/client";
import { useAuthed } from "../lib/api/useAuthed";
import styles from "./TexturePanel.module.css";

const BLEND_MODES = [
  { value: "normal", label: "Normal" },
  { value: "multiply", label: "Multiply" },
  { value: "overlay", label: "Overlay" },
  { value: "soft-light", label: "Soft light" },
  { value: "screen", label: "Screen" },
];

/**
 * Per-project texture library + per-variant active-texture controls.
 * Layout: variant tabs (Dark / Light) → active preview swatch + opacity
 * + blend → grid of uploaded textures (click to select for the active
 * variant, hover to delete) → drag-drop zone for new uploads.
 *
 * Data shape persisted in project.textures:
 *   { dark: { url, opacity, blend } | null, light: { ... } | null }
 */
export default function TexturePanel({ textures: tx, onChange }) {
  const authed = useAuthed();
  const [variant, setVariant] = useState("dark");
  const [items, setItems] = useState([]);
  const [busy, setBusy] = useState(false);
  const [dragOver, setDragOver] = useState(false);
  const [error, setError] = useState(null);
  const fileInputRef = useRef(null);

  const refresh = useCallback(async () => {
    try {
      const res = await apiFetch("/api/textures", { cache: "no-store" });
      const data = await res.json();
      setItems(data.textures || []);
    } catch {
      setItems([]);
    }
  }, []);

  useEffect(() => { refresh(); }, [refresh]);

  const active = tx?.[variant] || null;

  function setVariantTexture(url) {
    const current = tx?.[variant];
    const next = url
      ? { url, opacity: current?.opacity ?? 0.6, blend: current?.blend ?? "multiply" }
      : null;
    onChange({ ...(tx || {}), [variant]: next });
  }

  function setOpacity(value) {
    if (!active) return;
    onChange({ ...(tx || {}), [variant]: { ...active, opacity: value } });
  }

  function setBlend(value) {
    if (!active) return;
    onChange({ ...(tx || {}), [variant]: { ...active, blend: value } });
  }

  async function handleFiles(fileList) {
    if (authed === false) {
      setError("Sign in to upload textures. They’re saved to your account, not this browser.");
      return;
    }
    const list = Array.from(fileList);
    if (list.length === 0) return;
    setError(null);
    setBusy(true);
    try {
      const fd = new FormData();
      for (const f of list) fd.append("files", f);
      const res = await fetch("/api/textures", { method: "POST", body: fd });
      const data = await res.json();
      const failures = (data.results || []).filter((r) => !r.ok);
      if (failures.length > 0) {
        setError(failures.map((f) => `${f.name}: ${f.error}`).join(", "));
      }
      const firstOk = (data.results || []).find((r) => r.ok);
      await refresh();
      if (firstOk?.url && !active) setVariantTexture(firstOk.url);
    } catch (e) {
      setError(e.message);
    } finally {
      setBusy(false);
    }
  }

  async function handleDelete(file, url) {
    if (!confirm(`Delete this texture?`)) return;
    setBusy(true);
    try {
      await fetch(`/api/textures?file=${encodeURIComponent(file)}`, { method: "DELETE" });
      // Drop from any variant that was using it
      const cleaned = { ...(tx || {}) };
      for (const k of ["dark", "light"]) {
        if (cleaned[k]?.url === url) cleaned[k] = null;
      }
      if (JSON.stringify(cleaned) !== JSON.stringify(tx)) onChange(cleaned);
      await refresh();
    } finally {
      setBusy(false);
    }
  }

  function onDragOver(e) { e.preventDefault(); setDragOver(true); }
  function onDragLeave() { setDragOver(false); }
  function onDrop(e) {
    e.preventDefault();
    setDragOver(false);
    if (e.dataTransfer?.files?.length) handleFiles(e.dataTransfer.files);
  }

  return (
    <section
      className={`${styles.panel} ${dragOver ? styles.panelDragOver : ""}`}
      onDragOver={onDragOver}
      onDragLeave={onDragLeave}
      onDrop={onDrop}
    >
      <header className={styles.header}>
        <h3 className={styles.heading}>Texture</h3>
        <div className={styles.tabs} role="tablist" aria-label="Surface variant">
          {["dark", "light"].map((v) => (
            <button
              key={v}
              type="button"
              role="tab"
              aria-selected={variant === v}
              className={`${styles.tab} ${variant === v ? styles.tabActive : ""}`}
              onClick={() => setVariant(v)}
            >
              {v[0].toUpperCase() + v.slice(1)}
            </button>
          ))}
        </div>
      </header>

      {active ? (
        <div className={styles.activeBlock}>
          <div
            className={styles.activeSwatch}
            style={{ backgroundImage: `url(${active.url})` }}
            title={active.url}
          />
          <div className={styles.activeControls}>
            <label className={styles.field}>
              <span className={styles.fieldLabel}>Opacity {Math.round(active.opacity * 100)}%</span>
              <input
                type="range"
                min="0"
                max="1"
                step="0.05"
                value={active.opacity}
                onChange={(e) => setOpacity(parseFloat(e.target.value))}
                className={styles.range}
              />
            </label>
            <label className={styles.field}>
              <span className={styles.fieldLabel}>Blend</span>
              <select
                value={active.blend}
                onChange={(e) => setBlend(e.target.value)}
                className={styles.select}
              >
                {BLEND_MODES.map((b) => (
                  <option key={b.value} value={b.value}>{b.label}</option>
                ))}
              </select>
            </label>
            <button
              type="button"
              className={styles.clearActive}
              onClick={() => setVariantTexture(null)}
            >
              Clear {variant}
            </button>
          </div>
        </div>
      ) : (
        <p className={styles.muted}>
          No texture on <strong>{variant}</strong>. Pick one below.
        </p>
      )}

      {items.length === 0 ? (
        <p className={styles.empty}>
          Drop image files here, or <button type="button" className={styles.linkBtn} onClick={() => fileInputRef.current?.click()}>browse</button>.
        </p>
      ) : (
        <div className={styles.grid}>
          {items.map((t) => {
            const isActive = active?.url === t.url;
            return (
              <div key={t.file} className={styles.cell}>
                <button
                  type="button"
                  className={`${styles.tile} ${isActive ? styles.tileActive : ""}`}
                  style={{ backgroundImage: `url(${t.url})` }}
                  onClick={() => setVariantTexture(isActive ? null : t.url)}
                  title={isActive ? `Active on ${variant} — click to clear` : `Apply to ${variant}`}
                  aria-pressed={isActive}
                />
                <button
                  type="button"
                  className={styles.tileDelete}
                  onClick={(e) => { e.stopPropagation(); handleDelete(t.file, t.url); }}
                  disabled={busy}
                  aria-label="Delete texture"
                >
                  ×
                </button>
              </div>
            );
          })}
        </div>
      )}

      <button
        type="button"
        className={styles.uploadBtn}
        onClick={() => fileInputRef.current?.click()}
        disabled={busy}
      >
        {busy ? "Uploading…" : "Add texture"}
      </button>
      <input
        ref={fileInputRef}
        type="file"
        accept=".png,.jpg,.jpeg,.webp,.svg,image/*"
        multiple
        style={{ position: "absolute", left: "-9999px", width: 1, height: 1, opacity: 0 }}
        onChange={(e) => { if (e.target.files) handleFiles(e.target.files); e.target.value = ""; }}
      />

      {error && <p className={styles.error}>{error}</p>}
    </section>
  );
}
