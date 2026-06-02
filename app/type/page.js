"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { useProject } from "../../lib/useProject";
import ProjectSwitcher from "../../components/ProjectSwitcher";
import FontLoader, { fontStack } from "../../components/FontLoader";
import { addTypeToBoard } from "../../lib/addTypeToBoard";
import styles from "../recognize/page.module.css";
import t from "./page.module.css";

const SESSION_KEY = "moodbuilder.type.session.v1";

// Expressive vibe chips — each label set in a face that embodies it (the Adobe Fonts
// pattern). They map to the catalog's classification so the board fills with real faces.
const VIBES = [
  { key: "serif", label: "Editorial", font: "Fraunces" },
  { key: "sans", label: "Clean", font: "Inter" },
  { key: "display", label: "Loud", font: "Anton" },
  { key: "slab", label: "Sturdy", font: "Zilla Slab" },
  { key: "handwriting", label: "Hand", font: "Caveat" },
  { key: "mono", label: "Technical", font: "Space Mono" },
];

export default function TypePage() {
  const { project } = useProject();
  const [word, setWord] = useState("");
  const [vibe, setVibe] = useState("serif");
  const [facesByVibe, setFacesByVibe] = useState({}); // vibeKey → [family]
  const [loadingVibe, setLoadingVibe] = useState(false);
  const [kept, setKept] = useState([]); // your collected faces (family names)
  const [adding, setAdding] = useState(false);
  const [added, setAdded] = useState(false);
  const [error, setError] = useState(null);
  const hydrated = useRef(false);

  // The word everything is set in — your copy. Falls back to the project wordmark.
  const shown = word.trim() || project?.wordmark || "Your Brand";

  // Restore / persist your exploration (the word, the vibe, your kept faces).
  useEffect(() => {
    try {
      const s = JSON.parse(localStorage.getItem(SESSION_KEY) || "null");
      if (s && typeof s === "object") {
        if (typeof s.word === "string") setWord(s.word);
        if (s.vibe) setVibe(s.vibe);
        if (Array.isArray(s.kept)) setKept(s.kept);
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
      localStorage.setItem(SESSION_KEY, JSON.stringify({ word, vibe, kept }));
    } catch {
      /* storage off */
    }
  }, [word, vibe, kept]);

  // Fill the board with real faces of the chosen vibe (cached per vibe).
  useEffect(() => {
    if (facesByVibe[vibe]) return;
    let cancelled = false;
    setLoadingVibe(true);
    fetch(`/api/fonts/google?style=${vibe}&sort=popular&limit=28&page=0`)
      .then((r) => (r.ok ? r.json() : null))
      .then((d) => {
        if (cancelled || !d) return;
        setFacesByVibe((prev) => ({ ...prev, [vibe]: (d.families || []).map((f) => f.family) }));
      })
      .catch(() => {})
      .finally(() => !cancelled && setLoadingVibe(false));
    return () => {
      cancelled = true;
    };
  }, [vibe, facesByVibe]);

  const faces = facesByVibe[vibe] || [];

  // Load every face that's on screen — the active vibe, your kept set, and the
  // chip exemplars — so the whole board renders live in your words.
  const loadFamilies = useMemo(() => {
    const s = new Set();
    faces.forEach((f) => s.add(f));
    kept.forEach((f) => s.add(f));
    VIBES.forEach((v) => s.add(v.font));
    return [...s];
  }, [faces, kept]);

  const keptSet = useMemo(() => new Set(kept), [kept]);
  const toggleKeep = useCallback((family) => {
    setAdded(false);
    setKept((prev) => (prev.includes(family) ? prev.filter((f) => f !== family) : [...prev, family]));
  }, []);

  const addToBoard = useCallback(async () => {
    if (!kept.length || adding) return;
    setAdding(true);
    setError(null);
    try {
      await addTypeToBoard({ faces: kept.map((f) => ({ family: f })), word: shown });
      setAdded(true);
    } catch (e) {
      setError(e?.message || "Could not add to your board.");
    } finally {
      setAdding(false);
    }
  }, [kept, adding, shown]);

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
        Set every typeface in your own words and feel your way through. Keep the ones
        that fit; they collect on the right and land on your board.
      </p>

      {/* The copy you’re testing — change it once, the whole board re-typesets. */}
      <div className={t.copyBar}>
        <label className={t.copyLabel} htmlFor="type-word">Your words</label>
        <input
          id="type-word"
          className={t.copyInput}
          value={word}
          onChange={(e) => setWord(e.target.value)}
          placeholder={project?.wordmark || "Your Brand"}
          spellCheck={false}
        />
        <div className={t.vibes} role="group" aria-label="Browse by vibe">
          {VIBES.map((v) => (
            <button
              key={v.key}
              type="button"
              className={t.vibe}
              data-on={vibe === v.key ? "true" : undefined}
              onClick={() => setVibe(v.key)}
              style={{ fontFamily: fontStack({ family: v.font }, v.key === "sans" || v.key === "mono" ? "sans" : "serif") }}
            >
              {v.label}
            </button>
          ))}
        </div>
      </div>

      {/* No collection? Browse the vibes above. Already have favorites? Bring them. */}
      <SearchAdd shown={shown} keptSet={keptSet} onKeep={toggleKeep} />

      <div className={styles.layout}>
        <section className={styles.reactCol} aria-label="Typefaces">
          {loadingVibe && faces.length === 0 ? (
            <div className={styles.cardEmpty}>Loading type…</div>
          ) : (
            <div className={t.grid}>
              {faces.map((fam) => {
                const on = keptSet.has(fam);
                return (
                  <div key={fam} className={t.gridCard} data-kept={on ? "true" : undefined}>
                    <span
                      className={t.gridSpecimen}
                      style={{ fontFamily: fontStack({ family: fam }, "serif") }}
                    >
                      {shown}
                    </span>
                    <div className={t.gridFoot}>
                      <span className={t.gridName}>{fam}</span>
                      <button
                        type="button"
                        className={t.keepBtn}
                        data-on={on ? "true" : undefined}
                        onClick={() => toggleKeep(fam)}
                        aria-pressed={on}
                      >
                        {on ? "✓ Kept" : "Keep"}
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </section>

        <aside className={styles.directionCol} aria-label="Your type">
          <div className={styles.direction}>
            <h2 className={styles.directionH}>
              Your type <span className={t.count}>{kept.length}</span>
            </h2>
            {kept.length === 0 ? (
              <p className={styles.directionHint}>
                Browse a vibe, set it in your words, and <strong>Keep</strong> the faces
                that feel right. They collect here.
              </p>
            ) : (
              <>
                <ul className={t.keptList}>
                  {kept.map((fam) => (
                    <li key={fam} className={t.keptItem}>
                      <span
                        className={t.keptSpecimen}
                        style={{ fontFamily: fontStack({ family: fam }, "serif") }}
                      >
                        {shown}
                      </span>
                      <span className={t.keptRow}>
                        <span className={t.keptName}>{fam}</span>
                        <button type="button" className={t.keptRemove} onClick={() => toggleKeep(fam)} aria-label={`Remove ${fam}`}>
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
function SearchAdd({ shown, keptSet, onKeep }) {
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
      <span className={t.importLabel}>Already have favorites?</span>
      <div className={t.importField}>
        <input
          className={t.importInput}
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder="Add any font by name…"
          spellCheck={false}
          aria-label="Search the catalog to add a font by name"
        />
        {results.length > 0 && (
          <ul className={t.importResults}>
            {results.map((fam) => {
              const on = keptSet.has(fam);
              return (
                <li key={fam} className={t.importResult}>
                  <span className={t.importSpecimen} style={{ fontFamily: fontStack({ family: fam }, "serif") }}>
                    {shown}
                  </span>
                  <span className={t.importName}>{fam}</span>
                  <button
                    type="button"
                    className={t.keepBtn}
                    data-on={on ? "true" : undefined}
                    onClick={() => onKeep(fam)}
                    aria-pressed={on}
                  >
                    {on ? "✓ Kept" : "Keep"}
                  </button>
                </li>
              );
            })}
          </ul>
        )}
      </div>
      <span className={t.importNote}>Upload your own fonts — coming with sign-in.</span>
    </div>
  );
}
