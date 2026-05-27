"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useAuthed } from "../lib/api/useAuthed";
import { suggestPairing } from "../lib/fontPairings";
import FontBrowser from "./FontBrowser";
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

function FontPicker({ current, onPick, onClear }) {
  const [tab, setTab] = useState("google");
  return (
    <div className={styles.picker}>
      <div className={styles.tabs} role="tablist">
        {["google", "upload", "url"].map((t) => (
          <button
            key={t}
            type="button"
            role="tab"
            aria-selected={tab === t}
            className={`${styles.tab} ${tab === t ? styles.tabActive : ""}`}
            onClick={() => setTab(t)}
          >
            {t === "google" ? "Google" : t === "upload" ? "Upload" : "URL"}
          </button>
        ))}
        {current && (
          <button type="button" className={styles.clearBtn} onClick={onClear}>
            Clear
          </button>
        )}
      </div>
      {tab === "google" && <GoogleTab onPick={onPick} />}
      {tab === "upload" && <UploadTab onPick={onPick} />}
      {tab === "url" && <UrlTab onPick={onPick} />}
    </div>
  );
}

function GoogleTab({ onPick }) {
  const [q, setQ] = useState("");
  const [results, setResults] = useState([]);
  const [loading, setLoading] = useState(false);
  const [browseOpen, setBrowseOpen] = useState(false);
  const debounceRef = useRef(null);

  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => {
      setLoading(true);
      fetch(`/api/fonts/google?q=${encodeURIComponent(q)}&limit=30`)
        .then((r) => r.json())
        .then((data) => setResults(data.families || []))
        .catch(() => setResults([]))
        .finally(() => setLoading(false));
    }, 200);
    return () => debounceRef.current && clearTimeout(debounceRef.current);
  }, [q]);

  // Load preview fonts for the currently visible results so the sample
  // text renders in the actual family. We append <link> tags scoped to
  // this picker session — they stay cached for repeated searches.
  useEffect(() => {
    for (const f of results.slice(0, 12)) {
      const id = `tp-preview-${f.family}`;
      if (document.querySelector(`[data-font-id="${id}"]`)) continue;
      const link = document.createElement("link");
      link.rel = "stylesheet";
      link.href = `https://fonts.googleapis.com/css2?family=${encodeURIComponent(f.family).replace(/%20/g, "+")}:wght@400&display=swap`;
      link.setAttribute("data-font-id", id);
      document.head.appendChild(link);
    }
  }, [results]);

  return (
    <div className={styles.tabBody}>
      <div className={styles.searchRow}>
        <input
          type="search"
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder="Search Google Fonts…"
          className={styles.search}
          autoFocus
        />
        <button type="button" className={styles.browseBtn} onClick={() => setBrowseOpen(true)}>
          Browse all
        </button>
      </div>
      {browseOpen && (
        <FontBrowser
          onPick={(v) => { onPick(v); setBrowseOpen(false); }}
          onClose={() => setBrowseOpen(false)}
        />
      )}
      <div className={styles.results}>
        {loading && results.length === 0 ? (
          <p className={styles.muted}>Loading…</p>
        ) : results.length === 0 ? (
          <p className={styles.muted}>No families match.</p>
        ) : (
          results.map((f) => (
            <button
              key={f.family}
              type="button"
              className={styles.resultRow}
              onClick={() => onPick({ family: f.family, source: "google" })}
            >
              <span className={styles.resultName}>{f.family}</span>
              <span
                className={styles.resultSample}
                style={{ fontFamily: `"${f.family}", system-ui, sans-serif` }}
              >
                Aa
              </span>
            </button>
          ))
        )}
      </div>
    </div>
  );
}

function UploadTab({ onPick }) {
  const authed = useAuthed();
  const [family, setFamily] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState(null);
  const fileRef = useRef(null);

  if (authed === false) {
    return (
      <div className={styles.tabBody}>
        <p className={styles.muted}>
          Font upload needs an account. Uploaded files are stored with your
          project, not in this browser.{" "}
          <Link href="/login" style={{ color: "inherit", textDecoration: "underline", textUnderlineOffset: "3px" }}>
            Sign in
          </Link>{" "}
          to upload, or use Google Fonts and custom URLs, which work signed out.
        </p>
      </div>
    );
  }

  async function handleFile(file) {
    setError(null);
    if (!file) return;
    if (!family.trim()) {
      setError("Give the font a family name first.");
      return;
    }
    setBusy(true);
    try {
      const fd = new FormData();
      fd.append("file", file);
      const res = await fetch("/api/fonts/upload", { method: "POST", body: fd });
      const data = await res.json();
      if (!res.ok || !data.url) throw new Error(data.error || "Upload failed");
      onPick({ family: family.trim(), source: "upload", url: data.url });
    } catch (e) {
      setError(e.message);
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className={styles.tabBody}>
      <label className={styles.field}>
        <span className={styles.fieldLabel}>Family name</span>
        <input
          type="text"
          value={family}
          onChange={(e) => setFamily(e.target.value)}
          placeholder="e.g. P22 Mackinac"
          className={styles.input}
        />
      </label>
      <button
        type="button"
        className={styles.primaryBtn}
        onClick={() => fileRef.current?.click()}
        disabled={busy}
      >
        {busy ? "Uploading…" : "Choose .woff2 / .otf / .ttf"}
      </button>
      <input
        ref={fileRef}
        type="file"
        accept=".woff2,.woff,.otf,.ttf,font/woff2,font/woff,font/otf,font/ttf"
        style={{ position: "absolute", left: "-9999px", width: 1, height: 1, opacity: 0 }}
        onChange={(e) => { handleFile(e.target.files?.[0]); e.target.value = ""; }}
      />
      {error && <p className={styles.error}>{error}</p>}
      <p className={styles.muted}>
        Stored under your project at <code>public/projects/{`{slug}`}/fonts/</code>.
      </p>
    </div>
  );
}

function UrlTab({ onPick }) {
  const [family, setFamily] = useState("");
  const [url, setUrl] = useState("");
  const [error, setError] = useState(null);

  function submit() {
    setError(null);
    if (!family.trim()) { setError("Family name is required."); return; }
    if (!url.trim()) { setError("Stylesheet URL is required."); return; }
    try {
      new URL(url.trim());
    } catch {
      setError("That doesn’t look like a valid URL.");
      return;
    }
    onPick({ family: family.trim(), source: "url", url: url.trim() });
  }

  return (
    <div className={styles.tabBody}>
      <label className={styles.field}>
        <span className={styles.fieldLabel}>Family name</span>
        <input
          type="text"
          value={family}
          onChange={(e) => setFamily(e.target.value)}
          placeholder="As declared in the stylesheet"
          className={styles.input}
        />
      </label>
      <label className={styles.field}>
        <span className={styles.fieldLabel}>Stylesheet URL</span>
        <input
          type="url"
          value={url}
          onChange={(e) => setUrl(e.target.value)}
          placeholder="https://api.fontshare.com/v2/css?f[]=…"
          className={styles.input}
        />
      </label>
      <button type="button" className={styles.primaryBtn} onClick={submit}>
        Apply
      </button>
      {error && <p className={styles.error}>{error}</p>}
      <p className={styles.muted}>
        Works with Fontshare, Adobe Fonts, or any CDN-hosted CSS file.
      </p>
    </div>
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
