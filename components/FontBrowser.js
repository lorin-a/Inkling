"use client";

import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import styles from "./FontBrowser.module.css";

// Facet options mirror what the API can compute from Google's own metadata.
// Contrast and mood are deliberately absent — they aren't derivable across
// the catalog and live in the curated pairing layer instead.
const STYLES = [
  { value: "", label: "All" },
  { value: "sans", label: "Sans" },
  { value: "serif", label: "Serif" },
  { value: "slab", label: "Slab" },
  { value: "display", label: "Display" },
  { value: "handwriting", label: "Script" },
  { value: "mono", label: "Mono" },
];
const WIDTHS = [
  { value: "", label: "Any" },
  { value: "condensed", label: "Condensed" },
  { value: "normal", label: "Normal" },
  { value: "wide", label: "Wide" },
];
const WEIGHTS = [
  { value: "", label: "Any" },
  { value: "light", label: "Has light" },
  { value: "black", label: "Has black" },
];
const SORTS = [
  { value: "popular", label: "Popular" },
  { value: "trending", label: "Trending" },
  { value: "newest", label: "Newest" },
  { value: "name", label: "A–Z" },
];

const PAGE_SIZE = 24;

// Inject a preview stylesheet for one family (one weight, latin) once.
function ensurePreview(family) {
  const id = `fb-${family}`;
  if (document.querySelector(`[data-font-id="${id}"]`)) return;
  const link = document.createElement("link");
  link.rel = "stylesheet";
  link.href = `https://fonts.googleapis.com/css2?family=${encodeURIComponent(family).replace(/%20/g, "+")}:wght@400&display=swap`;
  link.setAttribute("data-font-id", id);
  document.head.appendChild(link);
}

/**
 * Full-surface faceted browser over the Google Fonts catalog. Launched from a
 * Type slot when the user wants to discover rather than search by name.
 * Filters and sorts server-side via /api/fonts/google; picks resolve the same
 * way the inline search does ({ family, source: "google" }).
 */
