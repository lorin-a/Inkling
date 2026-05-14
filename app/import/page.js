"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { BOOKMARKLET_HREF } from "../../lib/pinterestBookmarklet";
import ProjectSwitcher from "../../components/ProjectSwitcher";
import styles from "./page.module.css";

export default function ImportPage() {
  const dragRef = useRef(null);
  const [copied, setCopied] = useState(false);
  const [importStatus, setImportStatus] = useState(null);
  const [uploading, setUploading] = useState(false);

  useEffect(() => {
    if (dragRef.current) dragRef.current.setAttribute("href", BOOKMARKLET_HREF);
  }, []);

  async function copyBookmarklet() {
    try {
      await navigator.clipboard.writeText(BOOKMARKLET_HREF);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch {}
  }

  async function handleFile(file) {
    if (!file) return;
    setUploading(true);
    setImportStatus(null);
    try {
      const text = await file.text();
      const payload = JSON.parse(text);
      if (!payload.pins || !Array.isArray(payload.pins)) {
        throw new Error("This doesn't look like a Moodbuilder import file (no `pins` array).");
      }
      setImportStatus({
        kind: "preview",
        boardName: payload.boardName,
        count: payload.pins.length,
        capturedAt: payload.capturedAt,
        pins: payload.pins.slice(0, 12),
        rawPayload: payload,
      });
    } catch (e) {
      setImportStatus({ kind: "error", message: e.message });
    } finally {
      setUploading(false);
    }
  }

  async function commitImport() {
    if (importStatus?.kind !== "preview") return;
    setImportStatus({ ...importStatus, kind: "committing" });
    try {
      const res = await fetch("/api/import/pinterest", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(importStatus.rawPayload),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || `HTTP ${res.status}`);
      setImportStatus({
        kind: "done",
        added: data.added,
        updated: data.updated,
        librarySize: data.librarySize,
        boardName: importStatus.boardName,
      });
    } catch (e) {
      setImportStatus({ kind: "error", message: e.message });
    }
  }

  function onDrop(e) {
    e.preventDefault();
    const file = e.dataTransfer?.files?.[0];
    if (file) handleFile(file);
  }

  return (
    <div className={styles.page}>
      <header className={styles.bar}>
        <Link href="/" className={styles.back}>← Moodbuilder</Link>
        <ProjectSwitcher />
        <div className={styles.barTitle}>Pinterest import</div>
      </header>

      <main className={styles.main}>
        <section className={styles.step}>
          <span className={styles.stepNum}>1</span>
          <div className={styles.stepBody}>
            <h2 className={styles.stepTitle}>Show your bookmarks bar</h2>
            <p className={styles.stepText}>
              In Chrome: <kbd>⌘</kbd> <kbd>⇧</kbd> <kbd>B</kbd>. The bar appears just under the address bar.
            </p>
          </div>
        </section>

        <section className={styles.step}>
          <span className={styles.stepNum}>2</span>
          <div className={styles.stepBody}>
            <h2 className={styles.stepTitle}>Drag this button to your bookmarks bar</h2>
            <p className={styles.stepText}>
              Click and hold the button, drag it up to the bookmarks bar, release. It will live there permanently — click it anytime you're on a Pinterest board.
            </p>
            <div className={styles.dropArea}>
              <a
                ref={dragRef}
                href="#"
                className={styles.bookmarkBtn}
                onClick={(e) => e.preventDefault()}
                draggable="true"
              >
                ✦ Save board to Moodbuilder
              </a>
              <button
                type="button"
                className={styles.copyLink}
                onClick={copyBookmarklet}
              >
                {copied ? "Copied" : "or copy URL"}
              </button>
            </div>
            <p className={styles.stepHint}>
              If dragging is awkward: click <em>or copy URL</em>, then right-click the bookmarks bar → Add page → paste as the URL and name it <em>Save board to Moodbuilder</em>.
            </p>
          </div>
        </section>

        <section className={styles.step}>
          <span className={styles.stepNum}>3</span>
          <div className={styles.stepBody}>
            <h2 className={styles.stepTitle}>Open your Whelm board and click the bookmark</h2>
            <p className={styles.stepText}>
              Go to <a href="https://www.pinterest.com/lorinanderberg1/whelm/" target="_blank" rel="noopener noreferrer" className={styles.inlineLink}>pinterest.com/lorinanderberg1/whelm</a>. Click the bookmark.
            </p>
            <p className={styles.stepText}>
              A floating panel appears at the bottom-right of the page. The bookmark will auto-scroll your entire board, capturing every pin (you'll see the count tick up). When it plateaus, a JSON file downloads automatically: <code className={styles.code}>moodbuilder-whelm-{`{timestamp}`}.json</code>.
            </p>
            <p className={styles.stepHint}>
              You can also click <em>Stop &amp; Download</em> at any point if you'd rather not wait for the auto-stop. The board has ~354 pins so full capture takes about 90 seconds.
            </p>
          </div>
        </section>

        <section className={styles.step}>
          <span className={styles.stepNum}>4</span>
          <div className={styles.stepBody}>
            <h2 className={styles.stepTitle}>Drop the JSON here</h2>
            <p className={styles.stepText}>
              When the file is in your Downloads folder, drag it into the dashed area below — or click to pick it. We'll preview the import before committing.
            </p>
            <label
              className={`${styles.dropZone} ${uploading ? styles.dropZoneBusy : ""}`}
              onDragOver={(e) => e.preventDefault()}
              onDrop={onDrop}
            >
              <input
                type="file"
                accept="application/json,.json"
                hidden
                onChange={(e) => handleFile(e.target.files?.[0])}
              />
              <span className={styles.dropZoneLabel}>
                {uploading ? "Reading…" : "Drop JSON or click to choose"}
              </span>
            </label>

            {importStatus?.kind === "error" && (
              <p className={styles.error}>{importStatus.message}</p>
            )}

            {importStatus?.kind === "preview" && (
              <div className={styles.preview}>
                <div className={styles.previewHeader}>
                  <strong>{importStatus.boardName}</strong>
                  <span>{importStatus.count} pins · captured {new Date(importStatus.capturedAt).toLocaleString()}</span>
                </div>
                <div className={styles.thumbs}>
                  {importStatus.pins.map((p) => (
                    <a
                      key={p.pinId}
                      href={p.pinUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className={styles.thumb}
                    >
                      <img src={p.thumbnail236} alt={p.alt || ""} loading="lazy" />
                    </a>
                  ))}
                </div>
                <button type="button" className={styles.commitBtn} onClick={commitImport}>
                  Commit {importStatus.count} pins to library
                </button>
                <p className={styles.stepHint}>
                  Source URL enrichment runs in the background after commit — each pin's original site link populates as the server fetches the pin detail page (a minute or two for the full board).
                </p>
              </div>
            )}

            {importStatus?.kind === "committing" && (
              <p className={styles.stepHint}>Committing import…</p>
            )}

            {importStatus?.kind === "done" && (
              <div className={styles.done}>
                <strong>Imported.</strong> {importStatus.added} new, {importStatus.updated} updated · library now holds {importStatus.librarySize} pins.{" "}
                <Link href="/library" className={styles.inlineLink}>Open library →</Link>
                <p className={styles.stepHint}>Source URLs are populating in the background. Refresh /library in a minute to see them filled in.</p>
              </div>
            )}
          </div>
        </section>
      </main>
    </div>
  );
}
