"use client";

import { useCallback, useEffect, useState } from "react";
import styles from "./PresetsPanel.module.css";

/**
 * Brand Presets — frozen identity snapshots per project.
 *
 * A preset captures the whole brand decision: palette, size, pool key,
 * per-variant role overrides, fonts, and textures. Clicking a preset
 * overwrites the current state with that snapshot. Save creates a new
 * preset from whatever's on screen.
 *
 * Marks themselves are project-owned files and not snapshotted; per-mark
 * color overrides are skipped this pass (they live inside MarksFrame and
 * need lifting up first).
 *
 * Props:
 *   snapshot()      → returns the current state object to save
 *   applyPreset(p)  → overwrites the current state with preset fields
 */
export default function PresetsPanel({ snapshot, applyPreset }) {
  const [presets, setPresets] = useState([]);
  const [loaded, setLoaded] = useState(false);
  const [busy, setBusy] = useState(false);
  const [naming, setNaming] = useState(false);
  const [name, setName] = useState("");
  const [error, setError] = useState(null);

  const refresh = useCallback(async () => {
    try {
      const res = await fetch("/api/presets", { cache: "no-store" });
      const data = await res.json();
      setPresets(data.presets || []);
    } catch {
      setPresets([]);
    } finally {
      setLoaded(true);
    }
  }, []);

  useEffect(() => { refresh(); }, [refresh]);

  async function savePreset() {
    setError(null);
    const trimmed = name.trim();
    if (!trimmed) { setError("Give it a name."); return; }
    setBusy(true);
    try {
      const body = { ...snapshot(), name: trimmed };
      const res = await fetch("/api/presets", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || `HTTP ${res.status}`);
      setName("");
      setNaming(false);
      await refresh();
    } catch (e) {
      setError(e.message);
    } finally {
      setBusy(false);
    }
  }

  async function deletePreset(id) {
    if (!confirm("Delete this preset?")) return;
    setBusy(true);
    try {
      await fetch(`/api/presets?id=${encodeURIComponent(id)}`, { method: "DELETE" });
      await refresh();
    } finally {
      setBusy(false);
    }
  }

  return (
    <section className={styles.panel}>
      <header className={styles.header}>
        <h3 className={styles.heading}>
          Brand presets
          <span className={styles.count}>{presets.length}</span>
        </h3>
        {!naming && (
          <button
            type="button"
            className={styles.saveBtn}
            onClick={() => setNaming(true)}
            disabled={busy}
            title="Save palette + type + texture + roles as one identity snapshot"
          >
            Save as preset
          </button>
        )}
      </header>

      {naming && (
        <div className={styles.namer}>
          <input
            autoFocus
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") savePreset();
              if (e.key === "Escape") { setNaming(false); setName(""); setError(null); }
            }}
            placeholder="Preset name…"
            className={styles.namerInput}
            maxLength={80}
          />
          <button
            type="button"
            className={styles.namerSave}
            onClick={savePreset}
            disabled={busy}
          >
            Save
          </button>
          <button
            type="button"
            className={styles.namerCancel}
            onClick={() => { setNaming(false); setName(""); setError(null); }}
          >
            Cancel
          </button>
        </div>
      )}

      {error && <p className={styles.error}>{error}</p>}

      {loaded && presets.length === 0 && !naming && (
        <p className={styles.empty}>
          No presets yet. Save the current palette, type, texture, and role overrides as one identity snapshot.
        </p>
      )}

      <div className={styles.list}>
        {presets.map((p) => (
          <div key={p.id} className={styles.card}>
            <button
              type="button"
              className={styles.cardBtn}
              onClick={() => applyPreset(p)}
              title="Apply this preset"
            >
              <div className={styles.swatches}>
                {(p.palette || []).slice(0, 8).map((hex, i) => (
                  <span
                    key={i}
                    className={styles.swatch}
                    style={{ backgroundColor: hex }}
                  />
                ))}
              </div>
              <div className={styles.cardMeta}>
                <span className={styles.cardName}>{p.name}</span>
                <span className={styles.cardChips}>
                  {hasFonts(p.fonts) && <span className={styles.chip}>Type</span>}
                  {hasTextures(p.textures) && <span className={styles.chip}>Texture</span>}
                  {hasOverrides(p.roleOverrides) && <span className={styles.chip}>Roles</span>}
                </span>
              </div>
            </button>
            <button
              type="button"
              className={styles.deleteBtn}
              onClick={() => deletePreset(p.id)}
              disabled={busy}
              aria-label="Delete preset"
              title="Delete preset"
            >
              ×
            </button>
          </div>
        ))}
      </div>
    </section>
  );
}

function hasFonts(f) {
  return !!(f && (f.title?.family || f.subhead?.family || f.body?.family));
}
function hasTextures(t) {
  return !!(t && (t.dark?.url || t.light?.url));
}
function hasOverrides(o) {
  return !!(o && (Object.keys(o.dark || {}).length || Object.keys(o.light || {}).length));
}