export default function FontBrowser({ onPick, onClose }) {
  const [q, setQ] = useState("");
  const [style, setStyle] = useState("");
  const [width, setWidth] = useState("");
  const [weight, setWeight] = useState("");
  const [variable, setVariable] = useState(false);
  const [sort, setSort] = useState("popular");

  const [families, setFamilies] = useState([]);
  const [total, setTotal] = useState(0);
  const [hasMore, setHasMore] = useState(false);
  const [page, setPage] = useState(0);
  const [loading, setLoading] = useState(false);

  const [mounted, setMounted] = useState(false);
  const searchRef = useRef(null);
  const dialogRef = useRef(null);
  const debounceRef = useRef(null);

  useEffect(() => { setMounted(true); }, []);

  // Escape to close; focus the search on open.
  useEffect(() => {
    function onKey(e) { if (e.key === "Escape") onClose(); }
    window.addEventListener("keydown", onKey);
    searchRef.current?.focus();
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  // Any facet or query change resets to the first page.
  useEffect(() => { setPage(0); }, [q, style, width, weight, variable, sort]);

  // Fetch on every input. Page 0 replaces; later pages append.
  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    const run = () => {
      setLoading(true);
      const params = new URLSearchParams({ limit: String(PAGE_SIZE), page: String(page), sort });
      if (q.trim()) params.set("q", q.trim());
      if (style) params.set("style", style);
      if (width) params.set("width", width);
      if (weight) params.set("weight", weight);
      if (variable) params.set("variable", "1");
      fetch(`/api/fonts/google?${params}`)
        .then((r) => r.json())
        .then((data) => {
          const fams = data.families || [];
          setFamilies((prev) => (page === 0 ? fams : [...prev, ...fams]));
          setTotal(data.total || 0);
          setHasMore(Boolean(data.hasMore));
        })
        .catch(() => { if (page === 0) { setFamilies([]); setTotal(0); setHasMore(false); } })
        .finally(() => setLoading(false));
    };
    // Debounce only the typed query; facet clicks feel instant.
    debounceRef.current = setTimeout(run, q ? 200 : 0);
    return () => debounceRef.current && clearTimeout(debounceRef.current);
  }, [q, style, width, weight, variable, sort, page]);

  // Load previews for whatever's currently rendered.
  useEffect(() => { families.forEach((f) => ensurePreview(f.family)); }, [families]);

  const widthLabel = (b) => (b === "condensed" ? "Condensed" : b === "wide" ? "Wide" : b === "normal" ? "Normal" : "");

  if (!mounted) return null;

  return createPortal(
    <div className={styles.overlay} onMouseDown={onClose}>
      <div
        className={styles.dialog}
        role="dialog"
        aria-modal="true"
        aria-label="Browse Google Fonts"
        ref={dialogRef}
        onMouseDown={(e) => e.stopPropagation()}
      >
        <header className={styles.head}>
          <div className={styles.headTop}>
            <h2 className={styles.title}>Browse fonts</h2>
            <span className={styles.count}>{total.toLocaleString()} families</span>
            <button type="button" className={styles.close} onClick={onClose} aria-label="Close">×</button>
          </div>
          <input
            ref={searchRef}
            type="search"
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Search by name…"
            className={styles.search}
          />
          <div className={styles.facets}>
            <ChipRow label="Style" options={STYLES} value={style} onChange={setStyle} />
            <ChipRow label="Width" options={WIDTHS} value={width} onChange={setWidth} />
            <ChipRow label="Weight" options={WEIGHTS} value={weight} onChange={setWeight} />
            <div className={styles.facetGroup}>
              <span className={styles.facetLabel}>Variable</span>
              <button
                type="button"
                role="switch"
                aria-checked={variable}
                className={`${styles.chip} ${variable ? styles.chipOn : ""}`}
                onClick={() => setVariable((v) => !v)}
              >
                Variable only
              </button>
            </div>
            <div className={styles.facetGroup}>
              <span className={styles.facetLabel}>Sort</span>
              <select className={styles.sort} value={sort} onChange={(e) => setSort(e.target.value)}>
                {SORTS.map((s) => <option key={s.value} value={s.value}>{s.label}</option>)}
              </select>
            </div>
          </div>
        </header>

        <div className={styles.results}>
          {families.length === 0 && !loading ? (
            <p className={styles.empty}>No families match these filters.</p>
          ) : (
            <ul className={styles.grid}>
              {families.map((f) => (
                <li key={f.family}>
                  <button type="button" className={styles.card} onClick={() => onPick({ family: f.family, source: "google" })}>
                    <span className={styles.sample} style={{ fontFamily: `"${f.family}", system-ui, sans-serif` }}>{f.family}</span>
                    <span className={styles.meta}>
                      <span className={styles.metaName}>{f.family}</span>
                      <span className={styles.metaTags}>
                        {f.style}{widthLabel(f.widthBucket) ? ` · ${widthLabel(f.widthBucket)}` : ""}{f.isVariable ? " · variable" : ""}
                      </span>
                    </span>
                  </button>
                </li>
              ))}
            </ul>
          )}
          {hasMore && (
            <div className={styles.moreWrap}>
              <button type="button" className={styles.more} onClick={() => setPage((p) => p + 1)} disabled={loading}>
                {loading ? "Loading…" : "Load more"}
              </button>
            </div>
          )}
          {loading && families.length === 0 && <p className={styles.empty}>Loading…</p>}
        </div>
      </div>
    </div>,
    document.body,
  );
}

function ChipRow({ label, options, value, onChange }) {
  return (
    <div className={styles.facetGroup}>
      <span className={styles.facetLabel}>{label}</span>
      <div className={styles.chips}>
        {options.map((o) => (
          <button
            key={o.value}
            type="button"
            className={`${styles.chip} ${value === o.value ? styles.chipOn : ""}`}
            aria-pressed={value === o.value}
            onClick={() => onChange(o.value)}
          >
            {o.label}
          </button>
        ))}
      </div>
    </div>
  );
}
