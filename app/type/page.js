"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { useProject } from "../../lib/useProject";
import ProjectSwitcher from "../../components/ProjectSwitcher";
import SpokeNav from "../../components/SpokeNav";
import Submit from "../../components/Submit";
import FontLoader, { fontStack } from "../../components/FontLoader";
import { apiFetch } from "../../lib/api/client";
import { addTypeToBoard } from "../../lib/addTypeToBoard";
import { rankPairings } from "../../lib/fontPairings";
import styles from "../recognize/page.module.css";
import t from "./page.module.css";

const SESSION_KEY = "moodbuilder.type.session.v2";
const LEGACY_KEY = "moodbuilder.type.session.v1";
const PAGE = 24;

// Real type-classification names — the taxonomy a designer actually browses by,
// mapped 1:1 to the catalog's style facet. Each chip is set in a face of that
// style so you feel it as well as read it.
const STYLES = [
  { key: "serif", label: "Serif", font: "Fraunces", base: "serif" },
  { key: "sans", label: "Sans serif", font: "Inter", base: "sans" },
  { key: "slab", label: "Slab serif", font: "Zilla Slab", base: "serif" },
  { key: "display", label: "Display", font: "Anton", base: "sans" },
  { key: "handwriting", label: "Handwriting", font: "Caveat", base: "serif" },
  { key: "mono", label: "Monospace", font: "Space Mono", base: "sans" },
];

// A face carries its source: google | fontshare (catalog, with a slug for
// Fontshare), or url | upload for one you bring (with its url). Accepts a bare
// family string too (legacy / convenience).
const faceItem = (f) => {
  const o = typeof f === "string" ? { family: f } : f;
  const out = { kind: "face", family: o.family, source: o.source || "google" };
  if (o.slug) out.slug = o.slug;
  if (o.url) out.url = o.url;
  return out;
};
const keyOf = (it) =>
  it.kind === "pair" ? `pair:${it.display}|${it.text}` : `face:${it.source || "google"}:${it.family}`;

