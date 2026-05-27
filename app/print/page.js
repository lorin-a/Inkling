"use client";

import { useEffect, useState, useMemo, Suspense } from "react";
import { useSearchParams } from "next/navigation";
import Link from "next/link";
import { remapSvgColors } from "../../lib/svgRemap";
import { derivePreviewRoles } from "../../lib/derivePreviewRoles";
import { relativeLuminance as luminance } from "../../lib/colorTheory";
import FontLoader from "../../components/FontLoader";
import { apiFetch } from "../../lib/api/client";
import styles from "./page.module.css";

export default function PrintPage() {
  return (
    <Suspense fallback={null}>
      <PrintInner />
    </Suspense>
  );
}

function PrintInner() {
  const params = useSearchParams();
  const [project, setProject] = useState(null);
  const [presets, setPresets] = useState([]);
  const [brandPool, setBrandPool] = useState([]);
  const [chosenPresetId, setChosenPresetId] = useState(null);
  const [markList, setMarkList] = useState([]);
  const [marks, setMarks] = useState({});
  const [pdf, setPdf] = useState({ status: "idle", error: null });

  // Palette from URL — `?palette=hex1,hex2,...` (no leading #). When present
  // (e.g. "Open print view" from Brand) it wins; otherwise the book falls back
  // to a saved identity so it's never empty when reached from the path nav.
  const urlPalette = (params.get("palette") || "")
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean)
    .map((h) => (h.startsWith("#") ? h : `#${h}`));

  useEffect(() => {
    apiFetch("/api/project").then((r) => r.json()).then(setProject).catch(() => {});
    apiFetch("/api/presets", { cache: "no-store" }).then((r) => r.json()).then((d) => setPresets(d.presets || [])).catch(() => {});
    apiFetch("/api/library/palette", { cache: "no-store" }).then((r) => r.json()).then((d) => setBrandPool(Array.isArray(d.brand) ? d.brand : [])).catch(() => {});
  }, []);

  // Resolve which identity the book shows, in priority order:
  // URL palette → chosen/most-recent preset → promoted brand colors.
  const source = useMemo(() => {
    if (urlPalette.length > 0) {
      return { palette: urlPalette, fonts: project?.fonts, textures: project?.textures, roleOverrides: null, label: project?.name || "Current palette", kind: "live" };
    }
    if (presets.length > 0) {
      const p = presets.find((x) => x.id === chosenPresetId) || presets[0];
      return { palette: p.palette || [], fonts: p.fonts || project?.fonts, textures: p.textures, roleOverrides: p.roleOverrides, label: p.name || "Preset", kind: "preset", presetId: p.id };
    }
    if (brandPool.length > 0) {
      return { palette: brandPool.slice(0, 5), fonts: project?.fonts, textures: project?.textures, roleOverrides: null, label: "Brand colors", kind: "brand" };
    }
    return { palette: [], fonts: project?.fonts, textures: project?.textures, roleOverrides: null, label: null, kind: "empty" };
  }, [urlPalette.join(","), presets, chosenPresetId, brandPool, project]);

  const palette = source.palette;

  useEffect(() => {
    apiFetch("/api/marks").then((r) => r.json()).then((d) => setMarkList(d.marks || [])).catch(() => {});
  }, []);

  // Pre-fetch SVG markup for each mark so they print reliably (no
  // late-loading during the print snapshot).
  useEffect(() => {
    if (markList.length === 0) { setMarks({}); return; }
    let cancelled = false;
    Promise.all(
      markList.map((m) =>
        fetch(m.url)
          .then((r) => (r.ok ? r.text() : null))
          .then((text) => ({ file: m.file, text }))
          .catch(() => ({ file: m.file, text: null })),
      ),
    ).then((results) => {
      if (cancelled) return;
      const out = {};
      for (const { file, text } of results) {
        if (text) {
          out[file] = text
            .replace(/<\?xml[^>]*\?>/g, "")
            .replace(/<!DOCTYPE[^>]*>/g, "")
            .replace(/<svg([^>]*)\swidth="[^"]*"/, "<svg$1")
            .replace(/<svg([^>]*)\sheight="[^"]*"/, "<svg$1");
        }
      }
      setMarks(out);
    });
    return () => { cancelled = true; };
  }, [markList]);

  const remappedMarks = useMemo(() => {
    const out = {};
    for (const [file, svg] of Object.entries(marks)) {
      out[file] = palette.length > 0 ? remapSvgColors(svg, palette) : svg;
    }
    return out;
  }, [marks, palette.join(",")]);

  const roles = { ...derivePreviewRoles(palette), ...(source.roleOverrides?.dark || {}) };
  const sorted = palette.slice().sort((a, b) => luminance(a) - luminance(b));
  const gradient1 = sorted.length ? `linear-gradient(135deg, ${sorted.join(", ")})` : "transparent";
  const gradient2 = sorted.length ? `linear-gradient(90deg, ${sorted.slice().reverse().join(", ")})` : "transparent";

  const name = project?.name || "Brand";
  const wordmark = project?.wordmark || "wordmark";
  const period = project?.period ?? ".";
  const tagline = project?.tagline || "";
  const body = project?.body || "";
  const today = new Date().toLocaleDateString(undefined, { year: "numeric", month: "long", day: "numeric" });

  const fontVars = buildFontVars(source.fonts);

  async function downloadPdf() {
    setPdf({ status: "working", error: null });
    try {
      const res = await fetch("/api/brand/export", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ palette, project: { ...project, fonts: source.fonts, textures: source.textures }, slug: project?.slug }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error || `Export failed (${res.status})`);
      }
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `${(project?.wordmark || project?.name || "brand").toString().toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "") || "brand"}-brand-book.pdf`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      URL.revokeObjectURL(url);
      setPdf({ status: "idle", error: null });
    } catch (e) {
      setPdf({ status: "error", error: e.message });
    }
  }

  return (
    <div className={styles.printRoot} style={fontVars}>
      <FontLoader fonts={source.fonts} />
      {/* Toolbar — hidden on print */}
      <div className={styles.toolbar}>
        <Link href="/brand" className={styles.exit}>
          <span aria-hidden="true">←</span> Back to Brand
        </Link>
        {source.kind === "preset" && presets.length > 0 && urlPalette.length === 0 && (
          <label className={styles.toolbarSelect}>
            <span className={styles.toolbarSelectLabel}>Identity</span>
            <select
              value={source.presetId || presets[0].id}
              onChange={(e) => setChosenPresetId(e.target.value)}
            >
              {presets.map((p) => (
                <option key={p.id} value={p.id}>{p.name || "Untitled preset"}</option>
              ))}
            </select>
          </label>
        )}
        <span className={styles.toolbarDivider} aria-hidden="true" />
        <button
          type="button"
          className={styles.printBtn}
          onClick={downloadPdf}
          disabled={pdf.status === "working" || palette.length === 0}
        >
          {pdf.status === "working" ? "Building PDF…" : "↓ Download PDF"}
        </button>
        <button type="button" className={styles.printBtnGhost} onClick={() => window.print()}>
          Print
        </button>
        <span className={styles.toolbarHint}>
          {pdf.status === "error"
            ? pdf.error
            : source.label
            ? `Showing: ${source.label}${source.kind === "preset" ? " (preset)" : source.kind === "brand" ? " (brand colors)" : ""}`
            : "One-click PDF, or print to your own destination."}
        </span>
      </div>

      {source.kind === "empty" && (
        <div className={styles.printEmpty}>
          <p>Nothing to show yet. Compose a palette on <Link href="/brand" className={styles.emptyLink}>Brand</Link> and open the print view, or save a Brand preset and it will fill this book.</p>
        </div>
      )}

      {/* Page 1 — Cover */}
      <section className={styles.page} style={{ background: roles?.bg || "#ffffff" }}>
        <TextureOverlay tx={source.textures?.dark} />
        <div className={styles.cover}>
          <p className={styles.coverEyebrow} style={{ color: roles?.accent }}>Brand book</p>
          <h1 className={styles.coverWordmark} style={{ color: roles?.ink || "#000" }}>
            {wordmark}<span style={{ color: roles?.accent }}>{period}</span>
          </h1>
          {tagline && (
            <p className={styles.coverTagline} style={{ color: roles?.ink || "#000" }}>{tagline}</p>
          )}
          {body && (
            <p className={styles.coverBody} style={{ color: roles?.muted || "#666" }}>{body}</p>
          )}
        </div>
        <Footer name={name} today={today} pageLabel="Cover" />
      </section>

      {/* Page 2 — Palette */}
      <section className={styles.page}>
        <PageHeader title="Palette" subtitle={`${palette.length} colors`} />
        <div className={styles.swatchGrid}>
          {palette.map((hex, i) => (
            <div key={i} className={styles.bigSwatch} style={{ backgroundColor: hex }}>
              <div className={styles.bigSwatchLabel}>
                <span className={styles.bigSwatchIndex}>{String(i + 1).padStart(2, "0")}</span>
                <span className={styles.bigSwatchHex}>{hex.toUpperCase()}</span>
              </div>
            </div>
          ))}
        </div>
        {roles && (
          <div className={styles.roleRow}>
            <RoleChip label="bg" hex={roles.bg} />
            <RoleChip label="ink" hex={roles.ink} />
            <RoleChip label="accent" hex={roles.accent} />
            <RoleChip label="muted" hex={roles.muted} />
          </div>
        )}
        <Footer name={name} today={today} pageLabel="Palette" />
      </section>

      {/* Page 3 — Application (the brand mock at print scale) */}
      <section className={styles.page} style={{ background: roles?.bg || "#ffffff" }}>
        <TextureOverlay tx={source.textures?.dark} />
        <PageHeader title="Application" subtitle="Wordmark composition" inverted />
        <div className={styles.application}>
          <p className={styles.appWordmark} style={{ color: roles?.ink }}>
            {wordmark}<span style={{ color: roles?.accent }}>{period}</span>
          </p>
          <p className={styles.appWordmarkItalic} style={{ color: roles?.muted }}>
            {wordmark}<span style={{ color: roles?.accent }}>{period}</span>
          </p>
          {tagline && (
            <p className={styles.appTagline} style={{ color: roles?.ink }}>{tagline}</p>
          )}
          {body && (
            <p className={styles.appBody} style={{ color: roles?.muted }}>{body}</p>
          )}
        </div>
        <Footer name={name} today={today} pageLabel="Application" inverted />
      </section>

      {/* Page 4 — Gradients */}
      <section className={styles.page}>
        <PageHeader title="Gradients" subtitle="Derived from the palette" />
        <div className={styles.gradientStack}>
          <div className={styles.gradientCard} style={{ backgroundImage: gradient1 }} />
          <div className={styles.gradientCard} style={{ backgroundImage: gradient2 }} />
          <p className={styles.gradientCss}>
            <strong>Gradient 1</strong>
            <br />
            <code>{gradient1}</code>
          </p>
          <p className={styles.gradientCss}>
            <strong>Gradient 2</strong>
            <br />
            <code>{gradient2}</code>
          </p>
        </div>
        <Footer name={name} today={today} pageLabel="Gradients" />
      </section>

      {/* Page 5 — Marks */}
      <section className={styles.page}>
        <PageHeader title="Marks" subtitle="Hand-drawn brand assets" />
        <div className={styles.marksGrid}>
          {markList.map((m) => (
            <figure key={m.file} className={styles.markCell}>
              <div
                className={styles.markBox}
                dangerouslySetInnerHTML={{ __html: remappedMarks[m.file] || "" }}
              />
              <figcaption className={styles.markCaption}>{m.name}</figcaption>
            </figure>
          ))}
        </div>
        <Footer name={name} today={today} pageLabel="Marks" />
      </section>
    </div>
  );
}

