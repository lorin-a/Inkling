"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import Link from "next/link";
import ProjectSwitcher from "../../components/ProjectSwitcher";
import { apiFetch, isAuthed } from "../../lib/api/client";
import { useAuthed } from "../../lib/api/useAuthed";
import { extractMissingLocal } from "../../lib/storage/localImport";
import { patchPin as localPatchPin } from "../../lib/storage/localStore";
import styles from "./page.module.css";

const BATCH_CONCURRENCY = 4;

export default function LibraryPage() {
  const authed = useAuthed();
  const [lib, setLib] = useState(null);
  const [filter, setFilter] = useState("");
  const [error, setError] = useState(null);
  const [refreshTick, setRefreshTick] = useState(0);
  const [extracting, setExtracting] = useState(new Set());
  const [batch, setBatch] = useState(null); // { total, done, failed, cancelled }
  const batchCancelRef = useRef(false);
  const [activePin, setActivePin] = useState(null);
  const [selecting, setSelecting] = useState(false);
  const [selected, setSelected] = useState(() => new Set());
  const [uploading, setUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(null); // {done, total}
  const [autoExtract, setAutoExtract] = useState(null); // { initialMissing, startedAt } | null

  useEffect(() => {
    let cancelled = false;
    apiFetch("/api/library", { cache: "no-store" })
      .then((r) => r.json())
      .then((data) => {
        if (!cancelled) setLib(data);
      })
      .catch((e) => !cancelled && setError(e.message));
    return () => {
      cancelled = true;
    };
  }, [refreshTick]);

  // Auto-extract: on mount, ask the server to extract palettes for any
  // pins still missing one. If it starts a run, poll /api/library every
  // 3s so the progress bar ticks down as palettes land.
  useEffect(() => {
    let cancelled = false;
    let pollId = null;
    const ac = new AbortController();
    (async () => {
      if (await isAuthed()) {
        // DB mode: the server runs the batch; poll the library to watch
        // palettes land.
        const res = await fetch("/api/library/extract-missing", { method: "POST" }).catch(() => null);
        const data = await res?.json().catch(() => null);
        if (cancelled || !data?.started) return;
        setAutoExtract({ initialMissing: data.missing, startedAt: data.startedAt });
        pollId = setInterval(() => setRefreshTick((t) => t + 1), 3000);
      } else {
        // Signed-out: drive extraction client-side, persisting locally,
        // and refresh from localStorage as palettes land.
        extractMissingLocal({
          concurrency: 2,
          signal: ac.signal,
          onTick: () => !cancelled && setRefreshTick((t) => t + 1),
        }).catch(() => {});
      }
    })();
    return () => {
      cancelled = true;
      ac.abort();
      if (pollId) clearInterval(pollId);
    };
  }, []);

  // Stop polling once every pin has a palette.
  useEffect(() => {
    if (!autoExtract || !lib) return;
    const remaining = Object.values(lib.pins || {}).filter((p) => !p.palette).length;
    if (remaining === 0) setAutoExtract(null);
  }, [lib, autoExtract]);

  // Internal: extract a single pin, return success/failure. Caller decides
  // how to surface errors (single-pin button alerts; batch logs silently).
  const extractOne = useCallback(async (pinId, { silent = false } = {}) => {
    setExtracting((s) => new Set(s).add(pinId));
    try {
      const authed = await isAuthed();
      // Signed-out: send the image URL so the server extracts without a
      // store lookup, then persist the result to localStorage ourselves.
      const pin = lib?.pins?.[pinId];
      const imageUrl = pin && (pin.imageOriginal || pin.imageDisplay || pin.thumbnail236);
      const body = authed ? { pinId } : { pinId, imageUrl };
      const res = await fetch("/api/pins/extract-palette", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
        signal: AbortSignal.timeout(25000),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || `HTTP ${res.status}`);
      if (!authed) {
        localPatchPin(pinId, { palette: data.palette, paletteExtractedAt: new Date().toISOString() });
      }
      setLib((prev) => ({
        ...prev,
        pins: {
          ...prev.pins,
          [pinId]: { ...prev.pins[pinId], palette: data.palette, paletteExtractedAt: new Date().toISOString() },
        },
      }));
      return { ok: true };
    } catch (e) {
      if (!silent) alert(`Extraction failed: ${e.message}`);
      return { ok: false, error: e.message };
    } finally {
      setExtracting((s) => {
        const next = new Set(s);
        next.delete(pinId);
        return next;
      });
    }
  }, [lib]);

  const extractPalette = useCallback((pinId) => extractOne(pinId), [extractOne]);

  const extractAll = useCallback(async (pinList) => {
    if (!lib) return;
    const queue = pinList && pinList.length
      ? pinList
      : Object.values(lib.pins).filter((p) => !p.palette);
    if (queue.length === 0) {
      alert("Nothing to extract — every pin in the queue already has a palette.");
      return;
    }
    batchCancelRef.current = false;
    setBatch({ total: queue.length, done: 0, failed: 0, cancelled: false });

    let index = 0;
    let done = 0;
    let failed = 0;

    async function worker() {
      while (true) {
        if (batchCancelRef.current) return;
        const myIndex = index++;
        if (myIndex >= queue.length) return;
        const pin = queue[myIndex];
        const res = await extractOne(pin.pinId, { silent: true });
        if (res.ok) done++;
        else failed++;
        setBatch((b) => (b ? { ...b, done, failed } : b));
      }
    }

    const workers = Array.from({ length: BATCH_CONCURRENCY }, worker);
    await Promise.all(workers);
    setBatch((b) => (b ? { ...b, cancelled: batchCancelRef.current } : b));
  }, [lib, extractOne]);

  const cancelBatch = useCallback(() => {
    batchCancelRef.current = true;
  }, []);

  const toggleSelect = useCallback((pinId) => {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(pinId)) next.delete(pinId);
      else next.add(pinId);
      return next;
    });
  }, []);

  const selectAllVisible = useCallback((visiblePins) => {
    setSelected(new Set(visiblePins.map((p) => p.pinId)));
  }, []);

  const clearSelection = useCallback(() => {
    setSelected(new Set());
  }, []);

  const uploadFiles = useCallback(async (fileList) => {
    if (authed === false) {
      alert("Sign in to upload images. They’re saved to your account, not this browser. Pinterest import works without an account.");
      return;
    }
    const files = Array.from(fileList || []).filter((f) => f && f.type?.startsWith("image/"));
    if (files.length === 0) return;
    setUploading(true);
    setUploadProgress({ done: 0, total: files.length });
    try {
      const form = new FormData();
      for (const f of files) form.append("files", f);
      const res = await fetch("/api/library/upload", { method: "POST", body: form });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || `HTTP ${res.status}`);
      // Refresh library so new uploads appear
      setRefreshTick((t) => t + 1);
    } catch (e) {
      alert(`Upload failed: ${e.message}`);
    } finally {
      setUploading(false);
      setUploadProgress(null);
    }
  }, []);

  if (error) {
    return (
      <div className={styles.page}>
        <header className={styles.bar}>
          <Link href="/" className={styles.back}>← inkling.</Link>
        </header>
        <p className={styles.error}>{error}</p>
      </div>
    );
  }

  if (!lib) {
    return (
      <div className={styles.page}>
        <header className={styles.bar}>
          <Link href="/" className={styles.back}>← inkling.</Link>
        </header>
        <p className={styles.empty}>Loading library…</p>
      </div>
    );
  }

  const allPins = Object.values(lib.pins);
  const filtered = filter
    ? allPins.filter((p) =>
        [p.title, p.alt, p.sourceDomain, p.pinner]
          .filter(Boolean)
          .join(" ")
          .toLowerCase()
          .includes(filter.toLowerCase()),
      )
    : allPins;
  const withSource = allPins.filter((p) => p.sourceUrl).length;
  const withPalette = allPins.filter((p) => p.palette).length;

  // The moodboard pool used by Brand page shuffle is each pin’s top 4 colors
  // (matches /api/library/palette). Compute count here for live feedback.
  const moodboardPoolSize = (() => {
    const seen = new Set();
    for (const p of allPins) {
      if (!p.palette) continue;
      for (const h of p.palette.slice(0, 4)) seen.add(h.toLowerCase());
    }
    return seen.size;
  })();

  return (
    <div className={styles.page}>
      <header className={styles.bar}>
        <div className={styles.barTop}>
        <Link href="/" className={styles.back}>← inkling.</Link>
        <ProjectSwitcher />
        <div className={styles.barTitle}>Library</div>
        <div className={styles.barMeta}>
          <span>{allPins.length} pins</span>
          <span className={styles.dot}>·</span>
          <span>{withSource} sourced</span>
          <span className={styles.dot}>·</span>
          <span>{withPalette} extracted</span>
          {autoExtract && (
            <>
              <span className={styles.dot}>·</span>
              <span className={styles.autoExtract} title="Background extraction runs after every import. Stay or browse — colors keep landing.">
                <span className={styles.autoExtractDot} />
                Extracting palettes… {Math.max(0, autoExtract.initialMissing - (allPins.length - withPalette))} of {autoExtract.initialMissing}
              </span>
            </>
          )}
        </div>
        </div>
        <div className={styles.barTools}>
        <Link href="/brand" className={styles.poolStat} title="The colors you’ve extracted feed the Brand page’s “From moodboard” shuffle pool.">
          <span className={styles.poolStatDot} />
          Moodboard pool: <strong>{moodboardPoolSize}</strong> colors →
        </Link>
        <input
          type="search"
          placeholder="Filter by title, domain, pinner…"
          value={filter}
          onChange={(e) => setFilter(e.target.value)}
          className={styles.search}
        />
        {(() => {
          const remainingCount = allPins.filter((p) => !p.palette).length;
          const selectedPins = [...selected]
            .map((id) => lib.pins[id])
            .filter(Boolean);
          const inProgress = batch && batch.done < batch.total;

          if (inProgress) {
            return (
              <div className={styles.batchProgress}>
                <span className={styles.batchCount}>
                  {batch.done}/{batch.total}
                </span>
                <span className={styles.batchBar}>
                  <span
                    className={styles.batchFill}
                    style={{ width: `${(batch.done / batch.total) * 100}%` }}
                  />
                </span>
                <button type="button" className={styles.cancelBtn} onClick={cancelBatch}>
                  Cancel
                </button>
              </div>
            );
          }

          if (selecting) {
            return (
              <>
                <button
                  type="button"
                  className={styles.extractAllBtn}
                  disabled={selectedPins.length === 0}
                  onClick={() => extractAll(selectedPins)}
                  title="Extract palettes from the pins you’ve selected"
                >
                  ✦ Extract {selectedPins.length || ""} selected
                </button>
                <button
                  type="button"
                  className={styles.refresh}
                  onClick={() => { setSelecting(false); clearSelection(); }}
                  title="Exit selection mode"
                  aria-label="Cancel selection"
                >
                  ✕
                </button>
              </>
            );
          }

          return (
            <>
              <button
                type="button"
                className={styles.extractAllBtn}
                onClick={() => extractAll()}
                disabled={remainingCount === 0}
                title={remainingCount === 0
                  ? "Every pin already has a palette."
                  : `Extract palettes from the ${remainingCount} pins that don’t have one yet (originals + k-means; about ~2 min).`}
              >
                ✦ Extract {remainingCount || "all"} {remainingCount === 1 ? "pin" : "pins"}
              </button>
              <button
                type="button"
                className={styles.selectBtn}
                onClick={() => setSelecting(true)}
                title="Pick which pins to extract from"
              >
                Select pins
              </button>
            </>
          );
        })()}
        {authed === false ? (
          <Link href="/login" className={styles.uploadBtn} title="Image upload needs an account. Pinterest import works signed out.">
            ↑ Sign in to upload images
          </Link>
        ) : (
          <label className={styles.uploadBtn} title="Drop or pick images — they’re saved locally and extracted just like pins.">
            {uploading ? (uploadProgress ? `Uploading ${uploadProgress.total}…` : "Uploading…") : "↑ Upload images"}
            <input
              type="file"
              accept="image/*"
              multiple
              hidden
              disabled={uploading}
              onChange={(e) => {
                uploadFiles(e.target.files);
                e.target.value = "";
              }}
            />
          </label>
        )}

        <button
          type="button"
          className={styles.refresh}
          onClick={() => setRefreshTick((t) => t + 1)}
          title="Reload library"
        >
          ↻
        </button>
        </div>
      </header>

      {selecting && (
        <div className={styles.selectionBar}>
          <span className={styles.selectionCount}>
            {selected.size} of {filtered.length} selected
          </span>
          <button
            type="button"
            className={styles.selectionAction}
            onClick={() => selectAllVisible(filtered)}
          >
            Select all visible
          </button>
          <button
            type="button"
            className={styles.selectionAction}
            onClick={() => selectAllVisible(filtered.filter((p) => !p.palette))}
          >
            Select only un-extracted
          </button>
          <button
            type="button"
            className={styles.selectionAction}
            onClick={clearSelection}
          >
            Clear
          </button>
        </div>
      )}

      {allPins.length === 0 ? (
        <p className={styles.empty}>
          No pins yet. <Link href="/import" className={styles.inlineLink}>Import a Pinterest board →</Link>
        </p>
      ) : (
        <div className={styles.grid}>
          {filtered.map((pin) => (
            <PinCard
              key={pin.pinId}
              pin={pin}
              busy={extracting.has(pin.pinId)}
              selecting={selecting}
              selected={selected.has(pin.pinId)}
              onOpen={() => {
                if (selecting) toggleSelect(pin.pinId);
                else setActivePin(pin);
              }}
            />
          ))}
        </div>
      )}


      {activePin && (
        <PinDetail
          pin={lib.pins[activePin.pinId] || activePin}
          onClose={() => setActivePin(null)}
          onExtract={() => extractPalette(activePin.pinId)}
          busy={extracting.has(activePin.pinId)}
        />
      )}
    </div>
  );
}

