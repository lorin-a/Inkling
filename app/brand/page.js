"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { usePalette } from "../../lib/usePalette";
import { useProject } from "../../lib/useProject";
import { POOLS, POOL_LABELS } from "../../lib/palettePool";
import { FORMATS, formatExport } from "../../lib/exportFormats";
import BrandPreview from "../../components/BrandPreview";
import MarksFrame from "../../components/MarksFrame";
import ProjectSwitcher from "../../components/ProjectSwitcher";
import styles from "./page.module.css";

export default function BrandPage() {
  const {
    palette,
    setSlot,
    size,
    setSize,
    locks,
    toggleLock,
    poolKey,
    setPoolKey,
    shuffle,
    stepHistory,
    canUndo,
    canRedo,
    favorites,
    favorite,
    removeFavorite,
    loadFavorite,
    moodboardPool,
    starredPool,
  } = usePalette({ initialSize: 5, initialPoolKey: "starred" });

  const { project, save: saveProject } = useProject();
  const [picker, setPicker] = useState(null);
  const [editingProject, setEditingProject] = useState(false);
  const [exportOpen, setExportOpen] = useState(false);
  // Per-variant role overrides — dark and light are independent. Cleared
  // on shuffle so each new palette starts from the algorithm's best guess.
  const [roleOverrides, setRoleOverrides] = useState({ dark: {}, light: {} });
  // Which variant the Roles panel is editing right now.
  const [activeVariant, setActiveVariant] = useState("dark");
  const moodboardEmpty = poolKey === "moodboard" && moodboardPool.length === 0;
  const starredEmpty = poolKey === "starred" && starredPool.length === 0;
  const poolEmpty = moodboardEmpty || starredEmpty;

  const gradientStrings = useMemo(() => {
    if (palette.length === 0) return [];
    const sorted = palette.slice().sort((a, b) => luminance(a) - luminance(b));
    return [
      `linear-gradient(135deg, ${sorted.join(", ")})`,
      `linear-gradient(90deg, ${sorted.slice().reverse().join(", ")})`,
    ];
  }, [palette]);

  // Per-variant roles: auto-derived for each + per-variant overrides.
  const rolesDark = useMemo(() => {
    const auto = derivePreviewRoles(palette, "dark");
    if (!auto) return null;
    return {
      ...auto,
      ...roleOverrides.dark,
      gradient1: gradientStrings[0] || "none",
      gradient2: gradientStrings[1] || "none",
    };
  }, [palette, roleOverrides.dark, gradientStrings]);

  const rolesLight = useMemo(() => {
    const auto = derivePreviewRoles(palette, "light");
    if (!auto) return null;
    return {
      ...auto,
      ...roleOverrides.light,
      gradient1: gradientStrings[0] || "none",
      gradient2: gradientStrings[1] || "none",
    };
  }, [palette, roleOverrides.light, gradientStrings]);

  // For Export / print, we use the dark variant's roles as the "primary"
  // role set since dark is the brand's default frame.
  const roles = rolesDark;

  const handleShuffle = useCallback(() => {
    setRoleOverrides({ dark: {}, light: {} });
    shuffle();
  }, [shuffle]);

  const setRole = useCallback((variant, role, hex) => {
    setRoleOverrides((prev) => ({
      ...prev,
      [variant]: { ...prev[variant], [role]: hex },
    }));
  }, []);

  const clearRole = useCallback((variant, role) => {
    setRoleOverrides((prev) => {
      const { [role]: _, ...rest } = prev[variant] || {};
      return { ...prev, [variant]: rest };
    });
  }, []);

  // Floating role picker — opened by clicking an element in BrandPreview.
  // { variant, role, x, y } or null.
  const [pickerPos, setPickerPos] = useState(null);

  const openPicker = useCallback((variant, role, event) => {
    setActiveVariant(variant);
    setPickerPos({ variant, role, x: event.clientX, y: event.clientY });
  }, []);

  const closePicker = useCallback(() => setPickerPos(null), []);

  // Dismiss picker on Escape or outside click.
  useEffect(() => {
    if (!pickerPos) return;
    const onKey = (e) => { if (e.key === "Escape") closePicker(); };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [pickerPos, closePicker]);

  // Keyboard
  useEffect(() => {
    const onKey = (e) => {
      const target = e.target;
      if (target instanceof HTMLInputElement || target instanceof HTMLTextAreaElement) return;
      if (e.code === "Space") {
        e.preventDefault();
        handleShuffle();
      } else if (e.key === "ArrowLeft" && canUndo) {
        e.preventDefault();
        stepHistory(-1);
      } else if (e.key === "ArrowRight" && canRedo) {
        e.preventDefault();
        stepHistory(1);
      } else if (e.key === "f" || e.key === "F") {
        e.preventDefault();
        favorite();
      } else if ((e.metaKey || e.ctrlKey) && e.key === "z") {
        e.preventDefault();
        if (e.shiftKey && canRedo) stepHistory(1);
        else if (canUndo) stepHistory(-1);
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [handleShuffle, stepHistory, canUndo, canRedo, favorite]);

  return (
    <div className={styles.page}>
      <header className={styles.bar}>
        <Link href="/" className={styles.back}>← Moodbuilder</Link>
        <ProjectSwitcher />
        <button
          type="button"
          className={styles.barTitleBtn}
          onClick={() => setEditingProject(true)}
          title="Edit project copy"
        >
          Edit copy
        </button>

        <div className={styles.controls}>
          <label className={styles.control}>
            <span className={styles.controlLabel}>Pool</span>
            <select
              value={poolKey}
              onChange={(e) => setPoolKey(e.target.value)}
              className={styles.select}
            >
              {Object.entries(POOL_LABELS).map(([k, label]) => (
                <option key={k} value={k}>{label}</option>
              ))}
            </select>
          </label>

          <label className={styles.control}>
            <span className={styles.controlLabel}>
              Colors <span className={styles.value}>{size}</span>
            </span>
            <input
              type="range"
              min="2"
              max="10"
              value={size}
              onChange={(e) => setSize(Number(e.target.value))}
              className={styles.range}
            />
          </label>

          <button
            type="button"
            className={`${styles.btn} ${styles.btnGhost}`}
            onClick={() => stepHistory(-1)}
            disabled={!canUndo}
            title="Step back (←)"
          >
            ←
          </button>
          <button
            type="button"
            className={`${styles.btn} ${styles.btnGhost}`}
            onClick={() => stepHistory(1)}
            disabled={!canRedo}
            title="Step forward (→)"
          >
            →
          </button>
          <button
            type="button"
            className={`${styles.btn} ${styles.btnPrimary}`}
            onClick={handleShuffle}
            disabled={poolEmpty}
            title={poolEmpty ? "This pool is empty" : "Shuffle (Space)"}
          >
            Shuffle
            <kbd className={styles.kbd}>Space</kbd>
          </button>
          <button
            type="button"
            className={`${styles.btn} ${styles.btnFav}`}
            onClick={() => favorite()}
            title="Save palette (F)"
          >
            ★ Save
          </button>
          <button
            type="button"
            className={`${styles.btn}`}
            onClick={() => setExportOpen(true)}
            disabled={palette.length === 0}
            title="Export this palette"
          >
            ↓ Export
          </button>
        </div>
      </header>

      <main className={styles.main}>
        <aside className={styles.rail}>
          <div className={styles.railHeader}>
            <h2 className={styles.railTitle}>Palette</h2>
            <p className={styles.railHint}>Click any slot to lock or replace. Tap a swatch from the pool to apply.</p>
          </div>

          {palette.length > 0 && roles && (
            <RolesPanel
              palette={palette}
              activeVariant={activeVariant}
              setActiveVariant={setActiveVariant}
              rolesDark={rolesDark}
              rolesLight={rolesLight}
              overrides={roleOverrides}
              setRole={setRole}
              clearRole={clearRole}
            />
          )}

          {moodboardEmpty && (
            <div className={styles.emptyHint}>
              The moodboard pool is empty.{" "}
              <Link href="/library" className={styles.emptyHintLink}>
                Open the library
              </Link>{" "}
              and click the ✦ button on a few pins to extract colors — then come back and shuffle.
            </div>
          )}

          {starredEmpty && (
            <div className={styles.emptyHint}>
              Nothing starred yet.{" "}
              <Link href="/colors" className={styles.emptyHintLink}>
                Open the Colors page
              </Link>{" "}
              and click the ☆ icon on any swatch to add it to your starred set — your highest-signal shuffle pool.
            </div>
          )}

          <div className={styles.slots}>
            {palette.map((hex, i) => (
              <div key={i} className={styles.slot}>
                <button
                  type="button"
                  className={`${styles.slotChip} ${locks.has(i) ? styles.slotLocked : ""}`}
                  style={{ backgroundColor: hex }}
                  onClick={() => setPicker(picker === i ? null : i)}
                  title={`${hex.toUpperCase()} — click to pick`}
                  aria-label={`Slot ${i + 1}: ${hex}`}
                />
                <span className={styles.slotHex}>{hex.toUpperCase()}</span>
                <button
                  type="button"
                  className={`${styles.lockBtn} ${locks.has(i) ? styles.lockBtnOn : ""}`}
                  onClick={() => toggleLock(i)}
                  title={locks.has(i) ? "Unlock slot" : "Lock slot"}
                  aria-label={locks.has(i) ? "Unlock" : "Lock"}
                >
                  {locks.has(i) ? "●" : "○"}
                </button>
              </div>
            ))}
          </div>

          {picker !== null && (
            <div className={styles.picker}>
              <div className={styles.pickerHeader}>
                <span>Replace slot {picker + 1}</span>
                <button type="button" onClick={() => setPicker(null)} className={styles.pickerClose}>×</button>
              </div>
              <div className={styles.pickerGrid}>
                {POOLS[poolKey].map((hex, i) => (
                  <button
                    key={`${hex}-${i}`}
                    type="button"
                    className={styles.pickerSwatch}
                    style={{ backgroundColor: hex }}
                    onClick={() => { setSlot(picker, hex); setPicker(null); }}
                    title={hex}
                    aria-label={hex}
                  />
                ))}
              </div>
            </div>
          )}

          <div className={styles.favorites}>
            <h2 className={styles.railTitle}>
              Saved
              <span className={styles.railCount}>{favorites.length}</span>
            </h2>
            {favorites.length === 0 && (
              <p className={styles.railEmpty}>None yet. Press F or ★ Save to keep one.</p>
            )}
            <div className={styles.favList}>
              {favorites.map((f) => (
                <div key={f.id} className={styles.favItem}>
                  <button
                    type="button"
                    className={styles.favPalette}
                    onClick={() => loadFavorite(f.id)}
                    aria-label={`Load ${f.name}`}
                  >
                    {f.palette.map((h, i) => (
                      <span key={i} className={styles.favSwatch} style={{ backgroundColor: h }} />
                    ))}
                  </button>
                  <button
                    type="button"
                    className={styles.favRemove}
                    onClick={() => removeFavorite(f.id)}
                    aria-label="Remove"
                  >
                    ×
                  </button>
                </div>
              ))}
            </div>
          </div>
        </aside>

        <section className={styles.canvas}>
          <div className={styles.variant}>
            <span className={styles.variantLabel}>Dark</span>
            <BrandPreview palette={palette} variant="dark" project={project} roles={rolesDark} onPickRole={openPicker} />
          </div>
          <div className={styles.variant}>
            <span className={styles.variantLabel}>Light</span>
            <BrandPreview palette={palette} variant="light" project={project} roles={rolesLight} onPickRole={openPicker} />
          </div>
          <MarksFrame palette={palette} />
        </section>
      </main>

      {pickerPos && (
        <FloatingRolePicker
          variant={pickerPos.variant}
          role={pickerPos.role}
          x={pickerPos.x}
          y={pickerPos.y}
          palette={palette}
          currentHex={(pickerPos.variant === "dark" ? rolesDark : rolesLight)?.[pickerPos.role]}
          onPick={(hex) => { setRole(pickerPos.variant, pickerPos.role, hex); closePicker(); }}
          onReset={() => { clearRole(pickerPos.variant, pickerPos.role); closePicker(); }}
          onClose={closePicker}
          isOverride={pickerPos.role in (roleOverrides[pickerPos.variant] || {})}
        />
      )}

      {editingProject && (
        <EditProjectModal
          project={project}
          onClose={() => setEditingProject(false)}
          onSave={async (patch) => {
            await saveProject(patch);
            setEditingProject(false);
          }}
        />
      )}

      {exportOpen && (
        <ExportModal
          palette={palette}
          project={project}
          roles={roles}
          gradients={gradientStrings}
          onClose={() => setExportOpen(false)}
        />
      )}
    </div>
  );
}

function RolesPanel({ palette, activeVariant, setActiveVariant, rolesDark, rolesLight, overrides, setRole, clearRole }) {
  const ROLES = [
    { key: "bg", label: "Background", controls: "the surface behind everything" },
    { key: "ink", label: "Main text", controls: "wordmark + tagline" },
    { key: "accent", label: "Accent", controls: "the period + italic pop" },
    { key: "muted", label: "Subtext", controls: "italic wordmark + body line" },
  ];
  const roles = activeVariant === "dark" ? rolesDark : rolesLight;
  const variantOverrides = overrides[activeVariant] || {};
  return (
    <div className={styles.rolesPanel}>
      <div className={styles.rolesPanelHead}>
        <h2 className={styles.railTitle}>
          Roles
          <span className={styles.railHint} style={{ textTransform: "none", letterSpacing: 0, fontWeight: 400 }}>
            override per variant
          </span>
        </h2>
        <div className={styles.variantTabs} role="tablist">
          {["dark", "light"].map((v) => (
            <button
              key={v}
              type="button"
              role="tab"
              aria-selected={activeVariant === v}
              className={`${styles.variantTab} ${activeVariant === v ? styles.variantTabActive : ""}`}
              onClick={() => setActiveVariant(v)}
            >
              {v === "dark" ? "Dark" : "Light"}
              {Object.keys(overrides[v] || {}).length > 0 && (
                <span className={styles.variantTabDot} aria-hidden="true" />
              )}
            </button>
          ))}
        </div>
      </div>
      {ROLES.map(({ key, label, controls }) => {
        const currentHex = roles[key];
        const isOverride = key in variantOverrides;
        return (
          <div key={key} className={styles.roleRow}>
            <div className={styles.roleRowHeader}>
              <div className={styles.roleRowLabelGroup}>
                <span className={styles.roleRowLabel}>{label}</span>
                <span className={styles.roleRowControls}>{controls}</span>
              </div>
              {isOverride && (
                <button
                  type="button"
                  className={styles.roleResetBtn}
                  onClick={() => clearRole(activeVariant, key)}
                  title="Reset to auto pick"
                >
                  reset
                </button>
              )}
            </div>
            <div className={styles.roleSwatches}>
              {palette.map((hex, i) => (
                <button
                  key={`${key}-${i}`}
                  type="button"
                  className={`${styles.roleSwatchBtn} ${hex.toLowerCase() === (currentHex || "").toLowerCase() ? styles.roleSwatchActive : ""}`}
                  style={{ backgroundColor: hex }}
                  onClick={() => setRole(activeVariant, key, hex)}
                  title={`${hex.toUpperCase()} → ${label}`}
                  aria-label={`Assign ${hex} to ${label}`}
                />
              ))}
            </div>
          </div>
        );
      })}
    </div>
  );
}

const ROLE_LABELS = {
  bg: "Background",
  ink: "Main text",
  accent: "Accent",
  muted: "Subtext",
};

function FloatingRolePicker({ role, x, y, palette, currentHex, onPick, onReset, onClose, isOverride }) {
  // Position the popover near the click but clamped to the viewport.
  const W = 240;
  const H = 110;
  const px = Math.min(window.innerWidth - W - 16, Math.max(16, x + 12));
  const py = Math.min(window.innerHeight - H - 16, Math.max(16, y + 12));
  return (
    <>
      <div className={styles.pickerOverlay} onClick={onClose} />
      <div
        className={styles.floatingPicker}
        style={{ left: px, top: py }}
        onClick={(e) => e.stopPropagation()}
        role="dialog"
        aria-label={`Recolor ${ROLE_LABELS[role]}`}
      >
        <div className={styles.floatingPickerHeader}>
          <span className={styles.floatingPickerLabel}>
            {ROLE_LABELS[role] || role}
          </span>
          {isOverride && (
            <button type="button" className={styles.roleResetBtn} onClick={onReset}>
              reset
            </button>
          )}
        </div>
        <div className={styles.floatingPickerSwatches}>
          {(palette || []).map((hex, i) => (
            <button
              key={`${role}-${i}`}
              type="button"
              className={`${styles.roleSwatchBtn} ${hex.toLowerCase() === (currentHex || "").toLowerCase() ? styles.roleSwatchActive : ""}`}
              style={{ backgroundColor: hex }}
              onClick={() => onPick(hex)}
              title={`${hex.toUpperCase()} → ${ROLE_LABELS[role] || role}`}
            />
          ))}
        </div>
      </div>
    </>
  );
}

function EditProjectModal({ project, onClose, onSave }) {
  const [name, setName] = useState(project.name || "");
  const [wordmark, setWordmark] = useState(project.wordmark || "");
  const [period, setPeriod] = useState(project.period ?? ".");
  const [initial, setInitial] = useState(project.initial || "");
  const [tagline, setTagline] = useState(project.tagline || "");
  const [body, setBody] = useState(project.body || "");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    const onKey = (e) => { if (e.key === "Escape") onClose(); };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  async function submit(e) {
    e.preventDefault();
    setSaving(true);
    try {
      await onSave({ name, wordmark, period, initial, tagline, body });
    } catch (err) {
      alert(`Save failed: ${err.message}`);
      setSaving(false);
    }
  }

  return (
    <div className={styles.modalBackdrop} onClick={onClose}>
      <form className={styles.modal} onClick={(e) => e.stopPropagation()} onSubmit={submit}>
        <button type="button" className={styles.modalClose} onClick={onClose} aria-label="Close">×</button>
        <h2 className={styles.modalTitle}>Edit project copy</h2>
        <p className={styles.modalHint}>These power the wordmark composition and brand mock.</p>

        <label className={styles.field}>
          <span className={styles.fieldLabel}>Project name</span>
          <input className={styles.input} value={name} onChange={(e) => setName(e.target.value)} />
        </label>

        <div className={styles.fieldRow}>
          <label className={styles.field}>
            <span className={styles.fieldLabel}>Wordmark</span>
            <input className={styles.input} value={wordmark} onChange={(e) => setWordmark(e.target.value)} />
          </label>
          <label className={styles.field} style={{ flex: "0 0 80px" }}>
            <span className={styles.fieldLabel}>Period</span>
            <input className={styles.input} value={period} onChange={(e) => setPeriod(e.target.value)} maxLength={3} />
          </label>
          <label className={styles.field} style={{ flex: "0 0 80px" }}>
            <span className={styles.fieldLabel}>Initial</span>
            <input className={styles.input} value={initial} onChange={(e) => setInitial(e.target.value)} maxLength={3} />
          </label>
        </div>

        <label className={styles.field}>
          <span className={styles.fieldLabel}>Tagline</span>
          <input className={styles.input} value={tagline} onChange={(e) => setTagline(e.target.value)} />
        </label>

        <label className={styles.field}>
          <span className={styles.fieldLabel}>Body line</span>
          <textarea className={styles.textarea} rows={3} value={body} onChange={(e) => setBody(e.target.value)} />
        </label>

        <div className={styles.modalActions}>
          <button type="button" className={`${styles.btn}`} onClick={onClose}>Cancel</button>
          <button type="submit" className={`${styles.btn} ${styles.btnPrimary}`} disabled={saving}>
            {saving ? "Saving…" : "Save"}
          </button>
        </div>
      </form>
    </div>
  );
}

function ExportModal({ palette, project, roles, gradients, onClose }) {
  const [activeFormat, setActiveFormat] = useState(FORMATS[0].id);
  const [copied, setCopied] = useState(false);
  const activeFormatDef = FORMATS.find((f) => f.id === activeFormat);
  const isPrintFormat = activeFormatDef?.action === "print";

  const { content, filename, mime } = isPrintFormat
    ? { content: "", filename: "", mime: "" }
    : formatExport(activeFormat, { palette, project, roles, gradients });

  const openPrint = () => {
    const params = new URLSearchParams();
    params.set("palette", palette.map((h) => h.replace(/^#/, "")).join(","));
    window.open(`/print?${params.toString()}`, "_blank", "noopener,noreferrer");
  };

  useEffect(() => {
    const onKey = (e) => { if (e.key === "Escape") onClose(); };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  async function copy() {
    await navigator.clipboard?.writeText(content);
    setCopied(true);
    setTimeout(() => setCopied(false), 1400);
  }

  function download() {
    const blob = new Blob([content], { type: mime });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(url);
  }

  return (
    <div className={styles.modalBackdrop} onClick={onClose}>
      <div className={styles.modal} onClick={(e) => e.stopPropagation()} style={{ maxWidth: 760 }}>
        <button type="button" className={styles.modalClose} onClick={onClose} aria-label="Close">×</button>
        <h2 className={styles.modalTitle}>Export</h2>
        <p className={styles.modalHint}>Take this palette into Figma, code, or a designer-friendly file.</p>

        <div className={styles.formatList}>
          {FORMATS.map((f) => (
            <button
              key={f.id}
              type="button"
              className={`${styles.formatBtn} ${activeFormat === f.id ? styles.formatBtnActive : ""}`}
              onClick={() => setActiveFormat(f.id)}
            >
              {f.label}
            </button>
          ))}
        </div>

        {isPrintFormat ? (
          <div className={styles.formatDescription}>
            <p>Opens a print-ready brand book in a new tab — cover, palette, application, gradients, and marks across five letter-landscape pages.</p>
            <p>In the new tab, press <kbd>⌘P</kbd> and choose <strong>Save as PDF</strong> as the destination.</p>
          </div>
        ) : activeFormat === "figma" ? (
          <>
            <pre className={styles.codeBlock}><code>{content}</code></pre>
            <div className={styles.formatDescription}>
              <strong>To import into Figma:</strong>
              <ol>
                <li>Open your Figma file</li>
                <li>Variables panel → <strong>⋯</strong> menu → <strong>Import variables</strong></li>
                <li>Select the downloaded JSON</li>
              </ol>
            </div>
          </>
        ) : (
          <pre className={styles.codeBlock}><code>{content}</code></pre>
        )}

        <div className={styles.modalActions}>
          {isPrintFormat ? (
            <button type="button" className={`${styles.btn} ${styles.btnPrimary}`} onClick={openPrint}>
              Open print view ↗
            </button>
          ) : (
            <>
              <button type="button" className={styles.btn} onClick={copy}>{copied ? "Copied" : "Copy to clipboard"}</button>
              <button type="button" className={`${styles.btn} ${styles.btnPrimary}`} onClick={download}>
                Download {filename}
              </button>
            </>
          )}
        </div>
      </div>
    </div>
  );
}

// ---------- helpers ----------

function luminance(hex) {
  const h = hex.replace("#", "");
  const r = parseInt(h.slice(0, 2), 16) / 255;
  const g = parseInt(h.slice(2, 4), 16) / 255;
  const b = parseInt(h.slice(4, 6), 16) / 255;
  const lin = (v) => (v <= 0.03928 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4));
  return 0.2126 * lin(r) + 0.7152 * lin(g) + 0.0722 * lin(b);
}

function saturation(hex) {
  const h = hex.replace("#", "");
  const r = parseInt(h.slice(0, 2), 16) / 255;
  const g = parseInt(h.slice(2, 4), 16) / 255;
  const b = parseInt(h.slice(4, 6), 16) / 255;
  const max = Math.max(r, g, b);
  const min = Math.min(r, g, b);
  return max === 0 ? 0 : (max - min) / max;
}

function derivePreviewRoles(palette, variant = "dark") {
  if (!palette || palette.length === 0) return null;
  const sorted = palette.slice().sort((a, b) => luminance(a) - luminance(b));
  const darkest = sorted[0];
  const lightest = sorted[sorted.length - 1];
  const mids = sorted.slice(1, -1);
  let accent = lightest;
  if (mids.length) {
    let bestSat = -1;
    for (const h of mids) {
      const s = saturation(h);
      if (s > bestSat) { bestSat = s; accent = h; }
    }
  }
  const muted = mids.length ? mids[Math.floor(mids.length / 2)] : darkest;
  if (variant === "light") {
    return { bg: lightest, ink: darkest, accent, muted };
  }
  return { bg: darkest, ink: lightest, accent, muted };
}
