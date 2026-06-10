"use client";

/**
 * SPIKE — the "+ on the canvas" loop.
 *
 * Tests ONE rhythm: the board is home base; imagery is already there (your
 * imported pins); the Color zone sits empty with a "+ add color"; clicking it
 * opens a FOCUSED react (the calm one-at-a-time gut loop you loved); the colors
 * you keep gather and then SETTLE into the zone, and you're back on the board.
 *
 * Isolated at /spike-color, wired to nothing real, sample data only, so the
 * feeling is what's under test — not the integration. If it lands, the same
 * loop generalises to "+ add type" and "+ new category".
 */

import { useCallback, useMemo, useState } from "react";
import data from "../../lib/sampleStudio.data.json";
import styles from "./page.module.css";

const ALL = Object.values(data.pins || {}).filter(
  (p) => p.imageDisplay && Array.isArray(p.palette) && p.palette.length,
);
const BOARD_IMAGERY = ALL.slice(0, 6); // your inspiration, already on the board
const DECK = ALL.slice(0, 10); // what you react through
const norm = (h) => h.toLowerCase();

export default function ColorLoopSpike() {
  const [mode, setMode] = useState("board"); // board | react
  const [idx, setIdx] = useState(0);
  const [keptIds, setKeptIds] = useState([]);
  const [zoneColors, setZoneColors] = useState([]); // committed into the Color zone

  // The colors you've gathered = the (deduped) palettes of the pins you kept.
  const gathered = useMemo(() => {
    const seen = new Set();
    const out = [];
    for (const id of keptIds) {
      const pin = DECK.find((p) => p.pinId === id);
      (pin?.palette || []).forEach((h) => {
        if (!seen.has(norm(h))) { seen.add(norm(h)); out.push(h); }
      });
    }
    return out;
  }, [keptIds]);

  const current = DECK[idx] || null;
  const finished = idx >= DECK.length;

  const open = useCallback(() => { setMode("react"); setIdx(0); setKeptIds([]); }, []);
  const keep = useCallback(() => {
    setKeptIds((k) => (current ? [...k, current.pinId] : k));
    setIdx((i) => i + 1);
  }, [current]);
  const pass = useCallback(() => setIdx((i) => i + 1), []);
  const done = useCallback(() => { setZoneColors(gathered); setMode("board"); }, [gathered]);
  const reset = useCallback(() => { setZoneColors([]); setMode("board"); }, []);

  return (
    <div className={styles.page}>
      <header className={styles.bar}>
        <span className={styles.spikeTag}>Spike</span>
        <span className={styles.barNote}>
          The board is home. Add color with a focused react, and watch it settle into its zone.
        </span>
        {zoneColors.length > 0 && (
          <button type="button" className={styles.reset} onClick={reset}>Start over</button>
        )}
      </header>

      {/* ---- THE BOARD (home base) ---- */}
      <div className={styles.board}>
        <section className={styles.zone} style={{ flex: "1.5 1 0" }}>
          <p className={styles.zoneLabel}>Imagery <span className={styles.count}>{BOARD_IMAGERY.length}</span></p>
          <div className={styles.imageryGrid}>
            {BOARD_IMAGERY.map((p) => (
              <figure key={p.pinId} className={styles.imgCell}>
                <img className={styles.img} src={p.imageDisplay} alt={p.alt || p.title || "Inspiration"} draggable={false} />
              </figure>
            ))}
          </div>
        </section>

        <section className={styles.zone} style={{ flex: "1 1 0" }}>
          <p className={styles.zoneLabel}>
            Color {zoneColors.length > 0 && <span className={styles.count}>{zoneColors.length}</span>}
          </p>
          <div className={`${styles.zoneBody} ${zoneColors.length === 0 ? styles.zoneEmpty : ""}`}>
            {zoneColors.length === 0 ? (
              <button type="button" className={styles.addBtn} onClick={open}>
                <span className={styles.addPlus} aria-hidden="true">+</span>
                Add color
              </button>
            ) : (
              <div className={styles.swatchGrid}>
                {zoneColors.map((hex, i) => (
                  <span
                    key={`${hex}-${i}`}
                    className={styles.swatch}
                    style={{ background: hex, animationDelay: `${Math.min(i, 24) * 28}ms` }}
                    title={hex.toUpperCase()}
                  />
                ))}
              </div>
            )}
          </div>
        </section>

        {/* the repeatable pattern, hinted */}
        <section className={styles.zone} style={{ flex: "0.8 1 0" }}>
          <p className={styles.zoneLabel}>Type</p>
          <div className={`${styles.zoneBody} ${styles.zoneEmpty}`}>
            <span className={styles.addGhost}>
              <span className={styles.addPlus} aria-hidden="true">+</span>
              Add type
            </span>
          </div>
        </section>
      </div>

      {/* ---- THE FOCUSED REACT (a mode you visit, then return) ---- */}
      {mode === "react" && (
        <div className={styles.overlay} role="dialog" aria-label="Add color by reacting to your inspiration">
          <div className={styles.react}>
            <button type="button" className={styles.reactClose} onClick={() => setMode("board")} aria-label="Back to the board">✕</button>

            {!finished && current ? (
              <>
                <p className={styles.reactPrompt}>Does this feel like your color?</p>
                <figure className={styles.reactFigure}>
                  <img className={styles.reactImg} src={current.imageDisplay} alt={current.alt || current.title || "Inspiration"} draggable={false} />
                  <span className={styles.reactSwatches} aria-hidden="true">
                    {current.palette.slice(0, 7).map((h, i) => (
                      <span key={i} className={styles.reactSwatch} style={{ background: h }} />
                    ))}
                  </span>
                </figure>
                <div className={styles.reactActions}>
                  <button type="button" className={`${styles.reactBtn} ${styles.pass}`} onClick={pass}>Not this</button>
                  <button type="button" className={`${styles.reactBtn} ${styles.keep}`} onClick={keep}>Keep its color</button>
                </div>
                <p className={styles.reactProgress}>{idx + 1} of {DECK.length}</p>
              </>
            ) : (
              <div className={styles.reactDone}>
                <p className={styles.reactPrompt}>That’s your color, gathered.</p>
                <p className={styles.reactDoneSub}>{gathered.length} colors from what you kept.</p>
              </div>
            )}

            <div className={styles.gathered}>
              <span className={styles.gatheredLabel}>Gathering <span className={styles.count}>{gathered.length}</span></span>
              <div className={styles.gatheredStrip}>
                {gathered.map((hex, i) => (
                  <span key={`${hex}-${i}`} className={styles.gatheredSwatch} style={{ background: hex }} title={hex.toUpperCase()} />
                ))}
              </div>
              <button
                type="button"
                className={styles.addToBoard}
                onClick={done}
                disabled={gathered.length === 0}
              >
                {gathered.length === 0 ? "Keep a few first" : `Add ${gathered.length} to your board →`}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
