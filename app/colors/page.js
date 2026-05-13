"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import palette from "../../data/palette.json";
import { useStarred } from "../../lib/useStarred";
import styles from "./page.module.css";

export default function ColorsPage() {
  const [hovered, setHovered] = useState(null);
  const [moodboardPool, setMoodboardPool] = useState({ palette: [], sourceMap: {}, loaded: false });
  const { isStarred, toggleStar, starred, hydrated: starsHydrated } = useStarred();

  // The 20 curated rows you hand-grouped in the Figma file.
  const curatedRows = Object.entries(palette.inspiration.curated || {});

  // Brand row — the 7 Whelm brand swatches.
  const brandSwatches = Object.entries(palette.brand);

  useEffect(() => {
    let cancelled = false;
    fetch("/api/library/palette", { cache: "no-store" })
      .then((r) => (r.ok ? r.json() : null))
      .then((data) => {
        if (cancelled || !data) return;
        setMoodboardPool({ ...data, loaded: true });
      })
      .catch(() => setMoodboardPool((p) => ({ ...p, loaded: true })));
    return () => { cancelled = true; };
  }, []);

  const copyHex = (hex) => navigator.clipboard?.writeText(hex);

  const starredHexes = [...starred];

  return (
    <div className={styles.page}>
      <header className={styles.bar}>
        <Link href="/" className={styles.back}>← Moodbuilder</Link>
        <div className={styles.barTitle}>Colors</div>
        <div className={styles.barMeta}>
          <span>★ {starred.size} starred</span>
          <span className={styles.dot}>·</span>
          <span>{curatedRows.length} curated rows</span>
          <span className={styles.dot}>·</span>
          <span>{moodboardPool.palette.length} from pins</span>
        </div>
      </header>

      <section className={styles.section}>
        <header className={styles.sectionHeader}>
          <h2 className={styles.sectionTitle}>
            ★ Starred <span className={styles.sectionCount}>{starred.size}</span>
          </h2>
          <p className={styles.sectionHint}>
            Your curated, growing set. Seeded with the 30 hand-pulled Figma swatches. Star any color anywhere on this page to add it; unstar to remove.{" "}
            Powers the <Link href="/brand" className={styles.inlineLink}>Brand</Link> page's <em>Starred</em> shuffle pool — the highest-signal source for shipping palettes.
          </p>
        </header>
        {starsHydrated && starredHexes.length === 0 ? (
          <p className={styles.empty}>Nothing starred yet.</p>
        ) : (
          <div className={styles.moodboardGrid}>
            {starredHexes.map((hex, i) => (
              <Swatch
                key={`${hex}-${i}`}
                hex={hex}
                label="starred"
                isStarred={isStarred(hex)}
                toggleStar={toggleStar}
                onHover={() => setHovered({ hex, label: "starred" })}
                onLeave={() => setHovered(null)}
                onClick={() => copyHex(hex)}
                size="md"
              />
            ))}
          </div>
        )}
      </section>

      <section className={styles.section}>
        <header className={styles.sectionHeader}>
          <h2 className={styles.sectionTitle}>Whelm brand</h2>
          <p className={styles.sectionHint}>The current Whelm palette — dark, mauve, vivid, lavender, etc.</p>
        </header>
        <div className={styles.rowList}>
          <SwatchRow
            label="Brand"
            hexes={brandSwatches.map(([, h]) => h)}
            isStarred={isStarred}
            toggleStar={toggleStar}
            onHover={(h) => setHovered({ hex: h, label: "Whelm brand" })}
            onLeave={() => setHovered(null)}
            onClick={copyHex}
          />
        </div>
      </section>

      <section className={styles.section}>
        <header className={styles.sectionHeader}>
          <h2 className={styles.sectionTitle}>Curated pairings</h2>
          <p className={styles.sectionHint}>
            Hand-grouped sets you pulled from the inspiration grid. Each row was a deliberate combination.
          </p>
        </header>
        <div className={styles.rowList}>
          {curatedRows.map(([groupName, hexes], i) => (
            <SwatchRow
              key={groupName}
              label={`Row ${i + 1}`}
              hexes={hexes}
              isStarred={isStarred}
              toggleStar={toggleStar}
              onHover={(h) => setHovered({ hex: h, label: `Curated row ${i + 1}` })}
              onLeave={() => setHovered(null)}
              onClick={copyHex}
            />
          ))}
        </div>
      </section>

      <section className={styles.section}>
        <header className={styles.sectionHeader}>
          <h2 className={styles.sectionTitle}>From your pins</h2>
          <p className={styles.sectionHint}>
            Colors extracted from your Pinterest moodboard.{" "}
            {moodboardPool.palette.length === 0 ? (
              <>
                Empty so far —{" "}
                <Link href="/library" className={styles.inlineLink}>extract palettes in the library</Link>{" "}
                to fill this section.
              </>
            ) : (
              <>
                Each color is the top-4 dominant of a pin you saved. Hover to see which pin it came from.
              </>
            )}
          </p>
        </header>
        {moodboardPool.palette.length > 0 && (
          <div className={styles.moodboardGrid}>
            {moodboardPool.palette.map((hex, i) => {
              const sourcePins = moodboardPool.sourceMap?.[hex] || [];
              const label = `From ${sourcePins.length} pin${sourcePins.length === 1 ? "" : "s"}`;
              return (
                <Swatch
                  key={`${hex}-${i}`}
                  hex={hex}
                  label={label}
                  isStarred={isStarred(hex)}
                  toggleStar={toggleStar}
                  onHover={() => setHovered({ hex, label })}
                  onLeave={() => setHovered(null)}
                  onClick={() => copyHex(hex)}
                  size="md"
                />
              );
            })}
          </div>
        )}
      </section>

      <div className={styles.readout} aria-live="polite">
        {hovered ? (
          <>
            <span className={styles.chip} style={{ backgroundColor: hovered.hex }} />
            <span className={styles.hex}>{hovered.hex.toUpperCase()}</span>
            <span className={styles.group}>{hovered.label}</span>
          </>
        ) : (
          <span className={styles.hint}>Hover any swatch · click to copy hex</span>
        )}
      </div>
    </div>
  );
}