function PinCard({ pin, onOpen, busy, selecting, selected }) {
  return (
    <figure className={`${styles.card} ${selected ? styles.cardSelected : ""}`}>
      <button
        type="button"
        onClick={onOpen}
        className={styles.cardLink}
        title={selecting ? (selected ? "Deselect" : "Select for batch") : (pin.title || pin.alt || "Open pin")}
      >
        <img
          src={pin.imageDisplay || pin.thumbnail236}
          alt={pin.alt || ""}
          loading="lazy"
          className={styles.cardImage}
        />
        {selecting && (
          <span className={`${styles.checkmark} ${selected ? styles.checkmarkOn : ""}`} aria-hidden="true">
            {selected ? "✓" : ""}
          </span>
        )}
      </button>
      {pin.palette && pin.palette.length > 0 && (
        <div className={styles.paletteRow} aria-label="Extracted palette">
          {pin.palette.map((hex, i) => (
            <button
              key={i}
              type="button"
              className={styles.paletteSwatch}
              style={{ backgroundColor: hex }}
              onClick={(e) => {
                e.stopPropagation();
                navigator.clipboard?.writeText(hex);
              }}
              title={`${hex.toUpperCase()} (click to copy)`}
            />
          ))}
        </div>
      )}
      <figcaption className={styles.cardMeta}>
        {pin.sourceDomain ? (
          <span className={styles.sourceBadge} title={`Source: ${pin.sourceUrl}`}>
            via {pin.sourceDomain}
          </span>
        ) : pin.enrichedAt ? (
          <span className={`${styles.sourceBadge} ${styles.sourceMissing}`}>
            Pinterest only
          </span>
        ) : (
          <span className={`${styles.sourceBadge} ${styles.sourcePending}`}>
            Fetching source…
          </span>
        )}
        {pin.pinner && <span className={styles.pinner}>{pin.pinner}</span>}
      </figcaption>
    </figure>
  );
}

