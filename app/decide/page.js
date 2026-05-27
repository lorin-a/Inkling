"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useProject } from "../../lib/useProject";
import { apiFetch } from "../../lib/api/client";
import { derivePreviewRoles } from "../../lib/derivePreviewRoles";
import { colorName } from "../../lib/nameThatColor";
import BrandPreview from "../../components/BrandPreview";
import FontLoader from "../../components/FontLoader";
import ProjectSwitcher from "../../components/ProjectSwitcher";
import PathFooter from "../../components/PathFooter";
import styles from "./page.module.css";

const MAX_COMPARE = 5;

/**
 * The finishing room: saved brand presets side by side at full Brand-page
 * fidelity, so the choice between candidates happens in one view. Same
 * wordmark across all; each preset brings its own palette + type + role
 * overrides. Read-only — composing happens on /brand.
 */
export default function DecidePage() {
  const { project } = useProject();
  const [presets, setPresets] = useState(null); // null = loading
  const [selected, setSelected] = useState(() => new Set());
  const [variant, setVariant] = useState("dark");

  useEffect(() => {
    apiFetch("/api/presets", { cache: "no-store" })
      .then((r) => (r.ok ? r.json() : { presets: [] }))
      .then((data) => {
        const list = data.presets || [];
        setPresets(list);
        // Pre-select up to the first few so the page is useful on arrival.
        setSelected(new Set(list.slice(0, Math.min(3, list.length)).map((p) => p.id)));
      })
      .catch(() => setPresets([]));
  }, []);

  function toggle(id) {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else if (next.size < MAX_COMPARE) next.add(id);
      return next;
    });
  }

  const chosen = useMemo(
    () => (presets || []).filter((p) => selected.has(p.id)),
    [presets, selected],
  );

  // Load every font used across the chosen presets (union), so each preview
  // renders in its own faces. Fall back to the project’s fonts.
  const unionFonts = useMemo(() => {
    const out = {};
    for (const p of chosen) {
      for (const slot of ["title", "subhead", "body"]) {
        const f = p.fonts?.[slot];
        if (f?.family) out[`${slot}-${f.family}`] = f;
      }
    }
    // FontLoader keys on title/subhead/body; flatten the union into pseudo-slots.
    const flat = {};
    let i = 0;
    for (const f of Object.values(out)) flat[`s${i++}`] = f;
    return flat;
  }, [chosen]);

  return (
    <div className={styles.page}>
      <FontLoader fonts={unionFonts} />

      <header className={styles.bar}>
        <Link href="/" className={styles.back}>← Moodbuilder</Link>
        <ProjectSwitcher />
        <div className={styles.barTitle}>Decide</div>
        <div className={styles.variantToggle} role="tablist" aria-label="Variant">
          {["dark", "light"].map((v) => (
            <button
              key={v}
              type="button"
              role="tab"
              aria-selected={variant === v}
              className={`${styles.variantBtn} ${variant === v ? styles.variantBtnOn : ""}`}
              onClick={() => setVariant(v)}
            >
              {v === "dark" ? "Dark" : "Light"}
            </button>
          ))}
        </div>
      </header>

      {presets === null ? (
        <p className={styles.status}>Loading your presets…</p>
      ) : presets.length === 0 ? (
        <div className={styles.empty}>
          <h2 className={styles.emptyTitle}>Nothing to compare yet</h2>
          <p className={styles.emptyText}>
            Save a few brand presets on <Link href="/brand" className={styles.inlineLink}>Brand</Link> —
            each one captures a whole identity (palette, type, role overrides). Come
            back here to see them side by side and choose.
          </p>
        </div>
      ) : (
        <>
          <div className={styles.controls}>
            <span className={styles.controlsLabel}>Compare ({chosen.length}/{MAX_COMPARE})</span>
            <div className={styles.chips}>
              {presets.map((p) => {
                const on = selected.has(p.id);
                const atCap = !on && selected.size >= MAX_COMPARE;
                return (
                  <button
                    key={p.id}
                    type="button"
                    className={`${styles.chip} ${on ? styles.chipOn : ""}`}
                    aria-pressed={on}
                    disabled={atCap}
                    onClick={() => toggle(p.id)}
                    title={atCap ? `Up to ${MAX_COMPARE} at once` : undefined}
                  >
                    {p.name || "Untitled"}
                  </button>
                );
              })}
            </div>
          </div>

          {chosen.length === 0 ? (
            <p className={styles.status}>Pick a preset or two above to compare.</p>
          ) : (
            <div className={styles.grid} data-count={chosen.length}>
              {chosen.map((p) => (
                <PresetColumn key={p.id} preset={p} project={project} variant={variant} />
              ))}
            </div>
          )}
        </>
      )}

      <PathFooter />
    </div>
  );
}

function PresetColumn({ preset, project, variant }) {
  const palette = preset.palette || [];
  const roles = useMemo(() => {
    const auto = derivePreviewRoles(palette, variant);
    return { ...auto, ...(preset.roleOverrides?.[variant] || {}) };
  }, [palette, variant, preset.roleOverrides]);

  // Same wordmark/text as the project; the preset supplies type + textures.
  const mergedProject = { ...project, fonts: preset.fonts || project?.fonts, textures: preset.textures };

  const pair = [preset.fonts?.title?.family, preset.fonts?.body?.family].filter(Boolean);
  const pairLabel = pair.length ? [...new Set(pair)].join(" + ") : "Project fonts";

  return (
    <section className={styles.column}>
      <header className={styles.columnHead}>
        <h3 className={styles.columnName}>{preset.name || "Untitled"}</h3>
        <span className={styles.columnPair}>{pairLabel}</span>
      </header>
      <div className={styles.previewWrap}>
        <BrandPreview palette={palette} variant={variant} project={mergedProject} roles={roles} />
      </div>
      <ul className={styles.swatches}>
        {palette.map((hex, i) => (
          <li key={`${hex}-${i}`} className={styles.swatchItem} title={`${colorName(hex).name} · ${hex.toUpperCase()}`}>
            <span className={styles.swatchChip} style={{ backgroundColor: hex }} />
            <span className={styles.swatchName}>{colorName(hex).name}</span>
          </li>
        ))}
      </ul>
    </section>
  );
}
