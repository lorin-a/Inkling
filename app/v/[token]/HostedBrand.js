"use client";

import { useMemo } from "react";
import BrandPreview from "@/components/BrandPreview";
import InlineMark from "@/components/InlineMark";
import styles from "./HostedBrand.module.css";

function relativeLuminance(hex) {
  if (!hex || typeof hex !== "string") return 0;
  const h = hex.replace("#", "");
  if (h.length !== 6) return 0;
  const [r, g, b] = [0, 2, 4].map((i) => {
    const v = parseInt(h.slice(i, i + 2), 16) / 255;
    return v <= 0.03928 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4);
  });
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
}

function pickInitialPalette(starred, count = 5) {
  if (!Array.isArray(starred) || starred.length === 0) {
    return ["#1a1a1a", "#f5f5f5", "#8a8a8a", "#cfcfcf", "#3d3d3d"];
  }
  const out = starred.slice(0, count);
  while (out.length < count) out.push(starred[out.length % starred.length]);
  return out.map((h) => (h.startsWith("#") ? h : `#${h}`));
}

export default function HostedBrand({ token, audience, voteUnit, project, library, marks, presets }) {
  const starred = Array.isArray(library?.starred) ? library.starred : [];
  const palette = useMemo(() => pickInitialPalette(starred, 5), [starred]);
  const poolSwatches = useMemo(() => {
    const seen = new Set();
    const out = [];
    for (const hex of starred) {
      const norm = (hex.startsWith("#") ? hex : `#${hex}`).toLowerCase();
      if (seen.has(norm)) continue;
      seen.add(norm);
      out.push(norm);
    }
    return out;
  }, [starred]);

  const projectName = project?.name || "Untitled project";

  return (
    <div className={styles.page}>
      <header className={styles.bar}>
        <div className={styles.barLeft}>
          <span className={styles.brand}>moodbuilder</span>
          <span className={styles.dot} aria-hidden="true">·</span>
          <h1 className={styles.barTitle}>{projectName}</h1>
        </div>
        <div className={styles.barRight}>
          <span className={styles.meta}>{audience === "private" ? "private" : "public"}</span>
          <span className={styles.dot} aria-hidden="true">·</span>
          <span className={styles.meta}>{voteUnit === "element" ? "element vote" : "preset vote"}</span>
        </div>
      </header>

      <main className={styles.main}>
        <section className={styles.intro}>
          <p className={styles.introCopy}>
            A preview of {projectName}’s brand identity. Voting opens here soon.
          </p>
        </section>

        <section className={styles.previewStack}>
          <div className={styles.variant}>
            <span className={styles.variantLabel}>Dark</span>
            <BrandPreview palette={palette} variant="dark" project={project} />
          </div>
          <div className={styles.variant} data-variant="light">
            <span className={`${styles.variantLabel} ${styles.variantLabelInk}`}>Light</span>
            <BrandPreview palette={palette} variant="light" project={project} />
          </div>
        </section>

        {poolSwatches.length > 0 && (
          <section className={styles.block}>
            <header className={styles.blockHeader}>
              <h2 className={styles.blockTitle}>Palette pool</h2>
              <p className={styles.blockHint}>
                {poolSwatches.length} {poolSwatches.length === 1 ? "color" : "colors"} the team has saved so far.
              </p>
            </header>
            <ul className={styles.swatchGrid}>
              {poolSwatches.map((hex) => (
                <li key={hex} className={styles.swatchItem}>
                  <span className={styles.swatch} style={{ background: hex }} />
                  <code className={styles.swatchHex}>{hex.toUpperCase()}</code>
                </li>
              ))}
            </ul>
          </section>
        )}

        {marks.length > 0 && (
          <section className={styles.block}>
            <header className={styles.blockHeader}>
              <h2 className={styles.blockTitle}>Marks</h2>
              <p className={styles.blockHint}>
                {marks.length} hand-drawn {marks.length === 1 ? "mark" : "marks"} in the kit. Recolored to the dark variant’s palette.
              </p>
            </header>
            <ul className={styles.marksGrid}>
              {marks.map((m) => (
                <li key={m.name} className={styles.markCell}>
                  <InlineMark
                    svg={m.svg}
                    width={140}
                    height={140}
                    palette={palette}
                  />
                  <span className={styles.markName}>{m.name}</span>
                </li>
              ))}
            </ul>
          </section>
        )}

        {presets.length > 0 && (
          <section className={styles.block}>
            <header className={styles.blockHeader}>
              <h2 className={styles.blockTitle}>Saved presets</h2>
              <p className={styles.blockHint}>
                {presets.length} {presets.length === 1 ? "preset" : "presets"} the team has captured.
              </p>
            </header>
            <ul className={styles.presetList}>
              {presets.map((p) => (
                <li key={p.id} className={styles.presetItem}>
                  <div className={styles.presetSwatches}>
                    {(p.palette || []).slice(0, 8).map((hex, i) => (
                      <span key={i} className={styles.presetSwatch} style={{ background: hex }} />
                    ))}
                  </div>
                  <span className={styles.presetName}>{p.name}</span>
                </li>
              ))}
            </ul>
          </section>
        )}

        <footer className={styles.foot}>
          <code className={styles.footToken}>v/{token}</code>
        </footer>
      </main>
    </div>
  );
}