function PinDetail({ pin, onClose, onExtract, busy }) {
  useEffect(() => {
    const onKey = (e) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  const copyPalette = async () => {
    if (!pin.palette?.length) return;
    await navigator.clipboard?.writeText(pin.palette.join(", "));
  };

  return (
    <div className={styles.modalBackdrop} onClick={onClose}>
      <div className={styles.modal} onClick={(e) => e.stopPropagation()} role="dialog" aria-label="Pin details">
        <button type="button" className={styles.modalClose} onClick={onClose} aria-label="Close">×</button>
        <div className={styles.modalImageWrap}>
          <img
            src={pin.imageOriginal || pin.imageDisplay || pin.thumbnail236}
            alt={pin.alt || ""}
            className={styles.modalImage}
          />
        </div>
        <div className={styles.modalSide}>
          {pin.title && <h2 className={styles.modalTitle}>{pin.title}</h2>}
          {pin.alt && pin.alt !== pin.title && (
            <p className={styles.modalAlt}>{pin.alt}</p>
          )}

          <div className={styles.modalMeta}>
            {pin.sourceDomain ? (
              <div>
                <span className={styles.metaLabel}>Source</span>
                <a href={pin.sourceUrl} target="_blank" rel="noopener noreferrer" className={styles.metaLink}>
                  {pin.sourceDomain}
                </a>
              </div>
            ) : pin.enrichedAt ? (
              <div>
                <span className={styles.metaLabel}>Source</span>
                <span className={styles.metaMuted}>Pinterest only — no outbound link on this pin</span>
              </div>
            ) : (
              <div>
                <span className={styles.metaLabel}>Source</span>
                <span className={styles.metaMuted}>Fetching…</span>
              </div>
            )}
            {pin.pinner && (
              <div>
                <span className={styles.metaLabel}>Pinner</span>
                <a href={pin.pinnerUrl || `https://www.pinterest.com/`} target="_blank" rel="noopener noreferrer" className={styles.metaLink}>
                  {pin.pinner}
                </a>
              </div>
            )}
          </div>

          {pin.palette && pin.palette.length > 0 && (
            <div className={styles.modalPalette}>
              <span className={styles.metaLabel}>
                Palette
                <span className={styles.poolNote}>
                  · top 4 feed the moodboard pool on <Link href="/brand" className={styles.metaLink}>Brand</Link>
                </span>
              </span>
              <div className={styles.modalSwatches}>
                {pin.palette.map((hex, i) => (
                  <button
                    key={i}
                    type="button"
                    className={`${styles.modalSwatch} ${i < 4 ? styles.modalSwatchPool : ""}`}
                    style={{ backgroundColor: hex }}
                    onClick={() => navigator.clipboard?.writeText(hex)}
                    title={`${hex.toUpperCase()} · ${i < 4 ? "in moodboard pool" : "extra (not pooled)"} · click to copy`}
                  >
                    <span className={styles.modalSwatchLabel}>{hex.toUpperCase()}</span>
                    {i < 4 && <span className={styles.modalSwatchBadge} aria-hidden="true">●</span>}
                  </button>
                ))}
              </div>
            </div>
          )}

          <div className={styles.modalActions}>
            {pin.sourceUrl && (
              <a
                href={pin.sourceUrl}
                target="_blank"
                rel="noopener noreferrer"
                className={styles.modalAction}
              >
                Open source ↗
              </a>
            )}
            {pin.pinUrl && (
              <a
                href={pin.pinUrl}
                target="_blank"
                rel="noopener noreferrer"
                className={styles.modalAction}
              >
                View on {pin.source === "arena" ? "Are.na" : "Pinterest"} ↗
              </a>
            )}
            <a
              href={pin.imageOriginal || pin.imageDisplay}
              target="_blank"
              rel="noopener noreferrer"
              className={styles.modalAction}
            >
              Open full image ↗
            </a>
            <button
              type="button"
              className={styles.modalActionPrimary}
              onClick={onExtract}
              disabled={busy}
            >
              {busy ? "Extracting…" : pin.palette ? "Re-extract palette" : "Extract palette"}
            </button>
            {pin.palette && pin.palette.length > 0 && (
              <button
                type="button"
                className={styles.modalAction}
                onClick={copyPalette}
              >
                Copy palette
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
