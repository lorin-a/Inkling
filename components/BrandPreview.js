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
export default function BrandPreview({ palette, variant = "dark" }) {
  const roles = mapRoles(palette, variant);
  return (
    <FigmaFrame width={1920} height={931} background={roles.bg}>
      {/* primary wordmark */}
      <p
        className={styles.wordmark}
        style={{ left: 142, top: 183, color: roles.ink }}
      >
        whelm<span style={{ color: roles.accent }}>.</span>
      </p>
      {/* italic wordmark */}
      <p
        className={styles.wordmarkItalic}
        style={{ left: 135, top: 423, color: roles.muted }}
      >
        whelm<span style={{ color: roles.accent }}>.</span>
      </p>
      {/* small w italic */}
      <p
        className={styles.smallW}
        style={{ left: 1228, top: 236, color: roles.ink }}
      >
        w<span style={{ color: roles.accent }}>.</span>
      </p>
      {/* small w roman */}
      <p
        className={styles.smallWRoman}
        style={{ left: 1484, top: 236, color: roles.muted }}
      >
        w<span style={{ color: roles.accent }}>.</span>
      </p>
      {/* tagline */}
      <p
        className={styles.tagline}
        style={{ left: 142, top: 676, color: roles.ink }}
      >
        Find your way to feeling
      </p>
      {/* body */}
      <p
        className={styles.body}
        style={{ left: 142, top: 770, color: roles.muted }}
      >
        A ritual for cultivating a relationship with your intuition
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
