"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { BOOKMARKLET_HREF } from "../../lib/pinterestBookmarklet";
import { isAuthed } from "../../lib/api/client";
import { commitLocalImport, extractMissingLocal } from "../../lib/storage/localImport";
import { fetchArenaChannel } from "../../lib/sources/arena";
import * as local from "../../lib/storage/localStore";
import ProjectSwitcher from "../../components/ProjectSwitcher";
import styles from "./page.module.css";

const newPinId = () => `up_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 8)}`;
const looksLikeUrl = (s) => /^https?:\/\//i.test((s || "").trim());
const domainOf = (u) => { try { return new URL(u).hostname.replace(/^www\./, ""); } catch { return null; } };

// A pasted "source" can be a name ("a friend's studio") or a link. Split it into the
// fields a pin carries, so credit is always preserved and clickable when it's a URL.
function sourceFields(raw) {
  const s = (raw || "").trim();
  if (!s) return { sourceUrl: null, sourceDomain: null, pinner: null };
  if (looksLikeUrl(s)) return { sourceUrl: s, sourceDomain: domainOf(s), pinner: domainOf(s) };
  return { sourceUrl: null, sourceDomain: s, pinner: s };
}

// Downscale an uploaded image so a handful of screenshots fit in localStorage
// (signed-out). Returns a data URL. Keeps aspect; longest side <= MAX.
function fileToScaledDataUrl(file, MAX = 1280) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onerror = () => reject(new Error("Could not read that file."));
    reader.onload = () => {
      const img = new Image();
      img.onerror = () => reject(new Error("Could not load that image."));
      img.onload = () => {
        const scale = Math.min(1, MAX / Math.max(img.naturalWidth, img.naturalHeight));
        const w = Math.round(img.naturalWidth * scale);
        const h = Math.round(img.naturalHeight * scale);
        const canvas = document.createElement("canvas");
        canvas.width = w; canvas.height = h;
        canvas.getContext("2d").drawImage(img, 0, 0, w, h);
        resolve(canvas.toDataURL("image/jpeg", 0.82));
      };
      img.src = reader.result;
    };
    reader.readAsDataURL(file);
  });
}

