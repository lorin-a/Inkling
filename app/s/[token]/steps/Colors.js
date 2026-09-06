"use client";

import { useEffect, useMemo, useState } from "react";
import styles from "../studio.module.css";
import { aggregateSpectrum } from "../../../../lib/studio/spectrum";
import { hexToRgb, oklchFromHex } from "../../../../lib/colorTheory";
import { colorName } from "../../../../lib/nameThatColor";
import { groupBox, cardSize } from "../../../../lib/studio/geometry";

/**
 * Step 6. The colors pulled out of what survived, as cards. Watchable: the
 * strips appear on each card first, then the pooled colors arrive. Every
 * color card opens into hex, RGB, HSL and OKLCH, each one a click to copy.
 */
export default function Colors({ kept, references, reveal, setCards, colorsPulled, setColorsPulled, log, snapshot, topZ, go }) {
  const source = kept.length ? kept : references;
  const sourceLabel = kept.length ? (reveal ? `the ${kept.length} you both kept` : `your ${kept.length} keeps`) : `all ${references.length} cards (nothing kept yet)`;
  const [revealed, setRevealed] = useState(colorsPulled);
  const [showNeutrals, setShowNeutrals] = useState(false);
  const [openHex, setOpenHex] = useState(null);
  const [copied, setCopied] = useState(null);

  const { bands, total } = useMemo(() => aggregateSpectrum(source), [source]);
  const shown = useMemo(() => {
    const list = showNeutrals ? bands : bands.filter((b) => b.chroma > 0.055);
    return list.slice(0, 24);
  }, [bands, showNeutrals]);

  const pull = () => {
    log("pull_colors", { from: source.length, kept: kept.length > 0 });
    setColorsPulled(true);
    const reduced = window.matchMedia?.("(prefers-reduced-motion: reduce)").matches;
    if (reduced) { setRevealed(true); return; }
    setRevealed("strips");
    setTimeout(() => setRevealed(true), Math.min(source.length * 60, 1800) + 500);
  };
  useEffect(() => { if (colorsPulled && !revealed) setRevealed(true); }, [colorsPulled, revealed]);

  const copy = async (text, key) => {
    try { await navigator.clipboard.writeText(text); setCopied(key); setTimeout(() => setCopied(null), 1400); log("color_copy", { value: text }); } catch { /* the value is selectable */ }
  };

  const addToGroupBoard = () => {
    const picks = shown.slice(0, 8);
    if (!picks.length) return;
    snapshot();
    log("swatches_to_group", { count: picks.length });
    setCards((cs) => {
      const have = new Set(cs.filter((c) => c.kind === "swatch" && c.board === "groups").map((c) => c.hex));
      const fresh = picks.filter((b) => !have.has(b.hex));
      const size = cardSize({ kind: "swatch" }, "groups");
      const F = groupBox(Math.max(kept.length, cs.filter((c) => c.board === "groups" && c.kind === "reference").length)).field;
      const made = fresh.map((b, i) => {
        topZ.current += 1;
        return { id: `sw-${b.hex.slice(1)}-${i}-${Date.now().toString(36)}`, kind: "swatch", hex: b.hex, x: F.x + F.w - size.w - 20, y: F.y + 20 + i * (size.h + 10), rot: 0, board: "groups", pinned: true, z: topZ.current };
      });
      return [...cs, ...made];
    });
    go("group");
  };

  return (
    <div className={`${styles.stepBody} ${styles.stepPad}`}>
      <div className={styles.toolbar}>
        {!revealed && <button type="button" className={styles.action} onClick={pull} disabled={!source.length}>Pull the colors out of {sourceLabel}</button>}
        {revealed === true && (
          <>
            <button type="button" className={styles.quiet} onClick={() => setShowNeutrals((v) => !v)} aria-pressed={showNeutrals}>{showNeutrals ? "Hide neutrals" : "Show neutrals"}</button>
            <button type="button" className={styles.quiet} onClick={addToGroupBoard} disabled={!shown.length}>Add the top {Math.min(8, shown.length)} to the Group board</button>
            <span className={styles.toolbarNote}>{total.toLocaleString()} colors from {sourceLabel}. Widest first: the ones you keep reaching for.</span>
          </>
        )}
      </div>

      <div className={styles.colorsScroll}>
        <div className={styles.sourceGrid} aria-label="The cards these colors came from">
          {source.map((c, i) => (
            <figure key={c.id} className={styles.sourceCard}>
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={c.src} alt={c.alt} loading="lazy" />
              <span className={`${styles.strip} ${revealed ? styles.stripIn : ""}`} aria-hidden="true" style={{ transitionDelay: `${Math.min(i * 60, 1800)}ms` }}>
                {(c.palette || []).slice(0, 6).map((hex, j) => <i key={hex + j} style={{ background: hex, transitionDelay: `${Math.min(i * 60, 1800) + j * 40}ms` }} />)}
              </span>
            </figure>
          ))}
        </div>

        {revealed === true && (
          <>
            <div className={styles.spectrumBar} role="img" aria-label="The pooled spectrum, widest bands first">
              {bands.slice(0, 20).map((b, i) => <span key={b.hex} className={styles.band} style={{ background: b.hex, flexGrow: b.count, animationDelay: `${i * 40}ms` }} title={`${b.hex} in ${b.count} of ${total}`} />)}
            </div>

            <ul className={styles.colorGrid} aria-label="Color cards">
              {shown.map((b, i) => {
                const rgb = hexToRgb(b.hex);
                const lch = oklchFromHex(b.hex);
                const hsl = toHsl(rgb);
                const name = colorName(b.hex).name || "";
                const open = openHex === b.hex;
                const rows = [
                  ["HEX", b.hex.toUpperCase()],
                  ["RGB", `rgb(${rgb.r}, ${rgb.g}, ${rgb.b})`],
                  ["HSL", `hsl(${hsl.h}, ${hsl.s}%, ${hsl.l}%)`],
                  ["OKLCH", `oklch(${(lch.L * 100).toFixed(1)}% ${lch.C.toFixed(3)} ${lch.h.toFixed(1)})`],
                ];
                return (
                  <li key={b.hex} className={`${styles.colorCard} ${open ? styles.colorCardOpen : ""}`} style={{ animationDelay: `${i * 35}ms` }}>
                    <button type="button" className={styles.colorFace} onClick={() => setOpenHex(open ? null : b.hex)} aria-expanded={open}>
                      <span className={styles.colorSwatch} style={{ background: b.hex }} />
                      <span className={styles.colorMeta}>
                        <span className={styles.colorName}>{name}</span>
                        <span className={styles.colorHex}>{b.hex.toUpperCase()}</span>
                        <span className={styles.colorCount}>in {b.count} of {total}</span>
                      </span>
                    </button>
                    {open && (
                      <dl className={styles.codes}>
                        {rows.map(([k, v]) => (
                          <div key={k} className={styles.codeRow}>
                            <dt>{k}</dt>
                            <dd><code>{v}</code></dd>
                            <button type="button" className={styles.copyBtn} onClick={() => copy(v, `${b.hex}-${k}`)}>{copied === `${b.hex}-${k}` ? "Copied" : "Copy"}</button>
                          </div>
                        ))}
                      </dl>
                    )}
                  </li>
                );
              })}
            </ul>
          </>
        )}
      </div>
    </div>
  );
}

function toHsl({ r, g, b }) {
  const R = r / 255; const G = g / 255; const B = b / 255;
  const max = Math.max(R, G, B); const min = Math.min(R, G, B);
  const l = (max + min) / 2;
  if (max === min) return { h: 0, s: 0, l: Math.round(l * 100) };
  const d = max - min;
  const s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
  let h;
  if (max === R) h = (G - B) / d + (G < B ? 6 : 0);
  else if (max === G) h = (B - R) / d + 2;
  else h = (R - G) / d + 4;
  return { h: Math.round(h * 60), s: Math.round(s * 100), l: Math.round(l * 100) };
}