function SwatchRow({ label, hexes, isStarred, toggleStar, onHover, onLeave, onClick }) {
  return (
    <div className={styles.row}>
      <span className={styles.rowLabel}>{label}</span>
      <div className={styles.rowSwatches}>
        {hexes.map((hex, i) => (
          <Swatch
            key={`${hex}-${i}`}
            hex={hex}
            label={label}
            isStarred={isStarred?.(hex)}
            toggleStar={toggleStar}
            onHover={() => onHover?.(hex)}
            onLeave={() => onLeave?.()}
            onClick={() => onClick?.(hex)}
            size="sm"
          />
        ))}
      </div>
    </div>
  );
}

/**
 * Universal swatch — handles the "click body to copy, click star to
 * toggle-star" pattern without nesting interactives illegally. The body
 * is a div with click handler; the star is a real button that stops
 * propagation. Three sizes: sm (40), md (56), or absolutely-positioned
 * (via `positioned` + style).
 */
function Swatch({
  hex,
  label,
  isStarred,
  toggleStar,
  onHover,
  onLeave,
  onClick,
  size = "md",
  positioned = false,
  style,
}) {
  const sizeClass = positioned
    ? styles.swatchPositioned
    : size === "sm"
    ? styles.swatchSm
    : styles.swatchMd;

  return (
    <div
      className={`${styles.swatchWrap} ${sizeClass}`}
      style={{ backgroundColor: hex, ...style }}
      role="button"
      tabIndex={0}
      onMouseEnter={onHover}
      onMouseLeave={onLeave}
      onClick={onClick}
      onKeyDown={(e) => {
        if (e.key === "Enter" || e.key === " ") {
          e.preventDefault();
          onClick?.();
        }
      }}
      title={`${hex.toUpperCase()} · ${label} · click to copy`}
      aria-label={`${hex} in ${label}`}
    >
      <button
        type="button"
        className={`${styles.starBtn} ${isStarred ? styles.starBtnOn : ""}`}
        onClick={(e) => {
          e.stopPropagation();
          toggleStar?.(hex);
        }}
        title={isStarred ? "Remove from Starred" : "Add to Starred"}
        aria-label={isStarred ? "Unstar" : "Star"}
      >
        {isStarred ? "★" : "☆"}
      </button>
    </div>
  );
}
