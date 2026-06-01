"use client";

import { useEffect, useRef, useState } from "react";
import { suggestPairing } from "../lib/fontPairings";
import FontPicker from "./FontPicker";
import styles from "./TypePanel.module.css";

const SLOTS = [
  { key: "title", label: "Title", sample: "Whelm." },
  { key: "subhead", label: "Subhead", sample: "Find your way to feeling" },
  { key: "body", label: "Body", sample: "A ritual for cultivating a relationship with your intuition." },
];

/**
 * Three-slot typography picker for the Brand page rail.
 * Each slot opens a popover with three sources: Google Fonts search,
 * local upload, custom CSS URL. Selections are persisted via PATCH
 * /api/project so they survive reload and follow the active project.
 */
export default function TypePanel({ fonts, palette = [], onChange }) {
  const [openSlot, setOpenSlot] = useState(null);
  const [locks, setLocks] = useState(() => new Set());
  const [lastPairing, setLastPairing] = useState(null); // { id, display, text }
  const rootRef = useRef(null);

  function toggleLock(slotKey) {
    setLocks((prev) => {
      const next = new Set(prev);
      if (next.has(slotKey)) next.delete(slotKey);
      else next.add(slotKey);
      return next;
    });
  }

  function suggest() {
    const { fonts: nextFonts, pairing } = suggestPairing({
      palette,
      fonts: fonts || {},
      lockedSlots: locks,
      avoidId: lastPairing?.id,
    });
    setLastPairing(pairing);
    onChange(nextFonts);
  }

  useEffect(() => {
    if (!openSlot) return;
    function onClick(e) {
      if (rootRef.current && !rootRef.current.contains(e.target)) setOpenSlot(null);
    }
    function onKey(e) { if (e.key === "Escape") setOpenSlot(null); }
    window.addEventListener("mousedown", onClick);
    window.addEventListener("keydown", onKey);
    return () => {
      window.removeEventListener("mousedown", onClick);
      window.removeEventListener("keydown", onKey);
    };
  }, [openSlot]);

  function applySlot(slotKey, value) {
    const nextFonts = { ...(fonts || {}), [slotKey]: value };
    onChange(nextFonts);
  }

  function clearSlot(slotKey) {
    const nextFonts = { ...(fonts || {}) };
    delete nextFonts[slotKey];
    onChange(nextFonts);
    setOpenSlot(null);
  }

  return (
    <section className={styles.panel} ref={rootRef}>
      <header className={styles.header}>
        <div className={styles.headRow}>
          <h3 className={styles.heading}>Type</h3>
          <button type="button" className={styles.suggestBtn} onClick={suggest} title="Propose a font pairing tuned to your palette">
            ✦ Suggest a pairing
          </button>
        </div>
        <p className={styles.hint}>
          {lastPairing
            ? `Pairing: ${lastPairing.display}${lastPairing.text !== lastPairing.display ? ` + ${lastPairing.text}` : ""}${lastPairing.source ? ` (via ${lastPairing.source})` : ""}. Lock a slot and suggest again to keep it.`
            : "Suggest a pairing, or set each slot by hand: search, browse, upload, or paste a URL."}
        </p>
      </header>
      <div className={styles.slots}>
        {SLOTS.map((slot) => {
          const value = fonts?.[slot.key];
          const open = openSlot === slot.key;
          const locked = locks.has(slot.key);
          return (
            <div key={slot.key} className={styles.slot}>
              <div className={styles.slotRow}>
                <button
                  type="button"
                  className={`${styles.slotBtn} ${open ? styles.slotBtnOpen : ""}`}
                  onClick={() => setOpenSlot(open ? null : slot.key)}
                >
                  <span className={styles.slotLabel}>{slot.label}</span>
                  <span
                    className={`${styles.slotFamily} ${value ? "" : styles.slotFamilyEmpty}`}
                    style={value ? { fontFamily: stackFor(value) } : {}}
                  >
                    {value?.family || "Choose a font"}
                  </span>
                </button>
                <button
                  type="button"
                  className={`${styles.lockBtn} ${locked ? styles.lockBtnOn : ""}`}
                  onClick={() => toggleLock(slot.key)}
                  aria-pressed={locked}
                  title={locked ? "Locked. Suggest won’t change this slot. Click to unlock." : "Lock this slot so Suggest leaves it alone."}
                  aria-label={locked ? `Unlock ${slot.label}` : `Lock ${slot.label}`}
                >
                  {locked ? <LockIcon /> : <LockOpenIcon />}
                </button>
              </div>
              {open && (
                <FontPicker
                  current={value}
                  onPick={(v) => { applySlot(slot.key, v); setOpenSlot(null); }}
                  onClear={() => clearSlot(slot.key)}
                />
              )}
            </div>
          );
        })}
      </div>
    </section>
  );
}

function stackFor(slot) {
  if (!slot?.family) return "inherit";
  const fam = slot.family.includes(" ") ? `"${slot.family}"` : slot.family;
  return `${fam}, system-ui, sans-serif`;
}

function LockIcon() {
  return (
    <svg width="13" height="13" viewBox="0 0 16 16" fill="none" aria-hidden="true">
      <rect x="3.5" y="7" width="9" height="7" rx="1.5" stroke="currentColor" strokeWidth="1.4" />
      <path d="M5.5 7V5a2.5 2.5 0 015 0v2" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" />
    </svg>
  );
}
function LockOpenIcon() {
  return (
    <svg width="13" height="13" viewBox="0 0 16 16" fill="none" aria-hidden="true">
      <rect x="3.5" y="7" width="9" height="7" rx="1.5" stroke="currentColor" strokeWidth="1.4" />
      <path d="M5.5 7V5a2.5 2.5 0 014.95-.6" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" />
    </svg>
  );
}
