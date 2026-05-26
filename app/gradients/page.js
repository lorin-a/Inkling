"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { dedupe } from "../../lib/palettePool";
import { apiFetch } from "../../lib/api/client";
import ProjectSwitcher from "../../components/ProjectSwitcher";
import PathFooter from "../../components/PathFooter";
import styles from "./page.module.css";

const TYPES = ["linear", "radial", "conic"];

export default function GradientsPage() {
  const [brandSwatches, setBrandSwatches] = useState([]);
  const [sourcePool, setSourcePool] = useState([]);
  const [moodboardPool, setMoodboardPool] = useState([]);
  const [stops, setStops] = useState([
    { hex: "#1f0536", pos: 0 },
    { hex: "#895fae", pos: 50 },
    { hex: "#bdb7e9", pos: 100 },
  ]);

  useEffect(() => {
    let cancelled = false;
    apiFetch("/api/library/palette", { cache: "no-store" })
      .then((r) => (r.ok ? r.json() : null))
      .then((data) => {
        if (cancelled || !data) return;
        const brand = Array.isArray(data.brand) ? data.brand : [];
        setBrandSwatches(brand);
        setSourcePool(data.sourcePool || []);
        setMoodboardPool(data.palette || []);
        if (brand.length >= 3) {
          setStops([
            { hex: brand[6] || brand[brand.length - 1], pos: 0 },
            { hex: brand[2] || brand[Math.floor(brand.length / 2)], pos: 50 },
            { hex: brand[0], pos: 100 },
          ]);
        }
      })
      .catch(() => {});
    return () => { cancelled = true; };
  }, []);

  const allUnique = useMemo(
    () => dedupe([...brandSwatches, ...sourcePool, ...moodboardPool]),
    [brandSwatches, sourcePool, moodboardPool],
  );
  const [angle, setAngle] = useState(135);
  const [type, setType] = useState("linear");
  const [activeStop, setActiveStop] = useState(0);
  const [copied, setCopied] = useState(false);

  const css = useMemo(() => buildCss(type, angle, stops), [type, angle, stops]);

  function updateStop(i, patch) {
    setStops((prev) => prev.map((s, idx) => (idx === i ? { ...s, ...patch } : s)));
  }
  function addStop() {
    const last = stops[stops.length - 1];
    const newPos = Math.min(100, last.pos + 10);
    setStops((prev) => [...prev, { hex: brandSwatches[0] || allUnique[0] || "#ffffff", pos: newPos }]);
    setActiveStop(stops.length);
  }
  function removeStop(i) {
    if (stops.length <= 2) return;
    setStops((prev) => prev.filter((_, idx) => idx !== i));
    setActiveStop(0);
  }
  async function copyCss() {
    await navigator.clipboard?.writeText(`background: ${css};`);
    setCopied(true);
    setTimeout(() => setCopied(false), 1400);
  }

  return (
    <div className={styles.page}>
      <header className={styles.bar}>
        <Link href="/" className={styles.back}>← Moodbuilder</Link>
        <ProjectSwitcher />
        <div className={styles.barTitle}>Gradients</div>
        <button type="button" className={styles.copyBtn} onClick={copyCss}>
          {copied ? "Copied" : "Copy CSS"}
        </button>
      </header>

      <section className={styles.previewWrap}>
        <div className={styles.preview} style={{ background: css }} />
      </section>

      <section className={styles.controls}>
        <div className={styles.controlGroup}>
          <label className={styles.label}>Type</label>
          <div className={styles.segmented}>
            {TYPES.map((t) => (
              <button
                key={t}
                type="button"
                className={`${styles.segment} ${t === type ? styles.segmentActive : ""}`}
                onClick={() => setType(t)}
              >
                {t}
              </button>
            ))}
          </div>
        </div>

        <div className={styles.controlGroup}>
          <label className={styles.label}>
            {type === "linear" || type === "conic" ? "Angle" : "Position"}
            <span className={styles.value}>{angle}°</span>
          </label>
          <input
            type="range"
            min="0"
            max="360"
            value={angle}
            onChange={(e) => setAngle(Number(e.target.value))}
            className={styles.range}
            disabled={type === "radial"}
          />
        </div>

        <div className={styles.controlGroup}>
          <div className={styles.label}>
            Stops
            <button type="button" className={styles.smallBtn} onClick={addStop}>+ Add</button>
          </div>
          <div className={styles.track} style={{ background: css }}>
            {stops.map((s, i) => (
              <button
                key={i}
                type="button"
                className={`${styles.stop} ${i === activeStop ? styles.stopActive : ""}`}
                style={{ left: `${s.pos}%`, backgroundColor: s.hex }}
                onClick={() => setActiveStop(i)}
                title={`${s.hex} at ${s.pos}%`}
                aria-label={`Stop ${i + 1}: ${s.hex} at ${s.pos}%`}
              />
            ))}
          </div>

          <div className={styles.stopRows}>
            {stops.map((s, i) => (
              <div
                key={i}
                className={`${styles.stopRow} ${i === activeStop ? styles.stopRowActive : ""}`}
                onClick={() => setActiveStop(i)}
              >
                <span className={styles.stopChip} style={{ backgroundColor: s.hex }} />
                <span className={styles.stopHex}>{s.hex.toUpperCase()}</span>
                <input
                  type="number"
                  min="0"
                  max="100"
                  value={s.pos}
                  onChange={(e) => updateStop(i, { pos: clamp(Number(e.target.value)) })}
                  className={styles.posInput}
                  onClick={(e) => e.stopPropagation()}
                />
                <span className={styles.pct}>%</span>
                {stops.length > 2 && (
                  <button
                    type="button"
                    className={styles.removeBtn}
                    onClick={(e) => { e.stopPropagation(); removeStop(i); }}
                    aria-label="Remove stop"
                  >
                    ×
                  </button>
                )}
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className={styles.poolWrap}>
        <h2 className={styles.poolTitle}>Brand swatches</h2>
        <SwatchRow hexes={brandSwatches} onPick={(h) => updateStop(activeStop, { hex: h })} />
        <h2 className={styles.poolTitle}>Inspiration grid</h2>
        <SwatchRow hexes={sourcePool} onPick={(h) => updateStop(activeStop, { hex: h })} />
        <h2 className={styles.poolTitle}>All unique ({allUnique.length})</h2>
        <SwatchRow hexes={allUnique} onPick={(h) => updateStop(activeStop, { hex: h })} />
      </section>

      <section className={styles.codeWrap}>
        <pre className={styles.code}><code>background: {css};</code></pre>
      </section>

      <PathFooter />
    </div>
  );
}

function SwatchRow({ hexes, onPick }) {
  return (
    <div className={styles.poolRow}>
      {hexes.map((h, i) => (
        <button
          key={`${h}-${i}`}
          type="button"
          className={styles.poolSwatch}
          style={{ backgroundColor: h }}
          onClick={() => onPick(h)}
          title={`Apply ${h} to active stop`}
          aria-label={`Apply ${h}`}
        />
      ))}
    </div>
  );
}

function clamp(n) {
  if (!Number.isFinite(n)) return 0;
  return Math.max(0, Math.min(100, n));
}

function buildCss(type, angle, stops) {
  const sorted = [...stops].sort((a, b) => a.pos - b.pos);
  const stopStr = sorted.map((s) => `${s.hex} ${s.pos}%`).join(", ");
  if (type === "linear") return `linear-gradient(${angle}deg, ${stopStr})`;
  if (type === "radial") return `radial-gradient(circle at center, ${stopStr})`;
  return `conic-gradient(from ${angle}deg at 50% 50%, ${stopStr})`;
}
