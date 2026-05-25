"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { usePalette } from "../../lib/usePalette";
import { useProject } from "../../lib/useProject";
import { useAuthed } from "../../lib/api/useAuthed";
import { POOL_LABELS } from "../../lib/palettePool";
import { derivePreviewRoles } from "../../lib/derivePreviewRoles";
import { relativeLuminance as luminance } from "../../lib/colorTheory";
import { FORMATS, formatExport } from "../../lib/exportFormats";
import BrandPreview from "../../components/BrandPreview";
import MarksFrame from "../../components/MarksFrame";
import ProjectSwitcher from "../../components/ProjectSwitcher";
import TypePanel from "../../components/TypePanel";
import TexturePanel from "../../components/TexturePanel";
import PresetsPanel from "../../components/PresetsPanel";
import FontLoader from "../../components/FontLoader";
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
    applySnapshot,
    moodboardPool,
    starredPool,
    pools,
    paletteSource,
    setPaletteSource,
  } = usePalette({ initialSize: 5, initialPoolKey: "starred" });

  const { project, save: saveProject } = useProject();
  const authed = useAuthed();
  const [picker, setPicker] = useState(null);
  const [editingProject, setEditingProject] = useState(false);
  const [exportOpen, setExportOpen] = useState(false);
  const [shareState, setShareState] = useState({ status: "idle", url: null, error: null });

  // On mount, check if the Colors page handed us a palette to apply via
  // localStorage. If so, load it and surface the source so we can show a
  // "from: vogue.com" chip below the toolbar.
  useEffect(() => {
    try {
      const raw = localStorage.getItem("moodbuilder.apply-palette");
      if (!raw) return;
      const data = JSON.parse(raw);
      if (Array.isArray(data?.hexes) && data.hexes.length > 0) {
        applySnapshot({ palette: data.hexes, size: data.hexes.length });
        setPaletteSource?.(data.source || null);
      }
      localStorage.removeItem("moodbuilder.apply-palette");
    } catch {}
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const openForVoting = useCallback(async () => {
    if (authed === false) {
      setShareState({
        status: "idle",
        url: null,
        error: "Sign in to share a brand for voting. Sharing publishes your project to a hosted link, which needs an account.",
      });
      return;
    }
    setShareState({ status: "sharing", url: null, error: null });
    try {
      const res = await fetch("/api/instances/create", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ audience: "public", vote_unit: "preset" }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to share");
      try { await navigator.clipboard.writeText(data.share_url); } catch {}
      setShareState({ status: "ready", url: data.share_url, error: null });
    } catch (e) {
      setShareState({ status: "idle", url: null, error: e.message });
    }
  }, [authed]);
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
      <FontLoader fonts={project.fonts} />
      <header className={styles.bar}>
        <Link href="/" className={styles.back}>← Moodbuilder</Link>
        <ProjectSwitcher />
        <button
          type="button"
          className={styles.barTitleBtn}
          onClick={() => setEditingProject(true)}
          title="Edit the project's wordmark, tagline, and body text"
        >
          <PencilIcon /> Edit brand text
        </button>

        <div className={styles.controls}>
          <label className={styles.control} title="Which set of colors shuffle samples from">
            <span className={styles.controlLabel}>Source</span>
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

          <label className={styles.control} title="How many color slots the palette has">
            <span className={styles.controlLabel}>
              Slots <span className={styles.value}>{size}</span>
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
            title="Undo. Previous palette."
            aria-label="Undo"
          >
            <UndoIcon />
          </button>
          <button
            type="button"
            className={`${styles.btn} ${styles.btnGhost}`}
            onClick={() => stepHistory(1)}
            disabled={!canRedo}
            title="Redo. Next palette."
            aria-label="Redo"
          >
            <RedoIcon />
          </button>
          <button
            type="button"
            className={`${styles.btn} ${styles.btnPrimary}`}
            onClick={handleShuffle}
            disabled={poolEmpty}
            title={poolEmpty ? "This source is empty" : "Shuffle a new palette (Space)"}
          >
            Shuffle
            <kbd className={styles.kbd}>Space</kbd>
          </button>
          <button
            type="button"
            className={`${styles.btn} ${styles.btnFav}`}
            onClick={() => favorite()}
            title="Bookmark this palette (F). Saves colors only, not the full brand."
          >
            ★ Bookmark palette
          </button>
          <button
            type="button"
            className={`${styles.btn}`}
            onClick={() => setExportOpen(true)}
            disabled={palette.length === 0}
            title="Export palette as CSS, JSON, Figma tokens, or open as a brand book"
          >
            ↓ Export
          </button>
          <button
            type="button"
            className={`${styles.btn} ${styles.btnPrimary}`}
            onClick={openForVoting}
            disabled={shareState.status === "sharing"}
            title="Publish this brand to a shareable URL so collaborators can vote"
          >
            {shareState.status === "sharing" ? "Sharing…" : "↗ Share for voting"}
          </button>
        </div>
      </header>

      {paletteSource?.kind === "pin" && (
        <div className={styles.sourceChip} role="status" aria-live="polite">
          <span className={styles.sourceChipDot} />
          <span className={styles.sourceChipLabel}>
            Shuffled from pin
            {paletteSource.sourceDomain && (
              <>
                {" "}·{" "}
                <a
                  href={paletteSource.sourceUrl || paletteSource.pinUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className={styles.sourceChipLink}
                >
                  {paletteSource.sourceDomain}
                </a>
              </>
            )}
          </span>
          <button
            type="button"
            className={styles.sourceChipClose}
            onClick={() => setPaletteSource(null)}
            aria-label="Dismiss source attribution"
          >×</button>
        </div>
      )}

      {shareState.status === "ready" && (
        <ShareToast
          url={shareState.url}
          onClose={() => setShareState({ status: "idle", url: null, error: null })}
        />
      )}
      {shareState.error && (
        <ShareToast
          error={shareState.error}
          onClose={() => setShareState({ status: "idle", url: null, error: null })}
        />
      )}

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

          <TypePanel
            fonts={project.fonts}
            onChange={(fonts) => saveProject({ fonts })}
          />

          <TexturePanel
            textures={project.textures}
            onChange={(textures) => saveProject({ textures })}
          />

          <PresetsPanel
            snapshot={() => ({
              palette,
              size,
              poolKey,
              roleOverrides,
              fonts: project.fonts || {},
              textures: project.textures || {},
            })}
            applyPreset={(p) => {
              applySnapshot({ palette: p.palette, size: p.size, poolKey: p.poolKey });
              setRoleOverrides(p.roleOverrides || { dark: {}, light: {} });
              saveProject({ fonts: p.fonts || {}, textures: p.textures || {} });
            }}
          />

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
              No Top picks yet.{" "}
              <Link href="/colors" className={styles.emptyHintLink}>
                Open the Colors page
              </Link>{" "}
              and add a palette to Top picks (or star individual colors). They become this shuffle&rsquo;s pool: your highest-signal source.
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
                  title={locks.has(i) ? "Locked. Won't change on shuffle. Click to unlock." : "Lock this slot so shuffle leaves it alone."}
                  aria-label={locks.has(i) ? "Unlock slot" : "Lock slot"}
                >
                  {locks.has(i) ? <LockIcon /> : <LockOpenIcon />}
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
                {(pools[poolKey] || []).map((hex, i) => (
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
              Bookmarked palettes
              <span className={styles.railCount}>{favorites.length}</span>
            </h2>
            {favorites.length === 0 && (
              <p className={styles.railEmpty}>None yet. Press F or ★ Bookmark palette to keep one.</p>
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
          {authed === false && (
            <div className={styles.sampleTag}>
              <span aria-hidden="true">✦</span>
              <span><strong>Sample brand.</strong> Placeholder name and colors. Rename, recolor, or import a board to make it yours.</span>
            </div>
          )}
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
// derivePreviewRoles + luminance are now imported from lib/. The local
// `saturation()` helper used to power the legacy role picker; the shared
// module replaces it with OKLCH chroma so the composer and the renderer
// agree on what "most vivid" means.

// Small inline icons. Glyphs (←→●○) were ambiguous — undo/redo arrows
// were reading as next/prev page, and the dot pair on the lock toggle
// read as a radio selection. SVGs make the affordance honest.
function PencilIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 16 16" fill="none" aria-hidden="true">
      <path d="M11.5 1.5l3 3-9 9-3.5.5.5-3.5 9-9z" stroke="currentColor" strokeWidth="1.4" strokeLinejoin="round" />
      <path d="M9.5 3.5l3 3" stroke="currentColor" strokeWidth="1.4" />
    </svg>
  );
}
function UndoIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 16 16" fill="none" aria-hidden="true">
      <path d="M3 6h7a3.5 3.5 0 010 7H6.5" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M5.5 3.5L3 6l2.5 2.5" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}
function RedoIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 16 16" fill="none" aria-hidden="true">
      <path d="M13 6H6a3.5 3.5 0 000 7h3.5" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M10.5 3.5L13 6l-2.5 2.5" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}
function LockIcon() {
  return (
    <svg width="13" height="13" viewBox="0 0 16 16" fill="none" aria-hidden="true">
      <rect x="3.5" y="7" width="9" height="7" rx="1.5" stroke="currentColor" strokeWidth="1.4" />
      <path d="M5.5 7V5a2.5 2.5 0 015 0v2" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" />
    </svg>
  );
}
function LockOpenIcon() {
  return (
    <svg width="13" height="13" viewBox="0 0 16 16" fill="none" aria-hidden="true">
      <rect x="3.5" y="7" width="9" height="7" rx="1.5" stroke="currentColor" strokeWidth="1.4" />
      <path d="M5.5 7V5a2.5 2.5 0 014.95-.6" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" />
    </svg>
  );
}

function ShareToast({ url, error, onClose }) {
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    if (!url) return;
    setCopied(true);
    const t = setTimeout(() => setCopied(false), 2200);
    return () => clearTimeout(t);
  }, [url]);

  async function copy() {
    if (!url) return;
    try { await navigator.clipboard.writeText(url); setCopied(true); } catch {}
  }

  return (
    <div className={styles.shareToast} role="status" aria-live="polite">
      {error ? (
        <>
          <div className={styles.shareToastTitle}>Couldn’t share.</div>
          <div className={styles.shareToastBody}>{error}</div>
          <button type="button" className={styles.shareToastClose} onClick={onClose} aria-label="Close">×</button>
        </>
      ) : (
        <>
          <div className={styles.shareToastTitle}>
            {copied ? "Link copied. Share it with collaborators." : "Project published for voting"}
          </div>
          <div className={styles.shareToastRow}>
            <code className={styles.shareToastUrl}>{url}</code>
            <button type="button" className={styles.shareToastCopy} onClick={copy}>
              {copied ? "Copied" : "Copy"}
            </button>
            <a className={styles.shareToastOpen} href={url} target="_blank" rel="noreferrer">Open</a>
          </div>
          <button type="button" className={styles.shareToastClose} onClick={onClose} aria-label="Close">×</button>
        </>
      )}
    </div>
  );
}
