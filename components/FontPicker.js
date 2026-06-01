"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useAuthed } from "../lib/api/useAuthed";
import FontBrowser from "./FontBrowser";
import styles from "./TypePanel.module.css";

/**
 * Typeface picker — Google Fonts search + full browse, local upload, custom
 * CSS URL. Returns a font value: { family, source: "google"|"upload"|"url", url? }.
 *
 * Extracted from TypePanel so the Brand Type step and the moodboard text block
 * share one picker (and one source of font-loading behaviour). Styling stays in
 * TypePanel.module.css.
 */
export default function FontPicker({ current, onPick, onClear }) {
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

  // Load preview fonts for the visible results so the sample renders in the
  // actual family. Scoped <link> tags, cached across searches.
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