// Pull a usable font URL out of whatever someone pastes — a bare link, a full
// <link href="…"> embed tag, or an @import. When it's a Google Fonts link we can
// also read the family name off it, so they don't have to type it.
function parseFontUrl(raw) {
  let s = (raw || "").trim();
  const link = s.match(/href=["']([^"']+)["']/i);
  if (link) s = link[1];
  else {
    const imp = s.match(/@import\s+(?:url\()?["']?([^"')\s]+)/i);
    if (imp) s = imp[1];
  }
  s = s.trim();
  if (!/^https?:\/\//i.test(s)) return { url: null, family: null };
  let family = null;
  try {
    const u = new URL(s);
    if (/(^|\.)fonts\.googleapis\.com$/.test(u.hostname)) {
      const fam = u.searchParams.get("family"); // URLSearchParams turns + into space
      if (fam) family = fam.split(":")[0].trim();
    }
  } catch {
    /* not a parseable URL */
  }
  return { url: s, family };
}
const SOURCE_LABEL = { google: "Google Fonts", fontshare: "Fontshare" };

export default function TypePage() {
  const { project } = useProject();
  const [name, setName] = useState("");
  const [subhead, setSubhead] = useState("");
  const [mode, setMode] = useState("single"); // single | pairings
  const [byoOpen, setByoOpen] = useState(false); // "bring your own" panel
  const [style, setStyle] = useState("serif");
  const [styleData, setStyleData] = useState({}); // key → { families, total, page, hasMore }
  const [loadingStyle, setLoadingStyle] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);
  const [palette, setPalette] = useState([]);
  const [fontshare, setFontshare] = useState([]); // full Fontshare catalog (face objects)
  const [kept, setKept] = useState([]); // items: face | pair
  const [adding, setAdding] = useState(false);
  const [added, setAdded] = useState(false);
  const [error, setError] = useState(null);
  const hydrated = useRef(false);

  // The copy everything is set in — your words. Name falls back to the wordmark.
  const shownName = name.trim() || project?.wordmark || "Your Brand";
  const shownSub = subhead.trim();

  // Restore / persist your exploration. Migrate the v1 session (a flat list of
  // face names set in one "word") into the v2 shape (items + name + subhead).
  useEffect(() => {
    try {
      let s = JSON.parse(localStorage.getItem(SESSION_KEY) || "null");
      if (!s) {
        const v1 = JSON.parse(localStorage.getItem(LEGACY_KEY) || "null");
        if (v1 && typeof v1 === "object") {
          s = { name: v1.word, style: v1.vibe, kept: (v1.kept || []).map(faceItem) };
        }
      }
      if (s && typeof s === "object") {
        if (typeof s.name === "string") setName(s.name);
        if (typeof s.subhead === "string") setSubhead(s.subhead);
        if (s.mode === "single" || s.mode === "pairings") setMode(s.mode);
        if (s.style) setStyle(s.style);
        if (Array.isArray(s.kept)) {
          setKept(s.kept.map((k) => (typeof k === "string" ? faceItem(k) : k)).filter(Boolean));
        }
      }
    } catch {
      /* fresh */
    }
  }, []);
  useEffect(() => {
    if (!hydrated.current) {
      hydrated.current = true;
      return;
    }
    try {
      localStorage.setItem(SESSION_KEY, JSON.stringify({ name, subhead, mode, style, kept }));
    } catch {
      /* storage off */
    }
  }, [name, subhead, mode, style, kept]);

  // The colours you've gathered — so the pairings open in the order that suits them.
  useEffect(() => {
    apiFetch("/api/library/palette", { cache: "no-store" })
      .then((r) => r.json())
      .then((d) => {
        const out = [];
        const push = (h) => { if (typeof h === "string" && h.startsWith("#")) out.push(h); };
        (d.brand || []).forEach(push);
        (d.starred || []).forEach(push);
        (d.palette || []).forEach(push);
        setPalette(out);
      })
      .catch(() => {});
  }, []);

  // The second free library: Fontshare (free for commercial use, the modern
  // grotesks Google doesn't carry). Fetched once, filtered by style client-side.
  useEffect(() => {
    fetch("/api/fonts/fontshare")
      .then((r) => (r.ok ? r.json() : null))
      .then((d) => setFontshare(d?.families || []))
      .catch(() => {});
  }, []);

  // Fill the board with real faces of the chosen style (cached + paginated).
  useEffect(() => {
    if (mode !== "single" || styleData[style]) return;
    let cancelled = false;
    setLoadingStyle(true);
    fetch(`/api/fonts/google?style=${style}&sort=popular&limit=${PAGE}&page=0`)
      .then((r) => (r.ok ? r.json() : null))
      .then((d) => {
        if (cancelled || !d) return;
        setStyleData((prev) => ({
          ...prev,
          [style]: {
            families: (d.families || []).map((f) => ({ family: f.family, source: "google" })),
            total: d.total,
            page: 0,
            hasMore: d.hasMore,
          },
        }));
      })
      .catch(() => {})
      .finally(() => !cancelled && setLoadingStyle(false));
    return () => { cancelled = true; };
  }, [style, styleData, mode]);

  const cur = styleData[style];
  const googleFaces = cur?.families || [];
  const styleLabel = STYLES.find((s) => s.key === style)?.label || "";

  // Fontshare matches for this style lead the board (the quality addition), then
  // Google's popular faces. Both labelled — you always know what you're seeing.
  const fontshareFaces = useMemo(() => fontshare.filter((f) => f.style === style), [fontshare, style]);
  const browseFaces = useMemo(() => [...fontshareFaces, ...googleFaces], [fontshareFaces, googleFaces]);

  const loadMore = useCallback(() => {
    if (!cur?.hasMore || loadingMore) return;
    setLoadingMore(true);
    const next = cur.page + 1;
    fetch(`/api/fonts/google?style=${style}&sort=popular&limit=${PAGE}&page=${next}`)
      .then((r) => (r.ok ? r.json() : null))
      .then((d) => {
        if (!d) return;
        setStyleData((prev) => ({
          ...prev,
          [style]: {
            ...prev[style],
            families: [...prev[style].families, ...(d.families || []).map((f) => ({ family: f.family, source: "google" }))],
            page: next,
            hasMore: d.hasMore,
          },
        }));
      })
      .catch(() => {})
      .finally(() => setLoadingMore(false));
  }, [cur, style, loadingMore]);

  // Curated two-face systems, ranked to suit the colours you gathered.
  const pairings = useMemo(() => rankPairings({ palette }), [palette]);

  // Load every face on screen, plus your kept set and the chip exemplars, so the
  // whole board renders live in your words. Each entry is a font object so a
  // Fontshare face loads from its slug, not Google's CSS.
  const loadFonts = useMemo(() => {
    const map = new Map();
    const add = (fo) => {
      if (!fo?.family) return;
      const k = `${fo.source || "google"}:${fo.family}`;
      if (!map.has(k)) map.set(k, { family: fo.family, source: fo.source || "google", ...(fo.slug ? { slug: fo.slug } : {}), ...(fo.url ? { url: fo.url } : {}) });
    };
    if (mode === "single") browseFaces.forEach(add);
    else pairings.forEach((p) => { add({ family: p.display }); add({ family: p.text }); });
    kept.forEach((it) =>
      it.kind === "pair"
        ? (add({ family: it.display }), add({ family: it.text }))
        : add(it));
    STYLES.forEach((v) => add({ family: v.font }));
    return [...map.entries()];
  }, [mode, browseFaces, pairings, kept]);

  const keptKeys = useMemo(() => new Set(kept.map(keyOf)), [kept]);
  const isKept = useCallback((it) => keptKeys.has(keyOf(it)), [keptKeys]);
  const toggleKeep = useCallback((it) => {
    setAdded(false);
    const k = keyOf(it);
    setKept((prev) => (prev.some((p) => keyOf(p) === k) ? prev.filter((p) => keyOf(p) !== k) : [...prev, it]));
  }, []);

  const addToBoard = useCallback(async () => {
    if (!kept.length || adding) return;
    setAdding(true);
    setError(null);
    try {
      await addTypeToBoard({ items: kept, name: shownName, subhead: shownSub });
      setAdded(true);
    } catch (e) {
      setError(e?.message || "Could not add to your board.");
    } finally {
      setAdding(false);
    }
  }, [kept, adding, shownName, shownSub]);

  return (
    <div className={styles.page}>
      {loadFonts.map(([k, fo]) => (
        <FontLoader key={k} fonts={{ title: fo }} />
      ))}

      <header className={styles.bar}>
        <Link href="/" className={styles.back}>← Moodbuilder</Link>
        <ProjectSwitcher />
        <div className={styles.barTitle}>Type</div>
        <SpokeNav />
      </header>

      <p className={t.intro}>
        Type your name and a subhead, then browse two free libraries (Google Fonts and
        Fontshare) and keep the faces that feel right.
      </p>

      {/* The lens — your words. Change them once and every specimen re-typesets. */}
      <div className={t.words}>
        <div className={t.copyField}>
          <label className={t.copyLabel} htmlFor="type-name">Brand name</label>
          <input
            id="type-name"
            className={t.copyInput}
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder={project?.wordmark || "Your Brand"}
            spellCheck={false}
          />
        </div>
        <div className={t.copyField}>
          <label className={t.copyLabel} htmlFor="type-subhead">Subhead <span className={t.optional}>(optional)</span></label>
          <input
            id="type-subhead"
            className={t.copyInput}
            value={subhead}
            onChange={(e) => setSubhead(e.target.value)}
            placeholder="A line that sits beneath it"
            spellCheck={false}
          />
        </div>
      </div>

      {/* How you explore — sticky, so it stays with you while you scan the board. */}
      <div className={t.toolbar}>
        <div className={t.toolbarInner}>
          <div className={t.modeToggle} role="group" aria-label="How to browse">
            <button type="button" className={t.modeBtn} data-on={mode === "single" ? "true" : undefined} onClick={() => setMode("single")}>
              One typeface
            </button>
            <button type="button" className={t.modeBtn} data-on={mode === "pairings" ? "true" : undefined} onClick={() => setMode("pairings")}>
              Pairings
            </button>
          </div>
          {mode === "single" && (
            <div className={t.vibes} role="group" aria-label="Browse by type style">
              {STYLES.map((v) => (
                <button
                  key={v.key}
                  type="button"
                  className={t.vibe}
                  data-on={style === v.key ? "true" : undefined}
                  onClick={() => setStyle(v.key)}
                  style={{ fontFamily: fontStack({ family: v.font }, v.base) }}
                >
                  {v.label}
                </button>
              ))}
            </div>
          )}
          <button
            type="button"
            className={t.byoToggle}
            data-on={byoOpen ? "true" : undefined}
            onClick={() => setByoOpen((v) => !v)}
            aria-expanded={byoOpen}
          >
            + Bring your own
          </button>
        </div>
      </div>

      {byoOpen && (
        <BringYourOwn
          shownName={shownName}
          isKept={isKept}
          onKeep={toggleKeep}
          fontshare={fontshare}
          onClose={() => setByoOpen(false)}
        />
      )}

      <main className={t.board} aria-label="Typefaces">
        {mode === "single" ? (
          loadingStyle && browseFaces.length === 0 ? (
            <div className={styles.cardEmpty}>Loading type…</div>
          ) : (
            <>
              <p className={t.gridMeta}>
                Showing {fontshareFaces.length} Fontshare and {googleFaces.length}
                {cur?.total ? ` of ${cur.total}` : ""} Google {styleLabel.toLowerCase()} faces
              </p>
              <div className={t.grid}>
                {browseFaces.map((face) => {
                  const item = faceItem(face);
                  const on = isKept(item);
                  const base = face.source === "fontshare" ? "sans" : STYLES.find((s) => s.key === style)?.base || "serif";
                  const stack = fontStack({ family: face.family }, base);
                  return (
                    <div key={keyOf(item)} className={t.gridCard} data-kept={on ? "true" : undefined}>
                      <div className={t.gridSpecimen}>
                        <span className={t.specName} style={{ fontFamily: stack }}>{shownName}</span>
                        {shownSub && <span className={t.specSub} style={{ fontFamily: stack }}>{shownSub}</span>}
                      </div>
                      <div className={t.gridFoot}>
                        <span className={t.gridName}>
                          {face.family}
                          <span className={t.sourceTag} data-src={face.source}>{face.source === "fontshare" ? "Fontshare" : "Google"}</span>
                        </span>
                        <button type="button" className={t.keepBtn} data-on={on ? "true" : undefined} onClick={() => toggleKeep(item)} aria-pressed={on}>
                          {on ? "✓ Kept" : "Keep"}
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
              {cur?.hasMore && (
                <button type="button" className={t.showMore} onClick={loadMore} disabled={loadingMore}>
                  {loadingMore ? "Loading…" : `Show more Google ${styleLabel.toLowerCase()} faces`}
                </button>
              )}
            </>
          )
        ) : (
          <>
            <p className={t.gridMeta}>
              {pairings.length} curated pairings, ordered to suit your colors. Each sets your name and subhead in two faces that work together.
            </p>
            <div className={t.grid}>
              {pairings.map((p) => {
                const item = { kind: "pair", display: p.display, text: p.text };
                const on = isKept(item);
                return (
                  <div key={p.id} className={t.gridCard} data-kept={on ? "true" : undefined}>
                    <div className={t.gridSpecimen}>
                      <span className={t.specName} style={{ fontFamily: fontStack({ family: p.display }, "serif") }}>{shownName}</span>
                      <span className={t.specSub} style={{ fontFamily: fontStack({ family: p.text }, "sans") }}>
                        {shownSub || "Add a subhead above to set it"}
                      </span>
                    </div>
                    <div className={t.gridFoot}>
                      <span className={t.gridName}>{p.display} + {p.text}{p.source ? ` · via ${p.source}` : ""}</span>
                      <button type="button" className={t.keepBtn} data-on={on ? "true" : undefined} onClick={() => toggleKeep(item)} aria-pressed={on}>
                        {on ? "✓ Kept" : "Keep"}
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          </>
        )}
      </main>

      <TypeSources />

      <CollectedBar
        kept={kept}
        shownName={shownName}
        added={added}
        adding={adding}
        error={error}
        onAdd={addToBoard}
        onRemove={toggleKeep}
      />
    </div>
  );
}

// Where the type comes from, and how to reach further. The in-app library is
// Google Fonts (live, free); everything else is a foundry you link out to and
// bring in by name, a URL into your library, or (with sign-in) an upload. Lorin's
// review: name the source, and make the foundries + resource library reachable
// right here, not buried.
function TypeSources() {
  const [foundries, setFoundries] = useState([]);

  useEffect(() => {
    fetch("/api/fonts/foundries")
      .then((r) => (r.ok ? r.json() : null))
      .then((d) => setFoundries(d?.foundries || []))
      .catch(() => {});
  }, []);

  return (
    <section className={t.sources} aria-label="Bring type from anywhere">
      <div className={t.sourcesHead}>
        <h2 className={t.sourcesTitle}>Bring type from anywhere</h2>
        <p className={t.sourcesIntro}>
          Everything above is browseable live and free: Google Fonts and Fontshare (the
          modern grotesks free for commercial use). For the rest of the type world, these
          are the foundries worth knowing. Browse one, then pull a face in with
          <strong> Bring your own</strong> at the top (by name, by URL, or upload).
        </p>
      </div>
      {foundries.length > 0 && (
        <ul className={t.foundryList}>
          {foundries.map((f) => (
            <li key={f.url}>
              <a className={t.foundryChip} href={f.url} target="_blank" rel="noopener noreferrer">
                <span className={t.foundryName}>{f.name}</span>
                {f.tier && <span className={t.foundryTier} data-tier={f.tier}>{f.tier}</span>}
                <span className={t.foundryArrow} aria-hidden="true">↗</span>
              </a>
            </li>
          ))}
        </ul>
      )}
      <div className={t.sourcesActions}>
        <Submit kind="resource" defaultCategory="foundries" trigger="Suggest a foundry" className={t.sourcesSubmit} />
        <Link href="/resources" className={t.sourcesLink}>Open the resource library →</Link>
      </div>
    </section>
  );
}

// The collection, as a sticky tray along the bottom — it fills as you keep faces
// (accumulation you can feel) and holds the one move forward, so the whole width
// stays free for comparing specimens. Absent until you've kept something.
function CollectedBar({ kept, shownName, added, adding, error, onAdd, onRemove }) {
  if (kept.length === 0 && !added) return null;
  return (
    <div className={t.collected} role="region" aria-label="Your collected type">
      <div className={t.collectedInner}>
        {added ? (
          <>
            <p className={t.collectedDone}>✓ Added <strong>{kept.length}</strong> to your board</p>
            <Link href="/moodboard" className={t.collectedCta}>Open your board →</Link>
          </>
        ) : (
          <>
            <span className={t.collectedCount}>{kept.length} kept</span>
            <ul className={t.collectedChips}>
              {kept.map((it) => {
                const face = it.kind === "pair" ? it.display : it.family;
                const label = it.kind === "pair" ? `${it.display} and ${it.text}` : it.family;
                return (
                  <li key={keyOf(it)} className={t.chip}>
                    <span className={t.chipFace} style={{ fontFamily: fontStack({ family: face }, "serif") }} title={it.kind === "pair" ? `${it.display} + ${it.text}` : it.family}>
                      {shownName}
                    </span>
                    <button type="button" className={t.chipRemove} onClick={() => onRemove(it)} aria-label={`Remove ${label}`}>×</button>
                  </li>
                );
              })}
            </ul>
            {error && <span className={t.collectedError}>{error}</span>}
            <button type="button" className={t.collectedCta} onClick={onAdd} disabled={adding}>
              {adding ? "Adding…" : `Add ${kept.length} to your board`}
            </button>
          </>
        )}
      </div>
    </div>
  );
}

// Import path: search both free libraries by name and add favorites you already
// know it, paste a hosted URL, or (with sign-in) upload your own. Replaces the
// cramped toolbar search with one intentional home for everything you bring.
const BYO_TABS = [
  { key: "search", label: "Search by name" },
  { key: "url", label: "Paste embed code" },
  { key: "upload", label: "Upload" },
];

function BringYourOwn({ shownName, isKept, onKeep, fontshare = [], onClose }) {
  const [tab, setTab] = useState("search");
  const [q, setQ] = useState("");
  const [google, setGoogle] = useState([]);
  const [urlName, setUrlName] = useState("");
  const [urlSrc, setUrlSrc] = useState("");
  const [urlMsg, setUrlMsg] = useState(null); // { kind: err|pending|ok|warn, text }
  const alive = useRef(true);

  // Esc closes the panel.
  useEffect(() => {
    const onKey = (e) => { if (e.key === "Escape") onClose?.(); };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);
  useEffect(() => { alive.current = true; return () => { alive.current = false; }; }, []);

  // Search both catalogs by name (Google over the network, Fontshare locally).
  useEffect(() => {
    if (q.trim().length < 2) { setGoogle([]); return; }
    const ctl = new AbortController();
    const id = setTimeout(() => {
      fetch(`/api/fonts/google?q=${encodeURIComponent(q)}&limit=8&page=0`, { signal: ctl.signal })
        .then((r) => (r.ok ? r.json() : null))
        .then((d) => setGoogle((d?.families || []).map((f) => ({ family: f.family, source: "google" }))))
        .catch(() => {});
    }, 200);
    return () => { clearTimeout(id); ctl.abort(); };
  }, [q]);

  const query = q.trim().toLowerCase();
  const fsMatches = query.length >= 2 ? fontshare.filter((f) => f.family.toLowerCase().includes(query)).slice(0, 6) : [];
  const results = [...fsMatches, ...google];

  // Reading the link as it's typed/pasted lets us fill the family name from a
  // Google link, so there's one less thing to get exactly right.
  function onUrlChange(v) {
    setUrlSrc(v);
    setUrlMsg(null);
    const { family } = parseFontUrl(v);
    if (family && !urlName.trim()) setUrlName(family);
  }

  async function addByUrl() {
    const { url, family } = parseFontUrl(urlSrc);
    const name = urlName.trim() || family || "";
    if (!url) {
      setUrlMsg({ kind: "err", text: "Paste embed code (a <link> or @import), or a direct font link." });
      return;
    }
    if (!name) {
      setUrlMsg({ kind: "err", text: "Add the family name the foundry lists, so the face can render." });
      return;
    }
    const isFile = /\.(woff2?|otf|ttf)(\?|$)/i.test(url);
    onKeep({ kind: "face", family: name, source: isFile ? "upload" : "url", url });
    setUrlMsg({ kind: "pending", text: `Adding ${name}…` });
    const target = name;
    setUrlName(""); setUrlSrc("");
    // Confirm it actually rendered — the only way to catch a link that's really a
    // web page (no font in it) or a family name that doesn't match the file.
    setTimeout(async () => {
      // A real load registers a FontFace under this family. document.fonts.check()
      // can't tell that apart from an unknown family (it assumes a fallback), so we
      // look for an actually-loaded FontFace whose family matches.
      const want = target.replace(/['"]/g, "").toLowerCase();
      let ok = false;
      try {
        for (let i = 0; i < 5 && !ok; i++) {
          try { await document.fonts.load(`24px "${target}"`); } catch { /* nothing matched */ }
          document.fonts.forEach((ff) => {
            if (ff.status === "loaded" && ff.family.replace(/['"]/g, "").toLowerCase() === want) ok = true;
          });
          if (!ok) await new Promise((r) => setTimeout(r, 400));
        }
      } catch { ok = false; }
      if (!alive.current) return;
      setUrlMsg(
        ok
          ? { kind: "ok", text: `✓ Added ${target}. Find it in your collection at the bottom.` }
          : { kind: "warn", text: `Added ${target}, but it isn’t rendering. That link looks like a web page, not the font itself. For a font you downloaded from a foundry, use Upload. Otherwise paste the embed code, and check the family name.` }
      );
    }, 300);
  }

  return (
    <div className={t.byo} role="region" aria-label="Bring your own type">
      {results.map((f) => (
        <FontLoader key={`${f.source}:${f.family}`} fonts={{ title: f }} />
      ))}
      <div className={t.byoHead}>
        <div className={t.byoTabs} role="tablist" aria-label="Bring your own type">
          {BYO_TABS.map((tb) => (
            <button
              key={tb.key}
              type="button"
              role="tab"
              aria-selected={tab === tb.key}
              className={t.byoTab}
              data-on={tab === tb.key ? "true" : undefined}
              onClick={() => setTab(tb.key)}
            >
              {tb.label}
            </button>
          ))}
        </div>
        <button type="button" className={t.byoClose} onClick={onClose} aria-label="Close">×</button>
      </div>

      <div className={t.byoBody}>
        {tab === "search" && (
          <>
            <input
              className={t.byoInput}
              value={q}
              onChange={(e) => setQ(e.target.value)}
              placeholder="Search Google Fonts and Fontshare by name…"
              spellCheck={false}
              autoFocus
              aria-label="Search both free libraries by name"
            />
            {results.length > 0 ? (
              <ul className={t.byoResults}>
                {results.map((f) => {
                  const item = faceItem(f);
                  const on = isKept(item);
                  return (
                    <li key={`${f.source}:${f.family}`} className={t.byoResult}>
                      <span className={t.byoResultName} style={{ fontFamily: fontStack({ family: f.family }, "serif") }}>{f.family}</span>
                      <span className={t.sourceTag} data-src={f.source}>{f.source === "fontshare" ? "Fontshare" : "Google"}</span>
                      <button type="button" className={t.keepBtn} data-on={on ? "true" : undefined} onClick={() => onKeep(item)} aria-pressed={on}>
                        {on ? "✓ Kept" : "Keep"}
                      </button>
                    </li>
                  );
                })}
              </ul>
            ) : (
              <p className={t.byoHint}>Already know the face? Type its name to find it in either library.</p>
            )}
          </>
        )}

        {tab === "url" && (
          <>
            <div className={t.byoUrlRow}>
              <input
                className={`${t.byoInput} ${t.byoUrlSrc}`}
                value={urlSrc}
                onChange={(e) => onUrlChange(e.target.value)}
                placeholder="Paste embed code (Adobe, Google, a foundry)"
                spellCheck={false}
                autoFocus
                aria-label="Embed code or font link"
              />
              <input
                className={`${t.byoInput} ${t.byoUrlName}`}
                value={urlName}
                onChange={(e) => { setUrlName(e.target.value); setUrlMsg(null); }}
                placeholder="Family name"
                spellCheck={false}
                aria-label="Family name for the font at this URL"
              />
              <button type="button" className={t.byoAdd} onClick={addByUrl}>Add</button>
            </div>
            <p className={t.byoHint} data-kind={urlMsg?.kind}>
              {urlMsg?.text || "The embed code from Adobe Fonts, Google Fonts, or a foundry (a direct font link works too). We fill the family name when we can. For a downloaded font file, use Upload."}
            </p>
          </>
        )}

        {tab === "upload" && (
          <div className={t.byoUploadRow}>
            <button type="button" className={t.byoUpload} disabled title="Sign in to upload your own font files">
              Sign in to upload
            </button>
            <p className={t.byoHint}>Bring licensed .woff2, .otf, or .ttf files from your computer. Saved to your account once you sign in.</p>
          </div>
        )}
      </div>
    </div>
  );
}
