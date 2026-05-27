"use client";

import { useEffect, useMemo, useState } from "react";
import { remapSvgColors } from "../lib/svgRemap";

/**
 * Loads an SVG from `src` and inlines it.
 *
 * If `palette` is provided, the SVG’s internal colors are *remapped* —
 * preserving the mark’s internal hierarchy. We find every unique fill /
 * stroke color in the SVG, sort by luminance (dark → light), and map each
 * to a palette color sorted the same way. So a mark with a deep fill plus a
 * light stroke keeps that relationship; both shift to wherever the palette
 * has its darkest and lightest entries this shuffle.
 *
 * Colors named `none` or `currentColor` are left alone.
 */
function cleanSvg(text) {
  return text
    .replace(/<\?xml[^>]*\?>/g, "")
    .replace(/<!DOCTYPE[^>]*>/g, "")
    .replace(/<svg([^>]*)\swidth="[^"]*"/, "<svg$1")
    .replace(/<svg([^>]*)\sheight="[^"]*"/, "<svg$1");
}

export default function InlineMark({ src, svg, width, height, className, palette, overrides }) {
  const [raw, setRaw] = useState(svg ? cleanSvg(svg) : null);
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    if (svg) { setRaw(cleanSvg(svg)); return; }
    if (!src) return;
    let cancelled = false;
    fetch(src)
      .then((r) => (r.ok ? r.text() : Promise.reject(new Error(`status ${r.status}`))))
      .then((text) => {
        if (cancelled) return;
        setRaw(cleanSvg(text));
      })
      .catch(() => {
        if (!cancelled) setFailed(true);
      });
    return () => {
      cancelled = true;
    };
  }, [src, svg]);

  const markup = useMemo(() => {
    if (!raw) return null;
    const noPalette = !palette || palette.length === 0;
    const noOverrides = !overrides || Object.keys(overrides).length === 0;
    if (noPalette && noOverrides) return raw;
    return remapSvgColors(raw, palette || [], overrides || {});
  }, [raw, palette, overrides]);

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
