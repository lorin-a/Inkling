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
import styles from "./page.module.css";

const MAX_COMPARE = 5;

/**
 * The finishing room: anything you've saved — full Brand Presets and plain
 * saved palettes — side by side at full Brand-page fidelity, so the choice
 * happens in one view. Presets bring their own type + role colors; palettes
 * render with your current fonts/text so you compare them as a brand, not as
 * abstract swatches. Read-only — composing happens on /brand.
 */
export default function DecidePage() {
  const { project } = useProject();
  const [candidates, setCandidates] = useState(null); // null = loading
  const [selected, setSelected] = useState(() => new Set());
  const [variant, setVariant] = useState("dark");

  useEffect(() => {
    let cancelled = false;
    async function load() {
      const out = [];
      // Brand presets — whole identities.
      try {
        const d = await (await apiFetch("/api/presets", { cache: "no-store" })).json();
        for (const p of d.presets || []) {
          out.push({ kind: "preset", id: p.id, name: p.name || "Untitled", palette: p.palette || [], fonts: p.fonts, roleOverrides: p.roleOverrides, textures: p.textures });
        }
      } catch { /* none */ }
      // Top picks — rated pin palettes (colors only).
      try {
        const d = await (await apiFetch("/api/library/palette", { cache: "no-store" })).json();
        const starred = new Set(d.starredPalettes || []);
        for (const pp of d.pinPalettes || []) {
          if (starred.has(pp.pinId) && Array.isArray(pp.palette) && pp.palette.length) {
            // Name by the palette's lead colour (a real identity) rather than the
            // source domain — otherwise every pinned palette reads "pinterest.com".
            out.push({ kind: "palette", id: `pin_${pp.pinId}`, name: colorName(pp.palette[0]).name || "Top pick", palette: pp.palette });
          }
        }
      } catch { /* none */ }
      // Saved palettes — the ★ favorites (localStorage, per active slug).
      try {
        const { slug } = await (await apiFetch("/api/projects/active", { cache: "no-store" })).json();
        const raw = localStorage.getItem(`moodbuilder.favorites.v1.${slug}`) || localStorage.getItem("moodbuilder.favorites.v1");
        for (const f of raw ? JSON.parse(raw) : []) {
          if (Array.isArray(f.palette) && f.palette.length) {
            out.push({ kind: "palette", id: `fav_${f.id}`, name: f.name || "Saved palette", palette: f.palette });
          }
        }
      } catch { /* none */ }

      if (cancelled) return;
      setCandidates(out);
      setSelected(new Set(out.slice(0, Math.min(3, out.length)).map((c) => c.id)));
    }
    load();
    return () => { cancelled = true; };
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
    () => (candidates || []).filter((c) => selected.has(c.id)),
    [candidates, selected],
  );

  // Load every font used across chosen presets (palettes use the project's
  // fonts, already loaded elsewhere). FontLoader keys on title/subhead/body,
  // so flatten the union into pseudo-slots.
  const unionFonts = useMemo(() => {
    const seen = {};
    for (const c of chosen) {
      if (c.kind !== "preset") continue;
      for (const slot of ["title", "subhead", "body"]) {
        const f = c.fonts?.[slot];
        if (f?.family) seen[`${slot}-${f.family}`] = f;
      }
    }
    const flat = {};
    let i = 0;
    for (const f of Object.values(seen)) flat[`s${i++}`] = f;
    return flat;
  }, [chosen]);

  return (
    <div className={styles.page}>
      <FontLoader fonts={unionFonts} />

      <header className={styles.bar}>
        <Link href="/" className={styles.back}>← inkling.</Link>
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

      {candidates === null ? (
        <p className={styles.status}>Loading what you've saved…</p>
      ) : candidates.length === 0 ? (
        <div className={styles.empty}>
          <h2 className={styles.emptyTitle}>Nothing to compare yet</h2>
          <p className={styles.emptyText}>
            Save a few things first, then come back to see them side by side: a{" "}
            <strong>Brand preset</strong> on <Link href="/brand" className={styles.inlineLink}>Brand</Link>{" "}
            (a whole identity), or any <strong>palette</strong> (★ Save palette on Brand, or rate
            palettes as Top picks on <Link href="/colors" className={styles.inlineLink}>Colors</Link>).
          </p>
        </div>
      ) : (
        <>
          <div className={styles.controls}>
            <span className={styles.controlsLabel}>Compare ({chosen.length}/{MAX_COMPARE})</span>
            <div className={styles.chips}>
              {candidates.map((c) => {
                const on = selected.has(c.id);
                const atCap = !on && selected.size >= MAX_COMPARE;
                return (
                  <button
                    key={c.id}
                    type="button"
                    className={`${styles.chip} ${on ? styles.chipOn : ""}`}
                    aria-pressed={on}
                    disabled={atCap}
                    onClick={() => toggle(c.id)}
                    title={atCap ? `Up to ${MAX_COMPARE} at once` : c.kind === "preset" ? "Brand preset — full identity" : "Palette — colors only"}
                  >
                    <span className={`${styles.chipKind} ${c.kind === "preset" ? styles.chipKindPreset : ""}`} aria-hidden="true" />
                    {c.name}
                  </button>
                );
              })}
            </div>
          </div>

          {chosen.length === 0 ? (
            <p className={styles.status}>Pick one or two above to compare.</p>
          ) : (
            <div className={styles.grid} data-count={chosen.length}>
              {chosen.map((c) => (
                <CandidateColumn key={c.id} cand={c} project={project} variant={variant} />
              ))}
            </div>
          )}
        </>
      )}

    </div>
  );
}

function CandidateColumn({ cand, project, variant }) {
  const palette = cand.palette || [];
  const isPreset = cand.kind === "preset";

  const roles = useMemo(() => {
    const auto = derivePreviewRoles(palette, variant);
    return isPreset ? { ...auto, ...(cand.roleOverrides?.[variant] || {}) } : auto;
  }, [palette, variant, isPreset, cand.roleOverrides]);

  // Presets carry their own type + textures; palettes borrow the project's.
  const fonts = isPreset ? (cand.fonts || project?.fonts) : project?.fonts;
  const textures = isPreset ? cand.textures : project?.textures;
  const mergedProject = { ...project, fonts, textures };

  const pair = [fonts?.title?.family, fonts?.body?.family].filter(Boolean);
  const pairLabel = pair.length ? [...new Set(pair)].join(" + ") : "Project fonts";

  return (
    <section className={styles.column}>
      <header className={styles.columnHead}>
        <h3 className={styles.columnName}>
          <span className={`${styles.kindBadge} ${isPreset ? styles.kindBadgePreset : ""}`}>{isPreset ? "Preset" : "Palette"}</span>
          {cand.name}
        </h3>
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
