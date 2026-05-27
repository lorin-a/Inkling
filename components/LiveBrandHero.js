"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { composePalette } from "../lib/composePalette";
import { derivePreviewRoles } from "../lib/derivePreviewRoles";
import { SAMPLE_PALETTE, SAMPLE_PROJECT } from "../lib/sampleStudio";
import styles from "./LiveBrandHero.module.css";

/**
 * The home-page hero, but it’s the actual tool running: a live brand
 * composition that recomposes "Your Brand" from the sample board’s
 * color pool using the exact engine the /brand page uses
 * (composePalette → derivePreviewRoles). It auto-shuffles on a gentle
 * interval so the page is never static, and Shuffle recomposes on
 * demand. Motion is suppressed under prefers-reduced-motion (the panel
 * holds a single composed palette; the button still works).
 *
 * Seeded from the sample studio so it’s self-contained and always
 * available regardless of auth state — the hero’s job is to show what
 * the tool does, not to mirror a specific project.
 */
const AUTO_INTERVAL = 4200;

export default function LiveBrandHero() {
  const pool = useMemo(() => {
    const src = SAMPLE_PALETTE?.inspiration?.source;
    return Array.isArray(src) && src.length >= 6 ? src : null;
  }, []);

  // Deterministic seed so server and first client render match (composePalette
  // uses Math.random, which would otherwise cause a hydration mismatch). Real
  // composition starts after mount.
  const seed = useMemo(() => {
    const b = SAMPLE_PALETTE?.brand;
    return b ? [b.bg, b.ink, b.accent, b.muted].filter(Boolean) : ["#f4efe7", "#1a1714", "#7c3a2d", "#6b6259"];
  }, []);

  const compose = useCallback(() => {
    if (!pool) return seed;
    return composePalette({ pool, size: 5 }) || pool.slice(0, 5);
  }, [pool, seed]);

  const [palette, setPalette] = useState(seed);
  const [animKey, setAnimKey] = useState(0);

  const reshuffle = useCallback(() => {
    setPalette(compose());
    setAnimKey((k) => k + 1);
  }, [compose]);

  // After mount: compose a first palette, then auto-cycle. Both are paused
  // under reduced-motion (the panel holds the deterministic seed — a clean
  // composed look — and the Shuffle button still works on demand).
  const timer = useRef(null);
  useEffect(() => {
    const mq = window.matchMedia("(prefers-reduced-motion: reduce)");
    if (mq.matches) return undefined;

    reshuffle();
    const tick = () => {
      if (!document.hidden) reshuffle();
    };
    timer.current = window.setInterval(tick, AUTO_INTERVAL);
    return () => window.clearInterval(timer.current);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Dark variant: the composition engine’s strongest showing (dark bg, vivid
  // accent that reliably clears contrast) and the more striking hero.
  const roles = derivePreviewRoles(palette, "dark", { sourceKind: "composed" });
  const p = SAMPLE_PROJECT;

  return (
    <figure
      className={styles.panel}
      style={{ background: roles.bg, color: roles.ink }}
      aria-label="A live brand composition from a sample mood board"
    >
      <div className={styles.topRow}>
        <span className={styles.tag} style={{ borderColor: hairlineOn(roles.ink), color: roles.muted }}>
          Live composition
        </span>
        <button
          type="button"
          className={styles.shuffle}
          style={{ borderColor: hairlineOn(roles.ink), color: roles.ink }}
          onClick={reshuffle}
        >
          <span className={styles.shuffleGlyph} aria-hidden="true">⟳</span>
          Shuffle
        </button>
      </div>

      <div key={animKey} className={styles.lockup}>
        <span className={styles.wordmark}>
          {p.wordmark}
          <span style={{ color: roles.accent }}>{p.period}</span>
        </span>
        <span className={styles.tagline} style={{ color: roles.muted }}>
          {p.tagline}
        </span>
      </div>

      <div className={styles.chips} aria-hidden="true">
        {palette.map((hex, i) => (
          <span key={`${hex}-${i}`} className={styles.chip} style={{ background: hex }} />
        ))}
      </div>
    </figure>
  );
}

/** A hairline tuned to the composed ink so borders read on any bg. */
function hairlineOn(ink) {
  return ink ? `color-mix(in oklab, ${ink} 22%, transparent)` : "rgba(0,0,0,0.18)";
}
