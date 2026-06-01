"use client";

import { useEffect, useState } from "react";
import { apiFetch } from "../../lib/api/client";
import { colorName } from "../../lib/nameThatColor";
import styles from "./canvas.module.css";

/**
 * A grid of the project's own colors (brand + starred + pin pool), named via
 * Name That Color. Renders just the swatch buttons; the parent supplies the
 * popover container + grid layout. Shared by the swatch-add picker and the
 * shape fill picker so both pull from the same taste-driven palette.
 */
export default function ColorPicker({ onPick }) {
  const [colors, setColors] = useState(null);

  useEffect(() => {
    let cancelled = false;
    apiFetch("/api/library/palette", { cache: "no-store" })
      .then((r) => r.json())
      .then((d) => {
        if (cancelled) return;
        const seen = new Set();
        const out = [];
        const push = (hex) => {
          if (!hex || typeof hex !== "string") return;
          const h = hex.toLowerCase();
          if (seen.has(h)) return;
          seen.add(h);
          out.push(h);
        };
        (d.brand || []).forEach(push);
        (d.starred || []).forEach(push);
        (d.palette || []).slice(0, 48).forEach(push);
        setColors(out.slice(0, 54));
      })
      .catch(() => setColors([]));
    return () => { cancelled = true; };
  }, []);

  if (colors === null) return <p className={styles.pickerEmpty}>Loading…</p>;
  if (colors.length === 0) return <p className={styles.pickerEmpty}>No project colors yet.</p>;

  return (
    <>
      {colors.map((hex) => (
        <button
          key={hex}
          type="button"
          role="menuitem"
          className={styles.pickerSwatch}
          style={{ background: hex }}
          title={`${colorName(hex).name || hex} · ${hex.toUpperCase()}`}
          aria-label={`${colorName(hex).name || hex}`}
          onClick={() => onPick(hex, colorName(hex).name || hex.toUpperCase())}
        />
      ))}
    </>
  );
}
