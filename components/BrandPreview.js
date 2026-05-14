"use client";

import FigmaFrame from "./FigmaFrame";
import styles from "./BrandPreview.module.css";

/**
 * Recreates the Whelm brand wordmark composition at 1920px logical width.
 * Role-based colors driven from the parent. Variant "dark" puts bg at
 * darkest, ink at lightest. Variant "light" reverses.
 *
 * Hand-drawn marks render in their own MarksFrame component, not here —
 * they're intentional multi-color brand assets and don't take part in the
 * shuffle.
 */
const DEFAULT_PROJECT = {
  wordmark: "whelm",
  period: ".",
  initial: "w",
  tagline: "Find your way to feeling",
  body: "A ritual for cultivating a relationship with your intuition",
};

/**
 * BrandPreview is now "dumb" about role derivation — the parent computes
 * resolved roles (auto-derived + user overrides merged) and passes them in.
 * Variant just swaps bg↔ink at render time so the light/dark pair stays
 * coherent without needing duplicate overrides.
 */
export default function BrandPreview({ palette, variant = "dark", project, roles: rolesIn, onPickRole }) {
  // Each variant carries its own resolved roles now — no more bg↔ink flip
  // at render time. The parent passes variant-specific roles, and clicks
  // on this variant only modify this variant's overrides.
  const roles = rolesIn || mapRoles(palette, variant);
  const p = { ...DEFAULT_PROJECT, ...(project || {}) };

  const pick = (role) => (e) => {
    if (!onPickRole) return;
    e.stopPropagation();
    onPickRole(variant, role, e);
  };
  const cls = (base) => `${base} ${onPickRole ? styles.clickable : ""}`;

  const fontVars = buildFontVars(p.fonts);
  const texture = p.textures?.[variant] || null;

  return (
    <FigmaFrame
      width={1920}
      height={931}
      background={roles.bg}
      onClick={onPickRole ? pick("bg") : undefined}
      style={fontVars}
    >
      {texture && (
        <div
          aria-hidden="true"
          style={{
            position: "absolute",
            inset: 0,
            backgroundImage: `url(${texture.url})`,
            backgroundSize: "cover",
            backgroundPosition: "center",
            opacity: texture.opacity ?? 0.6,
            mixBlendMode: texture.blend || "multiply",
            pointerEvents: "none",
          }}
        />
      )}
      {/* primary wordmark */}
      <p
        className={cls(styles.wordmark)}
        style={{ left: 142, top: 183, color: roles.ink }}
        onClick={pick("ink")}
        title={onPickRole ? "Click to recolor main text" : undefined}
      >
        {p.wordmark}<span className={cls(styles.periodSpan)} onClick={pick("accent")} style={{ color: roles.accent }} title={onPickRole ? "Click to recolor accent" : undefined}>{p.period}</span>
      </p>
      {/* italic wordmark */}
      <p
        className={cls(styles.wordmarkItalic)}
        style={{ left: 135, top: 423, color: roles.muted }}
        onClick={pick("muted")}
        title={onPickRole ? "Click to recolor subtext" : undefined}
      >
        {p.wordmark}<span className={cls(styles.periodSpan)} onClick={pick("accent")} style={{ color: roles.accent }}>{p.period}</span>
      </p>
      {/* small initial italic */}
      <p
        className={cls(styles.smallW)}
        style={{ left: 1228, top: 236, color: roles.ink }}
        onClick={pick("ink")}
      >
        {p.initial}<span className={cls(styles.periodSpan)} onClick={pick("accent")} style={{ color: roles.accent }}>{p.period}</span>
      </p>
      {/* small initial roman */}
      <p
        className={cls(styles.smallWRoman)}
        style={{ left: 1484, top: 236, color: roles.muted }}
        onClick={pick("muted")}
      >
        {p.initial}<span className={cls(styles.periodSpan)} onClick={pick("accent")} style={{ color: roles.accent }}>{p.period}</span>
      </p>
      {/* tagline */}
      <p
        className={cls(styles.tagline)}
        style={{ left: 142, top: 676, color: roles.ink }}
        onClick={pick("ink")}
        title={onPickRole ? "Click to recolor main text" : undefined}
      >
        {p.tagline}
      </p>
      {/* body */}
      <p
        className={cls(styles.body)}
        style={{ left: 142, top: 770, color: roles.muted }}
        onClick={pick("muted")}
        title={onPickRole ? "Click to recolor subtext" : undefined}
      >
        {p.body}
      </p>
      {/* swatch row */}
      <div className={styles.swatchRow} style={{ left: 1228, top: 540 }}>
        {palette.map((hex, i) => (
          <span key={i} className={styles.swatch} style={{ backgroundColor: hex }} />
        ))}
      </div>
      {/* gradient 1 */}
      <div
        className={styles.gradientBar}
        style={{
          left: 1228,
          top: 629,
          backgroundImage: roles.gradient1,
        }}
      />
      {/* gradient 2 */}
      <div
        className={styles.gradientBar}
        style={{
          left: 1228,
          top: 725,
          backgroundImage: roles.gradient2,
        }}
      />
    </FigmaFrame>
  );
}

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

function mapRoles(palette, variant) {
  if (palette.length === 0) {
    return { bg: "#fff", ink: "#000", muted: "#666", accent: "#888",
      gradient1: "none", gradient2: "none" };
  }
  // Sort by luminance ascending: darkest first, lightest last.
  const lum = (hex) => {
    const h = hex.replace("#", "");
    const r = parseInt(h.slice(0, 2), 16) / 255;
    const g = parseInt(h.slice(2, 4), 16) / 255;
    const b = parseInt(h.slice(4, 6), 16) / 255;
    return 0.2126 * r + 0.7152 * g + 0.0722 * b;
  };
  const sorted = palette.slice().sort((a, b) => lum(a) - lum(b));
  const darkest = sorted[0];
  const lightest = sorted[sorted.length - 1];
  const mids = sorted.slice(1, -1);

  const isDark = variant === "dark";
  const bg = isDark ? darkest : lightest;
  const ink = isDark ? lightest : darkest;
  // accent: most vivid mid (highest chroma). Fall back to opposite.
  const accent = mids.length ? mostVivid(mids) : ink;
  const muted = mids.length ? mids[Math.floor(mids.length / 2)] : accent;

  // Gradients use the palette's full spread
  const gradient1 = `linear-gradient(135deg, ${sorted.join(", ")})`;
  const gradient2 = `linear-gradient(90deg, ${sorted.slice().reverse().join(", ")})`;

  return { bg, ink, muted, accent, gradient1, gradient2 };
}

function mostVivid(hexes) {
  let best = hexes[0];
  let bestSat = -1;
  for (const hex of hexes) {
    const sat = saturation(hex);
    if (sat > bestSat) {
      bestSat = sat;
      best = hex;
    }
  }
  return best;
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
