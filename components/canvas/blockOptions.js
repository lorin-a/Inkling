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

export function nextIn(list, current) {
  const i = list.indexOf(current);
  return list[(i + 1) % list.length];
}
