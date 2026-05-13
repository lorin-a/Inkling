"use client";

import { useEffect, useState, useMemo, Suspense } from "react";
import { useSearchParams } from "next/navigation";
import { remapSvgColors } from "../../lib/svgRemap";
import styles from "./page.module.css";

const MARK_NAMES = [
  "cursive", "flood", "fog",
  "frenzy", "signal", "spiral",
  "squiggle", "tangle", "underline",
];

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

  // Pre-fetch the SVG markup for each mark so they print reliably (no
  // late-loading during the print snapshot).
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
      const m = {};
      for (const { name, text } of results) {
        if (text) {
          m[name] = text
            .replace(/<\?xml[^>]*\?>/g, "")
            .replace(/<!DOCTYPE[^>]*>/g, "")
            .replace(/<svg([^>]*)\swidth="[^"]*"/, "<svg$1")
            .replace(/<svg([^>]*)\sheight="[^"]*"/, "<svg$1");
        }
      }
      setMarks(m);
    });
    return () => { cancelled = true; };
  }, []);

  // Apply palette remap to each fetched mark — same logic as the Brand
  // page so the print version matches the live preview.
  const remappedMarks = useMemo(() => {
    const out = {};
    for (const [name, svg] of Object.entries(marks)) {
      out[name] = palette.length > 0 ? remapSvgColors(svg, palette) : svg;
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

  return (
    <div className={styles.printRoot}>
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
          {MARK_NAMES.map((name) => (
            <figure key={name} className={styles.markCell}>
              <div
                className={styles.markBox}
                dangerouslySetInnerHTML={{ __html: remappedMarks[name] || "" }}
              />
              <figcaption className={styles.markCaption}>{name}</figcaption>
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

function Footer({ name, today, pageLabel, inverted }) {
  return (
    <footer className={`${styles.pageFooter} ${inverted ? styles.pageFooterInverted : ""}`}>
      <span>{name} · {pageLabel}</span>
      <span>{today} · Moodbuilder</span>
    </footer>
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

function derivePreviewRoles(palette) {
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
  return { bg: darkest, ink: lightest, accent, muted };
}
