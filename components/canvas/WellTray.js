"use client";

import { useEffect, useMemo, useState } from "react";
import { apiFetch } from "../../lib/api/client";
import { DIMENSIONS, dimensionLabel } from "../../lib/canvasDimensions";
import FontLoader, { fontStack } from "../FontLoader";
import styles from "./canvas.module.css";

/**
 * The well — your cross-project library of pulled references (VISION §15), the
 * second source you drop from (beside Pins). Shares the tray chrome; switches
 * via the Pins/Well toggle in the header.
 *
 * The dimension filter is ADDITIVE and labelled with counts (no silent
 * narrowing): "All" shows everything; each chip adds its dimension to a union.
 */
export default function WellTray({ source, onSource, onClose, onAddAtom, version = 0 }) {
  const [atoms, setAtoms] = useState(null);
  const [active, setActive] = useState([]); // selected dimension slugs; [] = All

  useEffect(() => {
    let cancelled = false;
    apiFetch("/api/atoms", { cache: "no-store" })
      .then((r) => r.json())
      .then((d) => { if (!cancelled) setAtoms(d.atoms || []); })
      .catch(() => { if (!cancelled) setAtoms([]); });
    return () => { cancelled = true; };
  }, [version]);

  // Counts per dimension, in the canonical order, only for dimensions present.
  const present = useMemo(() => {
    const counts = {};
    (atoms || []).forEach((a) => { counts[a.dimension] = (counts[a.dimension] || 0) + 1; });
    const order = DIMENSIONS.map((d) => d.slug);
    const seen = [...order.filter((s) => counts[s]), ...Object.keys(counts).filter((s) => !order.includes(s))];
    return seen.map((slug) => ({ slug, count: counts[slug] }));
  }, [atoms]);

  const filtered = useMemo(
    () => (active.length ? (atoms || []).filter((a) => active.includes(a.dimension)) : atoms || []),
    [atoms, active]
  );

  const typeFonts = useMemo(
    () => (atoms || []).filter((a) => a.kind === "type" && a.visual?.font).map((a) => a.visual.font),
    [atoms]
  );

  const toggleDim = (slug) =>
    setActive((prev) => (prev.includes(slug) ? prev.filter((s) => s !== slug) : [...prev, slug]));

  const filterLabel = active.length ? active.map(dimensionLabel).join(" + ") : "All";

  return (
    <aside className={styles.tray} aria-label="Your well">
      {typeFonts.map((f, i) => <FontLoader key={`${f.family}-${i}`} fonts={{ title: f }} />)}
      <header className={styles.trayHead}>
        <div className={styles.traySwitch} role="tablist" aria-label="Source">
          <button type="button" role="tab" aria-selected={source === "pins"} className={styles.traySwitchBtn} onClick={() => onSource("pins")}>Pins</button>
          <button type="button" role="tab" aria-selected={source === "well"} className={styles.traySwitchBtn} data-on="true">Well</button>
        </div>
        <button type="button" className={styles.trayClose} onClick={onClose} aria-label="Hide well">✕</button>
      </header>

      <p className={styles.traySub} style={{ padding: "0 16px 8px" }}>
        {atoms == null ? "Loading…" : `${atoms.length} pulled · showing ${filterLabel}`}
      </p>

      {present.length > 0 && (
        <div className={styles.wellFilters} role="group" aria-label="Filter by dimension">
          <button type="button" className={styles.wellChip} data-on={active.length === 0 ? "true" : undefined} aria-pressed={active.length === 0} onClick={() => setActive([])}>
            All <span className={styles.wellChipN}>{atoms?.length || 0}</span>
          </button>
          {present.map(({ slug, count }) => (
            <button key={slug} type="button" className={styles.wellChip} data-on={active.includes(slug) ? "true" : undefined} aria-pressed={active.includes(slug)} onClick={() => toggleDim(slug)}>
              {dimensionLabel(slug)} <span className={styles.wellChipN}>{count}</span>
            </button>
          ))}
        </div>
      )}

      <div className={styles.trayGrid}>
        {atoms == null ? (
          <p className={styles.trayEmpty}>Loading…</p>
        ) : atoms.length === 0 ? (
          <p className={styles.trayEmpty}>Nothing pulled yet. Crop a part of a reference and tag it, or pull a whole pin.</p>
        ) : filtered.length === 0 ? (
          <p className={styles.trayEmpty}>No references in {filterLabel}.</p>
        ) : (
          filtered.map((atom) => <AtomThumb key={atom.id} atom={atom} onAdd={onAddAtom} />)
        )}
      </div>
    </aside>
  );
}

function AtomThumb({ atom, onAdd }) {
  const dim = dimensionLabel(atom.dimension);
  const credit = atom.source?.sourceDomain || atom.source?.credit || "";
  return (
    <button type="button" className={styles.trayPin} onClick={() => onAdd?.(atom)} title="Add to board">
      <AtomVisual atom={atom} />
      <span className={styles.wellDim}>{dim}</span>
      {credit && <span className={styles.trayDomain}>{credit}</span>}
    </button>
  );
}

function AtomVisual({ atom }) {
  const v = atom.visual || {};
  if (atom.kind === "color") {
    return (
      <span className={styles.wellSwatch} style={{ background: v.hex }}>
        <span className={styles.wellSwatchHex}>{v.name || v.hex}</span>
      </span>
    );
  }
  if (atom.kind === "type") {
    return <span className={styles.wellType} style={{ fontFamily: fontStack({ family: v.font?.family }, "serif") }}>{v.text || "Ag"}</span>;
  }
  // image — show the cropped region (object-fit cover + focal, scaled by zoom)
  const fx = v.crop?.focal?.x ?? 0.5;
  const fy = v.crop?.focal?.y ?? 0.5;
  const zoom = v.crop?.zoom || 1;
  return (
    <span className={styles.wellImgBox}>
      <img
        className={styles.wellImg}
        src={v.src}
        alt=""
        loading="lazy"
        draggable={false}
        style={{ objectPosition: `${fx * 100}% ${fy * 100}%`, transform: `scale(${zoom})`, transformOrigin: `${fx * 100}% ${fy * 100}%` }}
      />
    </span>
  );
}
