"use client";

import { derivePreviewRoles } from "../lib/derivePreviewRoles";
import styles from "./MiniBrandPreview.module.css";

/**
 * Compact brand preview for /colors palette rows. Shows the active
 * project's wordmark + tagline rendered with the candidate palette's
 * derived roles (bg / ink / accent / muted). The whole point of the
 * /colors training surface — evaluate palettes as brands, not as
 * abstract swatch rows.
 *
 * Variant controls whether we render the dark or light version; the
 * row layout shows both side-by-side so the user can rate the pair.
 */
export default function MiniBrandPreview({ palette, project, variant = "dark", sourceKind = "composed", swapPrimary = false }) {
  if (!palette || palette.length === 0) {
    return <div className={styles.mini} style={{ background: "#f4f4f5", color: "#999" }}>—</div>;
  }
  const roles = derivePreviewRoles(palette, variant, { sourceKind, swapPrimary });
  const wordmark = project?.wordmark || "wordmark";
  const period = project?.period || ".";
  const tagline = project?.tagline || "tagline";

  return (
    <div
      className={styles.mini}
      style={{ background: roles.bg, color: roles.ink }}
      data-variant={variant}
    >
      <span className={styles.wordmark}>
        {wordmark}
        <span style={{ color: roles.accent }}>{period}</span>
      </span>
      <span className={styles.tagline} style={{ color: roles.muted }}>
        {tagline}
      </span>
    </div>
  );
}
