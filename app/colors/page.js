"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useStarred } from "../../lib/useStarred";
import { useProject } from "../../lib/useProject";
import { useAuthed } from "../../lib/api/useAuthed";
import { apiFetch } from "../../lib/api/client";
import ProjectSwitcher from "../../components/ProjectSwitcher";
import MiniBrandPreview from "../../components/MiniBrandPreview";
import PathFooter from "../../components/PathFooter";
import styles from "./page.module.css";

export default function ColorsPage() {
  const { project } = useProject();
  const authed = useAuthed();
  const isSample = authed === false; // signed-out playground loads the sample studio
  const [hovered, setHovered] = useState(null);
  const [moodboardPool, setMoodboardPool] = useState({ palette: [], sourceMap: {}, loaded: false });
  const [brandSwatches, setBrandSwatches] = useState([]);
  const [curatedRows, setCuratedRows] = useState([]);
  const [pinPalettes, setPinPalettes] = useState([]);
  const [starredPaletteIds, setStarredPaletteIds] = useState(new Set());
  const [sortMode, setSortMode] = useState("unrated"); // "unrated" | "recent" | "starred"
  const { isStarred, toggleStar, starred, hydrated: starsHydrated } = useStarred();

  const refresh = useCallback(() => {
    apiFetch("/api/library/palette", { cache: "no-store" })
      .then((r) => (r.ok ? r.json() : null))
      .then((data) => {
        if (!data) return;
        setMoodboardPool({ ...data, loaded: true });
        setBrandSwatches(data.brandEntries || []);
        setCuratedRows(Object.entries(data.curated || {}));
        setPinPalettes(data.pinPalettes || []);
        setStarredPaletteIds(new Set(data.starredPalettes || []));
      })
      .catch(() => setMoodboardPool((p) => ({ ...p, loaded: true })));
  }, []);

  useEffect(() => { refresh(); }, [refresh]);

  const togglePaletteStar = useCallback(async (pinId) => {
    const currentlyStarred = starredPaletteIds.has(pinId);
    // Optimistic update.
    setStarredPaletteIds((prev) => {
      const next = new Set(prev);
      if (currentlyStarred) next.delete(pinId);
      else next.add(pinId);
      return next;
    });
    try {
      await apiFetch("/api/library/star-palette", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ pinId, starred: !currentlyStarred }),
      });
    } catch {
      refresh();
    }
  }, [starredPaletteIds, refresh]);

  // Sort + partition: top picks (starred) always render first; everything
  // else respects the user's sortMode.
  const { topPicks, restPalettes } = useMemo(() => {
    const starredList = [];
    const restList = [];
    for (const p of pinPalettes) {
      if (starredPaletteIds.has(p.pinId)) starredList.push(p);
      else restList.push(p);
    }
    if (sortMode === "recent") {
      restList.sort((a, b) => (b.addedAt || "").localeCompare(a.addedAt || ""));
    } else if (sortMode === "unrated") {
      // unrated is just "not yet starred" — they're already in restList.
      // Add a tiny shuffle so each visit isn't identical.
      restList.sort((a, b) => (b.addedAt || "").localeCompare(a.addedAt || ""));
    }
    return { topPicks: starredList, restPalettes: restList };
  }, [pinPalettes, starredPaletteIds, sortMode]);

  const surpriseMe = useCallback(() => {
    if (restPalettes.length === 0) return;
    const pick = restPalettes[Math.floor(Math.random() * restPalettes.length)];
    const el = document.getElementById(`palette-${pick.pinId}`);
    if (el) el.scrollIntoView({ behavior: "smooth", block: "center" });
  }, [restPalettes]);

  const copyHex = (hex) => navigator.clipboard?.writeText(hex);

  const starredHexes = [...starred];

  return (
    <div className={styles.page}>
      <header className={styles.bar}>
        <Link href="/" className={styles.back}>← Moodbuilder</Link>
        <ProjectSwitcher />
        <div className={styles.barTitle}>Colors</div>
      </header>

      {pinPalettes.length > 0 && (
        <section className={styles.section}>
          <header className={styles.sectionHeader}>
            <h2 className={styles.sectionTitle}>
              ▲ Top picks <span className={styles.sectionCount}>{topPicks.length}</span>
            </h2>
            <p className={styles.sectionHint}>
              Palettes you've rated as a yes. The <Link href="/brand" className={styles.inlineLink}>Brand</Link> shuffle samples from these first. Add a palette to Top picks below to lift it here.
            </p>
          </header>
          {topPicks.length === 0 ? (
            <p className={styles.empty}>Nothing here yet. Add a palette to Top picks below to start training the shuffle.</p>
          ) : (
            <div className={styles.paletteList}>
              {topPicks.map((p) => (
                <PaletteRow
                  key={p.pinId}
                  entry={p}
                  project={project}
                  isPaletteStarred={true}
                  togglePaletteStar={togglePaletteStar}
                  isHexStarred={isStarred}
                  toggleHexStar={toggleStar}
                  copyHex={copyHex}
                  onHover={(hex) => setHovered({ hex, label: p.sourceDomain || "from pin" })}
                  onLeave={() => setHovered(null)}
                />
              ))}
            </div>
          )}
        </section>
      )}

      {pinPalettes.length > 0 && (
        <section className={styles.section}>
          <header className={styles.sectionHeader}>
            <h2 className={styles.sectionTitle}>
              Palettes from your pins <span className={styles.sectionCount}>{restPalettes.length}</span>
            </h2>
            <p className={styles.sectionHint}>
              Every pin's extracted palette as a unit. Each shows your wordmark rendered with that palette so you can rate it as a brand, not as abstract colors.
            </p>
            <div className={styles.paletteControls}>
              <div className={styles.sortGroup} role="tablist" aria-label="Sort palettes">
                <button
                  type="button"
                  role="tab"
                  aria-selected={sortMode === "unrated"}
                  className={`${styles.sortBtn} ${sortMode === "unrated" ? styles.sortBtnActive : ""}`}
                  onClick={() => setSortMode("unrated")}
                >Unrated</button>
                <button
                  type="button"
                  role="tab"
                  aria-selected={sortMode === "recent"}
                  className={`${styles.sortBtn} ${sortMode === "recent" ? styles.sortBtnActive : ""}`}
                  onClick={() => setSortMode("recent")}
                >Recent</button>
              </div>
              <button
                type="button"
                className={styles.surpriseBtn}
                onClick={surpriseMe}
                title="Jump to a random palette you haven't rated yet"
              >
                Surprise me
              </button>
            </div>
          </header>
          <div className={styles.paletteList}>
            {restPalettes.map((p) => (
              <PaletteRow
                key={p.pinId}
                entry={p}
                project={project}
                isPaletteStarred={false}
                togglePaletteStar={togglePaletteStar}
                isHexStarred={isStarred}
                toggleHexStar={toggleStar}
                copyHex={copyHex}
                onHover={(hex) => setHovered({ hex, label: p.sourceDomain || "from pin" })}
                onLeave={() => setHovered(null)}
              />
            ))}
          </div>
        </section>
      )}

      <section className={styles.section}>
        <header className={styles.sectionHeader}>
          <h2 className={styles.sectionTitle}>
            ★ Saved colors <span className={styles.sectionCount}>{starred.size}</span>
          </h2>
          <p className={styles.sectionHint}>
            {isSample ? (
              <>The sample comes with a few colors saved, so you can see how a set builds. Save any color on this page to add your own. It feeds the <em>Saved colors</em> source on <Link href="/brand" className={styles.inlineLink}>Brand</Link>.</>
            ) : (
              <>Your curated, growing set. Save any color anywhere on this page; it feeds the <em>Saved colors</em> source on <Link href="/brand" className={styles.inlineLink}>Brand</Link>, alongside your Top picks.</>
            )}
          </p>
        </header>
        {starsHydrated && starredHexes.length === 0 ? (
          <p className={styles.empty}>Nothing saved yet.</p>
        ) : (
          <div className={styles.moodboardGrid}>
            {starredHexes.map((hex, i) => (
              <Swatch
                key={`${hex}-${i}`}
                hex={hex}
                label="saved"
                isStarred={isStarred(hex)}
                toggleStar={toggleStar}
                onHover={() => setHovered({ hex, label: "saved" })}
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
          <h2 className={styles.sectionTitle}>Project brand</h2>
          <p className={styles.sectionHint}>
            {isSample ? (
              <>The sample&rsquo;s locked-in identity: what a finished palette looks like. Edit it on <Link href="/brand" className={styles.inlineLink}>Brand</Link> to make it yours.</>
            ) : (
              <>Colors locked in as the identity for this project. Edit them on <Link href="/brand" className={styles.inlineLink}>Brand</Link>.</>
            )}
          </p>
        </header>
        <div className={styles.rowList}>
          <SwatchRow
            label="Brand"
            hexes={brandSwatches.map(([, h]) => h)}
            isStarred={isStarred}
            toggleStar={toggleStar}
            onHover={(h) => setHovered({ hex: h, label: "Project brand" })}
            onLeave={() => setHovered(null)}
            onClick={copyHex}
          />
        </div>
      </section>

      <section className={styles.section}>
        <header className={styles.sectionHeader}>
          <h2 className={styles.sectionTitle}>Curated pairings</h2>
          <p className={styles.sectionHint}>
            Alternatives to the locked brand above: hand-grouped combinations worth trying. Shuffle against any row on its own, without committing to it.
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
            {isSample ? "Colors extracted from the sample board’s pins." : "Colors extracted from the pins you’ve imported."}{" "}
            {moodboardPool.palette.length === 0 ? (
              <>
                Empty so far. Imported images extract automatically. Bring in a Pinterest board or an Are.na channel on <Link href="/import" className={styles.inlineLink}>Import</Link> to fill this.
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

      <PathFooter />

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

function PaletteRow({
  entry,
  project,
  isPaletteStarred,
  togglePaletteStar,
  isHexStarred,
  toggleHexStar,
  copyHex,
  onHover,
  onLeave,
}) {
  const [swapPrimary, setSwapPrimary] = useState(false);
  return (
    <div className={styles.paletteRow} id={`palette-${entry.pinId}`}>
      <a
        href={entry.pinUrl || entry.sourceUrl || "#"}
        target="_blank"
        rel="noopener noreferrer"
        className={styles.paletteThumb}
        title={entry.title || "Open source"}
      >
        {entry.thumbnail ? (
          <img src={entry.thumbnail} alt={entry.title || ""} loading="lazy" />
        ) : (
          <span className={styles.paletteThumbEmpty}>—</span>
        )}
      </a>

      <div className={styles.paletteSwatches}>
        {entry.palette.map((hex, i) => (
          <button
            key={`${hex}-${i}`}
            type="button"
            className={`${styles.paletteSwatch} ${isHexStarred?.(hex) ? styles.paletteSwatchStarred : ""}`}
            style={{ backgroundColor: hex }}
            onClick={(e) => {
              if (e.shiftKey) toggleHexStar?.(hex);
              else copyHex?.(hex);
            }}
            onMouseEnter={() => onHover?.(hex)}
            onMouseLeave={() => onLeave?.()}
            title={`${hex.toUpperCase()} · click to copy · shift-click to save`}
            aria-label={hex}
          />
        ))}
      </div>

      <div className={styles.palettePreview}>
        <MiniBrandPreview palette={entry.palette} project={project} variant="dark" sourceKind="pin" swapPrimary={swapPrimary} />
        <MiniBrandPreview palette={entry.palette} project={project} variant="light" sourceKind="pin" swapPrimary={swapPrimary} />
        <button
          type="button"
          className={styles.swapBtn}
          onClick={() => setSwapPrimary((s) => !s)}
          title={swapPrimary ? "Restore the engine's bg / ink pick" : "Flip bg and ink if the engine guessed wrong for this palette"}
          aria-label="Swap background and ink"
        >
          ⇄
        </button>
      </div>

      <div className={styles.paletteMeta}>
        {entry.sourceDomain && (
          <a
            href={entry.sourceUrl || entry.pinUrl}
            target="_blank"
            rel="noopener noreferrer"
            className={styles.paletteSource}
            title={entry.sourceUrl || entry.pinUrl}
          >
            via {entry.sourceDomain}
          </a>
        )}
        <button
          type="button"
          className={`${styles.paletteStarBtn} ${isPaletteStarred ? styles.paletteStarBtnOn : ""}`}
          onClick={() => togglePaletteStar(entry.pinId)}
          title={isPaletteStarred ? "In your Top picks. The Brand shuffle samples these first." : "Add to Top picks. The Brand shuffle samples these first."}
          aria-label={isPaletteStarred ? "Remove from Top picks" : "Add to Top picks"}
        >
          {isPaletteStarred ? "▲ Top pick" : "△ Top pick"}
        </button>
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
        title={isStarred ? "Remove from Saved colors" : "Save this color"}
        aria-label={isStarred ? "Remove from saved colors" : "Save color"}
      >
        {isStarred ? "★" : "☆"}
      </button>
    </div>
  );
}
