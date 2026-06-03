"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { useProject } from "../../lib/useProject";
import ProjectSwitcher from "../../components/ProjectSwitcher";
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
  { key: "handwriting", label: "Script", font: "Caveat", base: "serif" },
  { key: "mono", label: "Monospace", font: "Space Mono", base: "sans" },
];

const faceItem = (family) => ({ kind: "face", family });
const keyOf = (it) => (it.kind === "pair" ? `pair:${it.display}|${it.text}` : `face:${it.family}`);

export default function TypePage() {
  const { project } = useProject();
  const [name, setName] = useState("");
  const [subhead, setSubhead] = useState("");
  const [mode, setMode] = useState("single"); // single | pairings
  const [style, setStyle] = useState("serif");
  const [styleData, setStyleData] = useState({}); // key → { families, total, page, hasMore }
  const [loadingStyle, setLoadingStyle] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);
  const [palette, setPalette] = useState([]);
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
          [style]: { families: (d.families || []).map((f) => f.family), total: d.total, page: 0, hasMore: d.hasMore },
        }));
      })
      .catch(() => {})
      .finally(() => !cancelled && setLoadingStyle(false));
    return () => { cancelled = true; };
  }, [style, styleData, mode]);

  const cur = styleData[style];
  const faces = cur?.families || [];
  const styleLabel = STYLES.find((s) => s.key === style)?.label || "";

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
            families: [...prev[style].families, ...(d.families || []).map((f) => f.family)],
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
  // whole board renders live in your words.
  const loadFamilies = useMemo(() => {
    const s = new Set();
    if (mode === "single") faces.forEach((f) => s.add(f));
    else pairings.forEach((p) => { s.add(p.display); s.add(p.text); });
    kept.forEach((it) => (it.kind === "pair" ? (s.add(it.display), s.add(it.text)) : s.add(it.family)));
    STYLES.forEach((v) => s.add(v.font));
    return [...s];
  }, [mode, faces, pairings, kept]);

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
      {loadFamilies.map((f) => (
        <FontLoader key={f} fonts={{ title: { family: f, source: "google" } }} />
      ))}

      <header className={styles.bar}>
        <Link href="/" className={styles.back}>← Moodbuilder</Link>
        <ProjectSwitcher />
        <div className={styles.barTitle}>Type</div>
      </header>

      <p className={styles.lede}>
        Browse the full Google Fonts library (1,900+ free typefaces), set in your own
        words. Keep the ones that fit; they collect on the right and land on your board.
      </p>

      {/* The copy you’re testing — change it once, the whole board re-typesets. */}
      <div className={t.copyBar}>
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
        <div className={t.modeToggle} role="group" aria-label="How to browse">
          <button type="button" className={t.modeBtn} data-on={mode === "single" ? "true" : undefined} onClick={() => setMode("single")}>
            One typeface
          </button>
          <button type="button" className={t.modeBtn} data-on={mode === "pairings" ? "true" : undefined} onClick={() => setMode("pairings")}>
            Pairings
          </button>
        </div>
      </div>

      {/* In one-typeface mode, narrow by real type classification. */}
      {mode === "single" && (
        <div className={t.styleRow}>
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
        </div>
      )}

      {/* Bring favorites you already know by name, whichever mode you're in. */}
      <SearchAdd shownName={shownName} isKept={isKept} onKeep={toggleKeep} />

      <div className={styles.layout}>
        <section className={styles.reactCol} aria-label="Typefaces">
          {mode === "single" ? (
            loadingStyle && faces.length === 0 ? (
              <div className={styles.cardEmpty}>Loading type…</div>
            ) : (
              <>
                <div className={t.gridMeta}>
                  Showing {faces.length}{cur?.total ? ` of ${cur.total}` : ""} {styleLabel.toLowerCase()} faces
                </div>
                <div className={t.grid}>
                  {faces.map((fam) => {
                    const item = faceItem(fam);
                    const on = isKept(item);
                    const stack = fontStack({ family: fam }, STYLES.find((s) => s.key === style)?.base || "serif");
                    return (
                      <div key={fam} className={t.gridCard} data-kept={on ? "true" : undefined}>
                        <div className={t.gridSpecimen}>
                          <span className={t.specName} style={{ fontFamily: stack }}>{shownName}</span>
                          {shownSub && <span className={t.specSub} style={{ fontFamily: stack }}>{shownSub}</span>}
                        </div>
                        <div className={t.gridFoot}>
                          <span className={t.gridName}>{fam}</span>
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
                    {loadingMore ? "Loading…" : `Show more ${styleLabel.toLowerCase()} faces`}
                  </button>
                )}
              </>
            )
          ) : (
            <>
              <div className={t.gridMeta}>
                {pairings.length} curated pairings, ordered to suit your colors. Each sets your name and subhead in two faces that work together.
              </div>
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
        </section>

        <aside className={styles.directionCol} aria-label="Your type">
          <div className={styles.direction}>
            <h2 className={styles.directionH}>
              Your type <span className={t.count}>{kept.length}</span>
            </h2>
            {kept.length === 0 ? (
              <p className={styles.directionHint}>
                Browse a style or a pairing, set it in your words, and <strong>Keep</strong> the
                faces that feel right. They collect here.
              </p>
            ) : (
              <>
                <ul className={t.keptList}>
                  {kept.map((it) => (
                    <li key={keyOf(it)} className={t.keptItem}>
                      {it.kind === "pair" ? (
                        <span className={t.keptSpecimen}>
                          <span className={t.specName} style={{ fontFamily: fontStack({ family: it.display }, "serif") }}>{shownName}</span>
                          <span className={t.specSub} style={{ fontFamily: fontStack({ family: it.text }, "sans") }}>{shownSub || "Your subhead"}</span>
                        </span>
                      ) : (
                        <span className={t.keptSpecimen}>
                          <span className={t.specName} style={{ fontFamily: fontStack({ family: it.family }, "serif") }}>{shownName}</span>
                          {shownSub && <span className={t.specSub} style={{ fontFamily: fontStack({ family: it.family }, "serif") }}>{shownSub}</span>}
                        </span>
                      )}
                      <span className={t.keptRow}>
                        <span className={t.keptName}>
                          {it.kind === "pair" ? `${it.display} + ${it.text}` : it.family}
                        </span>
                        <button type="button" className={t.keptRemove} onClick={() => toggleKeep(it)} aria-label={`Remove ${it.kind === "pair" ? `${it.display} and ${it.text}` : it.family}`}>
                          ×
                        </button>
                      </span>
                    </li>
                  ))}
                </ul>

                {added ? (
                  <div className={styles.directionSaved}>
                    <p className={styles.directionSavedTitle}>
                      ✓ Added <strong>{kept.length}</strong> to your board
                    </p>
                    <div className={styles.directionActions}>
                      <Link href="/moodboard" className={styles.directionPrimary}>
                        Open your board →
                      </Link>
                    </div>
                  </div>
                ) : (
                  <>
                    <button type="button" className={styles.makeDirection} onClick={addToBoard} disabled={adding}>
                      {adding ? "Adding…" : `Add ${kept.length} to your board`}
                    </button>
                    <p className={styles.reflectHint}>
                      Drops your kept type onto the same board as your colors, as live specimens.
                    </p>
                  </>
                )}
                {error && <p className={styles.directionError}>{error}</p>}
              </>
            )}
          </div>
        </aside>
      </div>
    </div>
  );
}

// Import path: search the catalog by name and add favorites you already know — for
// anyone who arrives with a list, not a blank slate. (Upload-your-own is next.)
function SearchAdd({ shownName, isKept, onKeep }) {
  const [q, setQ] = useState("");
  const [results, setResults] = useState([]);

  useEffect(() => {
    if (q.trim().length < 2) {
      setResults([]);
      return;
    }
    const ctl = new AbortController();
    const id = setTimeout(() => {
      fetch(`/api/fonts/google?q=${encodeURIComponent(q)}&limit=8&page=0`, { signal: ctl.signal })
        .then((r) => (r.ok ? r.json() : null))
        .then((d) => setResults((d?.families || []).map((f) => f.family)))
        .catch(() => {});
    }, 200);
    return () => {
      clearTimeout(id);
      ctl.abort();
    };
  }, [q]);

  return (
    <div className={t.importBar}>
      {results.map((fam) => (
        <FontLoader key={fam} fonts={{ title: { family: fam, source: "google" } }} />
      ))}
      <span className={t.importLabel}>Already have a favorite?</span>
      <div className={t.importField}>
        <input
          className={t.importInput}
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder="Add any Google font by name…"
          spellCheck={false}
          aria-label="Search the catalog to add a font by name"
        />
        {results.length > 0 && (
          <ul className={t.importResults}>
            {results.map((fam) => {
              const item = faceItem(fam);
              const on = isKept(item);
              return (
                <li key={fam} className={t.importResult}>
                  <span className={t.importSpecimen} style={{ fontFamily: fontStack({ family: fam }, "serif") }}>
                    {shownName}
                  </span>
                  <span className={t.importName}>{fam}</span>
                  <button type="button" className={t.keepBtn} data-on={on ? "true" : undefined} onClick={() => onKeep(item)} aria-pressed={on}>
                    {on ? "✓ Kept" : "Keep"}
                  </button>
                </li>
              );
            })}
          </ul>
        )}
      </div>
    </div>
  );
}