export default function ImportPage() {
  const dragRef = useRef(null);
  const [source, setSource] = useState("pinterest"); // pinterest | upload | link | arena
  const [copied, setCopied] = useState(false);
  const [importStatus, setImportStatus] = useState(null);
  const [uploading, setUploading] = useState(false);
  const [arenaInput, setArenaInput] = useState("");
  const [uploadSource, setUploadSource] = useState(""); // a name or a link, credited on every upload
  const [linkUrl, setLinkUrl] = useState("");
  const [linkSource, setLinkSource] = useState("");

  // Upload images (screenshots, scans, your own photos). Signed out: downscale +
  // store locally with their source. Signed in: through the account upload.
  async function uploadImages(fileList) {
    const files = Array.from(fileList || []).filter((f) => f?.type?.startsWith("image/"));
    if (!files.length) return;
    setUploading(true);
    setImportStatus({ kind: "committing" });
    try {
      const authed = await isAuthed();
      if (authed) {
        const form = new FormData();
        for (const f of files) form.append("files", f);
        const res = await fetch("/api/library/upload", { method: "POST", body: form });
        const data = await res.json();
        if (!res.ok) throw new Error(data.error || `Upload failed (${res.status})`);
        setImportStatus({ kind: "done", added: data.added ?? files.length, updated: 0, librarySize: data.librarySize, boardName: "your uploads", local: false });
      } else {
        const src = sourceFields(uploadSource);
        const pins = [];
        for (const f of files) {
          const dataUrl = await fileToScaledDataUrl(f);
          pins.push({ pinId: newPinId(), imageOriginal: dataUrl, imageDisplay: dataUrl, thumbnail236: dataUrl, title: f.name.replace(/\.[^.]+$/, ""), alt: f.name, ...src });
        }
        let merged;
        try { merged = local.mergePins(pins, { boardName: "Uploads", importedAt: new Date().toISOString() }); }
        catch { throw new Error("Your browser ran out of room for uploaded images. Sign in to store them in your account, or add fewer at a time."); }
        extractMissingLocal({ concurrency: 2 }).catch(() => {});
        setImportStatus({ kind: "done", added: merged.added, updated: merged.updated, librarySize: merged.total, boardName: "your uploads", local: true });
      }
    } catch (e) {
      setImportStatus({ kind: "error", message: e.message });
    } finally {
      setUploading(false);
    }
  }

  // Add a single image by URL, crediting where it came from.
  async function addByLink() {
    const url = linkUrl.trim();
    if (!looksLikeUrl(url)) { setImportStatus({ kind: "error", message: "Paste a direct image link (it should start with http)." }); return; }
    setImportStatus({ kind: "committing" });
    try {
      const authed = await isAuthed();
      if (authed) {
        setImportStatus({ kind: "error", message: "Add-by-link for accounts is coming. It works in the sample studio now — sign out to try it." });
        return;
      }
      const src = sourceFields(linkSource.trim() || url);
      const pin = { pinId: newPinId(), imageOriginal: url, imageDisplay: url, thumbnail236: url, title: domainOf(url) || "Link", alt: "", ...src };
      const merged = local.mergePins([pin], { boardName: "Links", importedAt: new Date().toISOString() });
      extractMissingLocal({ concurrency: 2 }).catch(() => {});
      setLinkUrl(""); setLinkSource("");
      setImportStatus({ kind: "done", added: merged.added, updated: merged.updated, librarySize: merged.total, boardName: "your links", local: true });
    } catch (e) {
      setImportStatus({ kind: "error", message: e.message });
    }
  }

  function switchSource(next) {
    setSource(next);
    setImportStatus(null); // status belongs to one flow; don’t carry it across
  }

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
        throw new Error("This doesn’t look like an Inkling import file (no `pins` array).");
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
      const authed = await isAuthed();
      let result;
      if (authed) {
        const res = await fetch("/api/import/pinterest", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(importStatus.rawPayload),
        });
        const data = await res.json();
        if (!res.ok) throw new Error(data.error || `HTTP ${res.status}`);
        result = data;
      } else {
        // Signed out: merge into localStorage, then drive palette
        // extraction client-side (server has no store to write to).
        const merged = commitLocalImport(importStatus.rawPayload);
        result = { added: merged.added, updated: merged.updated, librarySize: merged.total };
        extractMissingLocal({ concurrency: 2 }).catch(() => {});
      }
      setImportStatus({
        kind: "done",
        added: result.added,
        updated: result.updated,
        librarySize: result.librarySize,
        boardName: importStatus.boardName,
        local: !authed,
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

  async function importArena() {
    const input = arenaInput.trim();
    if (!input) return;
    setImportStatus({ kind: "committing" });
    try {
      const authed = await isAuthed();
      let result;
      if (authed) {
        const res = await fetch("/api/import/arena", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ input }),
        });
        const data = await res.json();
        if (!res.ok) throw new Error(data.error || `HTTP ${res.status}`);
        result = data;
      } else {
        // Signed out: fetch the channel in the browser (Are.na sends open
        // CORS), merge into localStorage, drive extraction client-side.
        const payload = await fetchArenaChannel(input);
        if (payload.pins.length === 0) {
          throw new Error("That channel has no image blocks to import.");
        }
        const merged = commitLocalImport(payload);
        result = { added: merged.added, updated: merged.updated, librarySize: merged.total, board: payload.boardName };
        extractMissingLocal({ concurrency: 2 }).catch(() => {});
      }
      setImportStatus({
        kind: "done",
        added: result.added,
        updated: result.updated,
        librarySize: result.librarySize,
        boardName: result.board,
        local: !authed,
      });
    } catch (e) {
      setImportStatus({ kind: "error", message: e.message });
    }
  }

  return (
    <div className={styles.page}>
      <span className={styles.grain} aria-hidden="true" />

      <header className={styles.mast}>
        <div className={styles.mastL}>
          <Link href="/" className={styles.back}>inkling<span className={styles.dot}>.</span></Link>
          <span className={styles.ed}>No.&nbsp;01 · Est.&nbsp;2026</span>
        </div>
        <div className={styles.mastR}>
          <ProjectSwitcher />
          <span className={styles.mastMark}>Import</span>
        </div>
      </header>

      <section className={styles.intro}>
        <div className={styles.introTop}>
          <h1 className={styles.introH}>Bring your<br />inspiration in.</h1>
          <span className={styles.introMeta}>Four ways in · credit kept</span>
        </div>
        <p className={styles.introP}>
          Start anywhere below. Connect a Pinterest or Are.na board, upload your
          own screenshots, or paste a link. Every reference keeps a line home to its source —
          so you stay the author, and the makers keep their credit.
        </p>
      </section>

      <main>
        <div className={styles.sourceTabs} role="tablist" aria-label="Inspiration source">
          {[
            ["pinterest", "Pinterest board"],
            ["upload", "Upload screenshots"],
            ["link", "Paste a link"],
            ["arena", "Are.na"],
          ].map(([key, label]) => (
            <button
              key={key}
              type="button"
              role="tab"
              aria-selected={source === key}
              className={`${styles.sourceTab} ${source === key ? styles.sourceTabActive : ""}`}
              onClick={() => switchSource(key)}
            >
              {label}
            </button>
          ))}
        </div>

        {source === "upload" && (
          <section className={styles.flow}>
            <aside className={styles.rail}>
              <span className={styles.railKicker}>Upload screenshots</span>
              <h2 className={styles.stepTitle}>Upload your own</h2>
              <p className={styles.railNote}>
                Screenshots, scans, photos — anything not on Pinterest. They’re yours to use, and they
                stay in this browser (sign in to keep them on your account). Palettes extract automatically.
              </p>
            </aside>
            <div className={styles.flowBody}>
            <div className={styles.panel}>
            <label className={styles.fieldLabel}>Where’s it from? <span className={styles.optional}>(optional — a name, or paste a link to credit the source)</span></label>
            <input
              type="text"
              className={styles.arenaInput}
              placeholder="e.g. my own photo · or https://source.com/page"
              value={uploadSource}
              onChange={(e) => setUploadSource(e.target.value)}
              aria-label="Source for these uploads"
              style={{ marginBottom: 12 }}
            />
            <label
              className={`${styles.dropZone} ${uploading ? styles.dropZoneBusy : ""}`}
              onDragOver={(e) => e.preventDefault()}
              onDrop={(e) => { e.preventDefault(); uploadImages(e.dataTransfer?.files); }}
            >
              <input type="file" accept="image/*" multiple hidden onChange={(e) => uploadImages(e.target.files)} disabled={uploading} />
              <span className={styles.dropZoneLabel}>{uploading ? "Adding your images…" : "Drop images here, or click to choose"}</span>
            </label>
            {importStatus?.kind === "error" && <p className={styles.error}>{importStatus.message}</p>}
            {importStatus?.kind === "done" && (
              <div className={styles.done}>
                <strong>{importStatus.added} added{importStatus.boardName ? ` to ${importStatus.boardName}` : ""}.</strong>{" "}
                Library now holds {importStatus.librarySize} pins.{" "}
                <Link href="/library" className={styles.inlineLink}>Open library →</Link>
                <p className={styles.stepHint}>Palettes are extracting in the background.</p>
              </div>
            )}
            </div>
            </div>
          </section>
        )}

        {source === "link" && (
          <section className={styles.flow}>
            <aside className={styles.rail}>
              <span className={styles.railKicker}>Paste a link</span>
              <h2 className={styles.stepTitle}>Paste a link</h2>
              <p className={styles.railNote}>
                A direct image link from anywhere on the web. The source is kept and stays clickable — credit, preserved.
              </p>
            </aside>
            <div className={styles.flowBody}>
            <div className={styles.panel}>
            <label className={styles.fieldLabel}>Image link</label>
            <input
              type="text"
              className={styles.arenaInput}
              placeholder="https://…/image.jpg"
              value={linkUrl}
              onChange={(e) => setLinkUrl(e.target.value)}
              onKeyDown={(e) => { if (e.key === "Enter") addByLink(); }}
              aria-label="Image link"
              style={{ marginBottom: 12 }}
            />
            <label className={styles.fieldLabel}>Source <span className={styles.optional}>(optional — name it, or paste the page it came from)</span></label>
            <div className={styles.arenaRow}>
              <input
                type="text"
                className={styles.arenaInput}
                placeholder="e.g. @maker on Instagram · or https://source.com/post"
                value={linkSource}
                onChange={(e) => setLinkSource(e.target.value)}
                onKeyDown={(e) => { if (e.key === "Enter") addByLink(); }}
                aria-label="Source for this link"
              />
              <button type="button" className={styles.commitBtn} onClick={addByLink} disabled={!linkUrl.trim() || importStatus?.kind === "committing"}>
                {importStatus?.kind === "committing" ? "Adding…" : "Add"}
              </button>
            </div>
            {importStatus?.kind === "error" && <p className={styles.error}>{importStatus.message}</p>}
            {importStatus?.kind === "done" && (
              <div className={styles.done}>
                <strong>Added.</strong> Library now holds {importStatus.librarySize} pins.{" "}
                <Link href="/library" className={styles.inlineLink}>Open library →</Link>
              </div>
            )}
            </div>
            </div>
          </section>
        )}

        {source === "arena" && (
          <section className={styles.flow}>
            <aside className={styles.rail}>
              <span className={styles.railKicker}>Are.na</span>
              <h2 className={styles.stepTitle}>Paste an Are.na channel</h2>
              <p className={styles.railNote}>
                No bookmark needed. Paste a public channel&rsquo;s link (or just its slug) and Inkling pulls in every image block, with its source link. Palettes extract automatically.
              </p>
            </aside>
            <div className={styles.flowBody}>
            <div className={styles.panel}>
            <div className={styles.arenaRow}>
              <input
                type="text"
                className={styles.arenaInput}
                placeholder="are.na/user/channel-name"
                value={arenaInput}
                onChange={(e) => setArenaInput(e.target.value)}
                onKeyDown={(e) => { if (e.key === "Enter") importArena(); }}
                disabled={importStatus?.kind === "committing"}
                aria-label="Are.na channel link or slug"
              />
              <button
                type="button"
                className={styles.commitBtn}
                onClick={importArena}
                disabled={!arenaInput.trim() || importStatus?.kind === "committing"}
              >
                {importStatus?.kind === "committing" ? "Importing…" : "Import channel"}
              </button>
            </div>
            <p className={styles.stepHint}>
              The channel must be public. Re-importing only adds new blocks; existing ones are kept as-is.
            </p>

            {importStatus?.kind === "error" && (
              <p className={styles.error}>{importStatus.message}</p>
            )}
            {importStatus?.kind === "done" && (
              <div className={styles.done}>
                <strong>
                  {importStatus.added > 0
                    ? `${importStatus.added} new image${importStatus.added === 1 ? "" : "s"} added.`
                    : "Nothing new to add."}
                </strong>{" "}
                {importStatus.updated > 0 && (
                  <>{importStatus.updated} already in your library, refreshed. </>
                )}
                Library now holds {importStatus.librarySize} pins.{" "}
                <Link href="/library" className={styles.inlineLink}>Open library →</Link>
                <p className={styles.stepHint}>
                  {importStatus.local
                    ? "Palettes are extracting in the background. Sign in to keep your library across devices."
                    : "Palettes are extracting in the background. Refresh /library in a minute to watch them land."}
                </p>
              </div>
            )}
            </div>
            </div>
          </section>
        )}

        {source === "pinterest" && (
        <div className={styles.flow}>
        <aside className={styles.rail}>
          <span className={styles.railKicker}>Pinterest board</span>
          <h2 className={styles.stepTitle}>The bookmark method</h2>
          <p className={styles.railNote}>Every reference keeps a line home to its source — you stay the author.</p>
          <ul className={styles.railSpec}>
            <li>4 steps · works in Chrome</li>
            <li>~90s for a few hundred pins</li>
            <li>re-import adds only what’s new</li>
          </ul>
        </aside>
        <div className={styles.flowBody}>
        <div className={styles.leadHint}>
          <p className={styles.stepHint}>
            No board yet? <a href="https://www.pinterest.com" target="_blank" rel="noopener noreferrer" className={styles.inlineLink}>Make one on Pinterest →</a> Save a handful of pins that feel like you, then come back here for the four steps.
          </p>
        </div>
        <ol className={styles.steps}>
        <li className={styles.step}>
          <span className={styles.stepNum}>01</span>
          <div className={styles.stepBody}>
            <h2 className={styles.stepTitle}>Show your bookmarks bar</h2>
            <p className={styles.stepText}>
              In Chrome: <kbd>⌘</kbd> <kbd>⇧</kbd> <kbd>B</kbd>. The bar appears just under the address bar.
            </p>
          </div>
        </li>

        <li className={styles.step}>
          <span className={styles.stepNum}>02</span>
          <div className={styles.stepBody}>
            <h2 className={styles.stepTitle}>Drag this button to your bookmarks bar</h2>
            <p className={styles.stepText}>
              Click and hold the button, drag it up to the bookmarks bar, release. It will live there permanently — click it anytime you’re on a Pinterest board.
            </p>
            <div className={styles.dropArea}>
              <a
                ref={dragRef}
                href="#"
                className={styles.bookmarkBtn}
                onClick={(e) => e.preventDefault()}
                draggable="true"
              >
                ✦ Save board to Inkling
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
              If dragging is awkward: click <em>or copy URL</em>, then right-click the bookmarks bar → Add page → paste as the URL and name it <em>Save board to Inkling</em>.
            </p>
          </div>
        </li>

        <li className={styles.step}>
          <span className={styles.stepNum}>03</span>
          <div className={styles.stepBody}>
            <h2 className={styles.stepTitle}>Open the Pinterest board for this project and click the bookmark</h2>
            <p className={styles.stepText}>
              On any Pinterest board page, click the bookmark you just added. A floating panel appears at the bottom-right; the bookmark auto-scrolls the whole board, capturing every pin (you’ll see the count tick up). When it plateaus, a JSON file downloads.
            </p>
            <p className={styles.stepHint}>
              You can also click <em>Stop &amp; Download</em> at any point. A few hundred pins takes roughly 90 seconds.
            </p>
            <p className={styles.stepHint}>
              Re-importing the same board later only adds the new pins. Existing ones are kept as-is.
            </p>
          </div>
        </li>

        <li className={styles.step}>
          <span className={styles.stepNum}>04</span>
          <div className={styles.stepBody}>
            <h2 className={styles.stepTitle}>Drop the JSON here</h2>
            <p className={styles.stepText}>
              When the file is in your Downloads folder, drag it into the dashed area below — or click to pick it. We’ll preview the import before committing.
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
                  Source URL enrichment runs in the background after commit — each pin’s original site link populates as the server fetches the pin detail page (a minute or two for the full board).
                </p>
              </div>
            )}

            {importStatus?.kind === "committing" && (
              <p className={styles.stepHint}>Committing import…</p>
            )}

            {importStatus?.kind === "done" && (
              <div className={styles.done}>
                <strong>
                  {importStatus.added > 0
                    ? `${importStatus.added} new pin${importStatus.added === 1 ? "" : "s"} added.`
                    : "Nothing new to add."}
                </strong>{" "}
                {importStatus.updated > 0 && (
                  <>{importStatus.updated} already in your library, refreshed with the latest metadata. </>
                )}
                Library now holds {importStatus.librarySize} pins.{" "}
                <Link href="/library" className={styles.inlineLink}>Open library →</Link>
                <p className={styles.stepHint}>
                  {importStatus.local
                    ? "Palettes are extracting in the background. Open the library to watch them land. Sign in to also pull each pin’s source link, and to keep your board across devices."
                    : "Source URLs are populating in the background. Refresh /library in a minute to see them filled in."}
                </p>
              </div>
            )}
          </div>
        </li>
        </ol>
        </div>
        </div>
        )}
      </main>

      <footer className={styles.colophon}>
        <span>Inkling · No.&nbsp;01</span>
        <span>Every reference keeps a line home to its source.</span>
      </footer>
    </div>
  );
}
