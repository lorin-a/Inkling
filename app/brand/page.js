"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { usePalette } from "../../lib/usePalette";
import { POOLS, POOL_LABELS } from "../../lib/palettePool";
import BrandPreview from "../../components/BrandPreview";
import MarksFrame from "../../components/MarksFrame";
import styles from "./page.module.css";

export default function BrandPage() {
  const {
    palette,
    setSlot,
    size,
    setSize,
    locks,
    toggleLock,
    poolKey,
    setPoolKey,
    shuffle,
    stepHistory,
    canUndo,
    canRedo,
    favorites,
    favorite,
    removeFavorite,
    loadFavorite,
  } = usePalette({ initialSize: 5, initialPoolKey: "inspiration" });

  const [picker, setPicker] = useState(null);

  // Keyboard
  useEffect(() => {
    const onKey = (e) => {
      const target = e.target;
      if (target instanceof HTMLInputElement || target instanceof HTMLTextAreaElement) return;
      if (e.code === "Space") {
        e.preventDefault();
        shuffle();
      } else if (e.key === "ArrowLeft" && canUndo) {
        e.preventDefault();
        stepHistory(-1);
      } else if (e.key === "ArrowRight" && canRedo) {
        e.preventDefault();
        stepHistory(1);
      } else if (e.key === "f" || e.key === "F") {
        e.preventDefault();
        favorite();
      } else if ((e.metaKey || e.ctrlKey) && e.key === "z") {
        e.preventDefault();
        if (e.shiftKey && canRedo) stepHistory(1);
        else if (canUndo) stepHistory(-1);
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [shuffle, stepHistory, canUndo, canRedo, favorite]);

  return (
    <div className={styles.page}>
      <header className={styles.bar}>
        <Link href="/" className={styles.back}>← Moodbuilder</Link>
        <div className={styles.barTitle}>Brand</div>

        <div className={styles.controls}>
          <label className={styles.control}>
            <span className={styles.controlLabel}>Pool</span>
            <select
              value={poolKey}
              onChange={(e) => setPoolKey(e.target.value)}
              className={styles.select}
            >
              {Object.entries(POOL_LABELS).map(([k, label]) => (
                <option key={k} value={k}>{label}</option>
              ))}
            </select>
          </label>

          <label className={styles.control}>
            <span className={styles.controlLabel}>
              Colors <span className={styles.value}>{size}</span>
            </span>
            <input
              type="range"
              min="2"
              max="10"
              value={size}
              onChange={(e) => setSize(Number(e.target.value))}
              className={styles.range}
            />
          </label>

          <button
            type="button"
            className={`${styles.btn} ${styles.btnGhost}`}
            onClick={() => stepHistory(-1)}
            disabled={!canUndo}
            title="Step back (←)"
          >
            ←
          </button>
          <button
            type="button"
            className={`${styles.btn} ${styles.btnGhost}`}
            onClick={() => stepHistory(1)}
            disabled={!canRedo}
            title="Step forward (→)"
          >
            →
          </button>
          <button
            type="button"
            className={`${styles.btn} ${styles.btnPrimary}`}
            onClick={shuffle}
            title="Shuffle (Space)"
          >
            Shuffle
            <kbd className={styles.kbd}>Space</kbd>
          </button>
          <button
            type="button"
            className={`${styles.btn} ${styles.btnFav}`}
            onClick={() => favorite()}
            title="Save palette (F)"
          >
            ★ Save
          </button>
        </div>
      </header>

      <main className={styles.main}>
        <aside className={styles.rail}>
          <div className={styles.railHeader}>
            <h2 className={styles.railTitle}>Palette</h2>
            <p className={styles.railHint}>Click any slot to lock or replace. Tap a swatch from the pool to apply.</p>
          </div>

          <div className={styles.slots}>
            {palette.map((hex, i) => (
              <div key={i} className={styles.slot}>
                <button
                  type="button"
                  className={`${styles.slotChip} ${locks.has(i) ? styles.slotLocked : ""}`}
                  style={{ backgroundColor: hex }}
                  onClick={() => setPicker(picker === i ? null : i)}
                  title={`${hex.toUpperCase()} — click to pick`}
                  aria-label={`Slot ${i + 1}: ${hex}`}
                />
                <span className={styles.slotHex}>{hex.toUpperCase()}</span>
                <button
                  type="button"
                  className={`${styles.lockBtn} ${locks.has(i) ? styles.lockBtnOn : ""}`}
                  onClick={() => toggleLock(i)}
                  title={locks.has(i) ? "Unlock slot" : "Lock slot"}
                  aria-label={locks.has(i) ? "Unlock" : "Lock"}
                >
                  {locks.has(i) ? "●" : "○"}
                </button>
              </div>
            ))}
          </div>

          {picker !== null && (
            <div className={styles.picker}>
              <div className={styles.pickerHeader}>
                <span>Replace slot {picker + 1}</span>
                <button type="button" onClick={() => setPicker(null)} className={styles.pickerClose}>×</button>
              </div>
              <div className={styles.pickerGrid}>
                {POOLS[poolKey].map((hex, i) => (
                  <button
                    key={`${hex}-${i}`}
                    type="button"
                    className={styles.pickerSwatch}
                    style={{ backgroundColor: hex }}
                    onClick={() => { setSlot(picker, hex); setPicker(null); }}
                    title={hex}
                    aria-label={hex}
                  />
                ))}
              </div>
            </div>
          )}

          <div className={styles.favorites}>
            <h2 className={styles.railTitle}>
              Saved
              <span className={styles.railCount}>{favorites.length}</span>
            </h2>
            {favorites.length === 0 && (
              <p className={styles.railEmpty}>None yet. Press F or ★ Save to keep one.</p>
            )}
            <div className={styles.favList}>
              {favorites.map((f) => (
                <div key={f.id} className={styles.favItem}>
                  <button
                    type="button"
                    className={styles.favPalette}
                    onClick={() => loadFavorite(f.id)}
                    aria-label={`Load ${f.name}`}
                  >
                    {f.palette.map((h, i) => (
                      <span key={i} className={styles.favSwatch} style={{ backgroundColor: h }} />
                    ))}
                  </button>
                  <button
                    type="button"
                    className={styles.favRemove}
                    onClick={() => removeFavorite(f.id)}
                    aria-label="Remove"
                  >
                    ×
                  </button>
                </div>
              ))}
            </div>
          </div>
        </aside>

        <section className={styles.canvas}>
          <div className={styles.variant}>
            <span className={styles.variantLabel}>Dark</span>
            <BrandPreview palette={palette} variant="dark" />
          </div>
          <div className={styles.variant}>
            <span className={styles.variantLabel}>Light</span>
            <BrandPreview palette={palette} variant="light" />
          </div>
          <MarksFrame palette={palette} />
        </section>
      </main>
    </div>
  );
}
