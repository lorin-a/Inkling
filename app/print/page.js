"use client";

import { useEffect, useState, useMemo, Suspense } from "react";
import { useSearchParams } from "next/navigation";
import { remapSvgColors } from "../../lib/svgRemap";
import { derivePreviewRoles } from "../../lib/derivePreviewRoles";
import { relativeLuminance as luminance } from "../../lib/colorTheory";
import FontLoader from "../../components/FontLoader";
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
  const [markList, setMarkList] = useState([]);
  const [marks, setMarks] = useState({});

  // Palette from URL — `?palette=hex1,hex2,...` (no leading #).
  const palette = (params.get("palette") || "")
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean)
    .map((h) => (h.startsWith("#") ? h : `#${h}`));

  useEffect(() => {
    fetch("/api/project").then((r) => r.json()).then(setProject).catch(() => {});
  }, []);

  useEffect(() => {
    fetch("/api/marks").then((r) => r.json()).then((d) => setMarkList(d.marks || [])).catch(() => {});
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

  const roles = derivePreviewRoles(palette);
  const sorted = palette.slice().sort((a, b) => luminance(a) - luminance(b));
  const gradient1 = sorted.length ? `linear-gradient(135deg, ${sorted.join(", ")})` : "transparent";
  const gradient2 = sorted.length ? `linear-gradient(90deg, ${sorted.slice().reverse().join(", ")})` : "transparent";

  const name = project?.name || "Brand";
  const wordmark = project?.wordmark || "wordmark";
  const period = project?.period ?? ".";
  const tagline = project?.tagline || "";
  const body = project?.body || "";
  const today = new Date().toLocaleDateString(undefined, { year: "numeric", month: "long", day: "numeric" });

  const fontVars = buildFontVars(project?.fonts);

  return (
    <div className={styles.printRoot} style={fontVars}>
      <FontLoader fonts={project?.fonts} />
      {/* Toolbar — hidden on print */}
      <div className={styles.toolbar}>
        <button type="button" className={styles.printBtn} onClick={() => window.print()}>
          Print / Save as PDF
        </button>
        <span className={styles.toolbarHint}>
          Cmd+P → choose <strong>Save as PDF</strong> as the destination
        </span>
      </div>

      {/* Page 1 — Cover */}
      <section className={styles.page} style={{ background: roles?.bg || "#ffffff" }}>
        <TextureOverlay tx={project?.textures?.dark} />
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
        <TextureOverlay tx={project?.textures?.dark} />
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
