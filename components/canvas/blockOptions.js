// Shared option lists for block variants, so the page (which cycles them) and
// the block components (which render them) never drift.

export const SWATCH_STYLES = ["card", "plain", "circle"];

export const TEXT_FONTS = [
  { key: "sans", label: "Sans", css: "var(--font-sans)" },
  { key: "serif", label: "Serif", css: "var(--font-serif)" },
  { key: "mono", label: "Mono", css: "ui-monospace, SFMono-Regular, Menlo, monospace" },
];

export function fontCss(key) {
  return (TEXT_FONTS.find((f) => f.key === key) || TEXT_FONTS[0]).css;
}

/**
 * Resolve a text block's `font` to a CSS font-family stack. `font` can be:
 *   - undefined → default sans
 *   - a preset key string ("sans" | "serif" | "mono")
 *   - a font value object { family, source, url? } (Google / custom / brand)
 */
export function resolveFontFamily(font) {
  if (!font) return fontCss("sans");
  if (typeof font === "string") return fontCss(font);
  if (font.family) {
    const fam = font.family.includes(" ") ? `"${font.family}"` : font.family;
    return `${fam}, system-ui, sans-serif`;
  }
  return fontCss("sans");
}

/** A stable key for a font value, for deduping FontLoader resources. */
export function fontKey(font) {
  if (!font || typeof font === "string") return null; // presets need no loading
  return `${font.source || "google"}:${font.family}:${font.url || ""}`;
}

export function nextIn(list, current) {
  const i = list.indexOf(current);
  return list[(i + 1) % list.length];
}
