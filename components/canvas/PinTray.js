"use client";

import { useEffect, useMemo, useState } from "react";
import { apiFetch } from "../../lib/api/client";
import styles from "./canvas.module.css";

/**
 * The source of material: this project's library pins, ready to drop onto the
 * board. Click a pin and it lands as an image block carrying its source URL +
 * credit (handled by the parent's onAdd). A collapsible side panel so the
 * board stays the focus.
 *
 * Pins already on the board read as "added" — a quiet check, not a lockout
 * (the same reference can appear twice if you want it twice).
 */
export default function PinTray({ open, onToggle, onAdd, usedPinIds }) {
  const [pins, setPins] = useState(null);
  const [query, setQuery] = useState("");

  useEffect(() => {
    let cancelled = false;
    apiFetch("/api/library", { cache: "no-store" })
      .then((r) => r.json())
      .then((data) => {
        if (cancelled) return;
        const list = Object.values(data.pins || {}).filter(
          (p) => p.imageDisplay || p.thumbnail236 || p.imageOriginal
        );
        // Newest first, matching the library's own ordering.
        list.sort((a, b) => (b.addedAt || "").localeCompare(a.addedAt || ""));
        setPins(list);
      })
      .catch(() => setPins([]));
    return () => { cancelled = true; };
  }, []);

  const filtered = useMemo(() => {
    if (!pins) return [];
    const q = query.trim().toLowerCase();
    if (!q) return pins;
    return pins.filter((p) =>
      [p.title, p.alt, p.sourceDomain, p.pinner].filter(Boolean).join(" ").toLowerCase().includes(q)
    );
  }, [pins, query]);

  if (!open) {
    return (
      <button type="button" className={styles.trayHandle} onClick={onToggle} title="Show pins">
        <span className={styles.trayHandleIcon} aria-hidden="true">▤</span>
        Pins
      </button>
    );
  }

  return (
    <aside className={styles.tray} aria-label="Library pins">
      <header className={styles.trayHead}>
        <div>
          <h2 className={styles.trayTitle}>Pins</h2>
          <p className={styles.traySub}>
            {pins == null ? "Loading…" : `${pins.length} in this project`}
          </p>
        </div>
        <button type="button" className={styles.trayClose} onClick={onToggle} aria-label="Hide pins">
          ✕
        </button>
      </header>

      <input
        className={styles.traySearch}
        type="search"
        placeholder="Filter pins"
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        aria-label="Filter pins"
      />

      <div className={styles.trayGrid}>
        {pins == null ? (
          <p className={styles.trayEmpty}>Loading pins…</p>
        ) : filtered.length === 0 ? (
          <p className={styles.trayEmpty}>
            {pins.length === 0 ? "No pins in this project yet. Import a board first." : "No pins match that filter."}
          </p>
        ) : (
          filtered.map((pin) => {
            const used = usedPinIds.has(pin.pinId);
            return (
              <button
                key={pin.pinId}
                type="button"
                className={styles.trayPin}
                onClick={() => onAdd(pin)}
                title={used ? "Already on this board — click to add again" : "Add to board"}
              >
                <img
                  className={styles.trayThumb}
                  src={pin.thumbnail236 || pin.imageDisplay || pin.imageOriginal}
                  alt={pin.title || pin.alt || "Pin"}
                  loading="lazy"
                  draggable={false}
                />
                {used && <span className={styles.trayUsed} aria-hidden="true">✓</span>}
                {pin.sourceDomain && <span className={styles.trayDomain}>{pin.sourceDomain}</span>}
              </button>
            );
          })
        )}
      </div>
    </aside>
  );
}