function PageHeader({ title, subtitle, inverted }) {
  return (
    <header className={`${styles.pageHeader} ${inverted ? styles.pageHeaderInverted : ""}`}>
      <h2 className={styles.pageTitle}>{title}</h2>
      {subtitle && <p className={styles.pageSubtitle}>{subtitle}</p>}
    </header>
  );
}

function RoleChip({ label, hex }) {
  return (
    <div className={styles.roleChip}>
      <span className={styles.roleSwatch} style={{ backgroundColor: hex }} />
      <span className={styles.roleLabel}>{label}</span>
      <span className={styles.roleHex}>{hex.toUpperCase()}</span>
    </div>
  );
}

function TextureOverlay({ tx }) {
  if (!tx?.url) return null;
  return (
    <div
      aria-hidden="true"
      style={{
        position: "absolute",
        inset: 0,
        backgroundImage: `url(${tx.url})`,
        backgroundSize: "cover",
        backgroundPosition: "center",
        opacity: tx.opacity ?? 0.6,
        mixBlendMode: tx.blend || "multiply",
        pointerEvents: "none",
        zIndex: 0,
      }}
    />
  );
}

function Footer({ name, today, pageLabel, inverted }) {
  return (
    <footer className={`${styles.pageFooter} ${inverted ? styles.pageFooterInverted : ""}`}>
      <span>{name} · {pageLabel}</span>
      <span>{today} · Moodbuilder</span>
    </footer>
  );
}

// ---------- helpers ----------
function buildFontVars(fonts) {
  if (!fonts) return {};
  const vars = {};
  const wrap = (slot) => {
    if (!slot?.family) return null;
    return slot.family.includes(" ") ? `"${slot.family}"` : slot.family;
  };
  const title = wrap(fonts.title);
  const subhead = wrap(fonts.subhead);
  const body = wrap(fonts.body);
  if (title) vars["--font-title"] = title;
  if (subhead) vars["--font-subhead"] = subhead;
  if (body) vars["--font-body"] = body;
  return vars;
}

// derivePreviewRoles imported from lib/ — shared with the brand page and
// the smart composer.
