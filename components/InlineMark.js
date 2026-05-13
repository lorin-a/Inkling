"use client";

import { useEffect, useMemo, useState } from "react";

/**
 * Loads /marks/[name].svg and inlines it.
 *
 * If `palette` is provided, the SVG's internal colors are *remapped* —
 * preserving the mark's internal hierarchy. We find every unique fill /
 * stroke color in the SVG, sort by luminance (dark → light), and map each
 * to a palette color sorted the same way. So a mark with a deep fill plus a
 * light stroke keeps that relationship; both shift to wherever the palette
 * has its darkest and lightest entries this shuffle.
 *
 * Colors named `none` or `currentColor` are left alone.
 */
export default function InlineMark({ name, width, height, className, palette }) {
  const [raw, setRaw] = useState(null);
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    let cancelled = false;
    fetch(`/marks/${name}.svg`)
      .then((r) => (r.ok ? r.text() : Promise.reject(new Error(`status ${r.status}`))))
      .then((text) => {
        if (cancelled) return;
        const cleaned = text
          .replace(/<\?xml[^>]*\?>/g, "")
          .replace(/<!DOCTYPE[^>]*>/g, "")
          .replace(/<svg([^>]*)\swidth="[^"]*"/, "<svg$1")
          .replace(/<svg([^>]*)\sheight="[^"]*"/, "<svg$1");
        setRaw(cleaned);
      })
      .catch(() => {
        if (!cancelled) setFailed(true);
      });
    return () => {
      cancelled = true;
    };
  }, [name]);

  const markup = useMemo(() => {
    if (!raw) return null;
    if (!palette || palette.length === 0) return raw;
    return remapSvgColors(raw, palette);
  }, [raw, palette]);

  if (failed) {
    return <FallbackBrush width={width} height={height} className={className} />;
  }

  if (!markup) {
    return <div className={className} style={{ width, height }} aria-hidden="true" />;
  }

  return (
    <div
      className={className}
      style={{ width, height, display: "inline-block", lineHeight: 0 }}
      dangerouslySetInnerHTML={{ __html: markup }}
      aria-hidden="true"
    />
  );
}

// ---- color remapping ---------------------------------------------------

function remapSvgColors(svg, palette) {
  const uniqueColors = collectUniqueColors(svg);
  if (uniqueColors.length === 0) return svg;

  const sortedSvg = [...uniqueColors].sort((a, b) => luminance(a) - luminance(b));
  const sortedPal = [...palette].sort((a, b) => luminance(a) - luminance(b));

  // Build mapping by interpolating palette index across the SVG color range.
  const mapping = {};
  sortedSvg.forEach((c, i) => {
    const t = sortedSvg.length === 1 ? 0.5 : i / (sortedSvg.length - 1);
    const idx = Math.round(t * (sortedPal.length - 1));
    mapping[c] = sortedPal[idx];
  });

  let out = svg;
  for (const [orig, replacement] of Object.entries(mapping)) {
    // Match the color in fill/stroke/stop-color attributes, in CSS rules, and
    // in inline style declarations. Case-insensitive on hex.
    const escaped = orig.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
    const re = new RegExp(escaped, "gi");
    out = out.replace(re, replacement);
  }
  return out;
}

function collectUniqueColors(svg) {
  const found = new Set();
  // Attributes: fill="…" / stroke="…" / stop-color="…"
  const attrRe = /(?:fill|stroke|stop-color)\s*=\s*"([^"]+)"/gi;
  let m;
  while ((m = attrRe.exec(svg)) !== null) registerColor(found, m[1]);
  // Inline styles: style="fill: …; stroke: …"
  const styleRe = /style\s*=\s*"([^"]+)"/gi;
  while ((m = styleRe.exec(svg)) !== null) {
    const decls = m[1].split(";");
    for (const decl of decls) {
      const [prop, val] = decl.split(":").map((s) => s && s.trim());
      if (!val) continue;
      if (/^(fill|stroke|stop-color)$/i.test(prop)) registerColor(found, val);
    }
  }
  // <style> blocks: catch any hex literal inside
  const cssRe = /<style[^>]*>([\s\S]*?)<\/style>/gi;
  while ((m = cssRe.exec(svg)) !== null) {
    const block = m[1];
    const hexRe = /#[0-9a-f]{3,8}\b/gi;
    let h;
    while ((h = hexRe.exec(block)) !== null) registerColor(found, h[0]);
  }
  return [...found];
}

function registerColor(set, raw) {
  if (!raw) return;
  const v = raw.trim();
  if (!v) return;
  if (v === "none" || v === "currentColor" || v === "transparent" || v === "inherit") return;
  // Normalize 3-digit hex to 6-digit so duplicates collapse.
  if (/^#[0-9a-f]{3}$/i.test(v)) {
    const expanded = "#" + v.slice(1).split("").map((c) => c + c).join("").toLowerCase();
    set.add(expanded);
    return;
  }
  if (/^#[0-9a-f]{6}$/i.test(v)) {
    set.add(v.toLowerCase());
    return;
  }
  // Ignore rgb()/hsl()/named colors for now — Figma exports almost always hex.
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

function FallbackBrush({ width = 520, height = 44, className }) {
  return (
    <svg
      className={className}
      width={width}
      height={height}
      viewBox="0 0 520 44"
      fill="none"
      aria-hidden="true"
    >
      <path
        d="M2 24 C 60 8, 120 36, 180 22 S 320 8, 380 26 S 480 18, 518 28"
        stroke="currentColor"
        strokeWidth="3"
        strokeLinecap="round"
        fill="none"
        opacity="0.6"
      />
    </svg>
  );
}
