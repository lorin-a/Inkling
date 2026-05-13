/**
 * Remap every unique color in an SVG string. By default each original
 * color maps to the closest-by-luminance entry in a target palette,
 * preserving internal hierarchy. User overrides (per-original-hex)
 * trump the auto map.
 *
 * Used by InlineMark, MarksFrame, and the /print brand book so marks
 * render consistently across all surfaces.
 *
 * @param {string} svg          - raw SVG markup
 * @param {string[]} palette    - palette of hex strings to map into
 * @param {object} overrides    - { [originalHex]: targetHex } user overrides
 * @returns {string} svg with colors substituted
 */
export function remapSvgColors(svg, palette, overrides = {}) {
  if (!svg) return svg;

  const uniqueColors = collectUniqueColors(svg);
  if (uniqueColors.length === 0) return svg;

  // Normalize overrides for case-insensitive lookup.
  const normOverrides = {};
  for (const [k, v] of Object.entries(overrides || {})) {
    if (typeof k === "string" && typeof v === "string") {
      normOverrides[k.toLowerCase()] = v;
    }
  }

  const hasPalette = palette && palette.length > 0;

  const sortedSvg = [...uniqueColors].sort((a, b) => luminance(a) - luminance(b));
  const sortedPal = hasPalette
    ? [...palette].sort((a, b) => luminance(a) - luminance(b))
    : [];

  const mapping = {};
  sortedSvg.forEach((c, i) => {
    const override = normOverrides[c];
    if (override) {
      mapping[c] = override;
      return;
    }
    if (!hasPalette) {
      mapping[c] = c; // identity
      return;
    }
    const t = sortedSvg.length === 1 ? 0.5 : i / (sortedSvg.length - 1);
    const idx = Math.round(t * (sortedPal.length - 1));
    mapping[c] = sortedPal[idx];
  });

  let out = svg;
  for (const [orig, replacement] of Object.entries(mapping)) {
    if (orig.toLowerCase() === String(replacement).toLowerCase()) continue;
    const escaped = orig.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
    const re = new RegExp(escaped, "gi");
    out = out.replace(re, replacement);
  }
  return out;
}

/**
 * Expose the list of unique original colors in an SVG so an editor UI
 * can show one row per color.
 */
export function getSvgColors(svg) {
  if (!svg) return [];
  return collectUniqueColors(svg);
}

function collectUniqueColors(svg) {
  const found = new Set();
  const attrRe = /(?:fill|stroke|stop-color)\s*=\s*"([^"]+)"/gi;
  let m;
  while ((m = attrRe.exec(svg)) !== null) registerColor(found, m[1]);
  const styleRe = /style\s*=\s*"([^"]+)"/gi;
  while ((m = styleRe.exec(svg)) !== null) {
    const decls = m[1].split(";");
    for (const decl of decls) {
      const [prop, val] = decl.split(":").map((s) => s && s.trim());
      if (!val) continue;
      if (/^(fill|stroke|stop-color)$/i.test(prop)) registerColor(found, val);
    }
  }
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
  if (/^#[0-9a-f]{3}$/i.test(v)) {
    const expanded = "#" + v.slice(1).split("").map((c) => c + c).join("").toLowerCase();
    set.add(expanded);
    return;
  }
  if (/^#[0-9a-f]{6}$/i.test(v)) {
    set.add(v.toLowerCase());
    return;
  }
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
