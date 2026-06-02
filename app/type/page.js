"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { apiFetch } from "../../lib/api/client";
import { useProject } from "../../lib/useProject";
import ProjectSwitcher from "../../components/ProjectSwitcher";
import FontLoader, { fontStack } from "../../components/FontLoader";
import { REACTIONS } from "../../lib/recognition";
import { rankPairings } from "../../lib/fontPairings";
import { addTypeToBoard } from "../../lib/addTypeToBoard";
import styles from "../recognize/page.module.css";
import t from "./page.module.css";

const SESSION_KEY = "moodbuilder.type.session.v1";
const LABEL = Object.fromEntries(REACTIONS.map((r) => [r.key, r.label]));
const DECK_SIZE = 24;
const KEPT = new Set(["yes", "sure", "maybe"]); // "worth taking to the next round"

export default function TypePage() {
  const { project } = useProject();
  const wordmark = project?.wordmark || "Your Brand";
  const [pairings, setPairings] = useState([]);
  const [loaded, setLoaded] = useState(false);
  const [reactions, setReactions] = useState({}); // pairingId → reaction key
  const [activeId, setActiveId] = useState(null);
  const [adding, setAdding] = useState(false);
  const [added, setAdded] = useState(false);
  const [error, setError] = useState(null);
  const hydrated = useRef(false);

  // Mood-rank the deck by the colors you already gathered (the project palette), so
  // the faces that suit your direction come up first. Same engine as recognize.
  useEffect(() => {
    let cancelled = false;
    apiFetch("/api/library/palette", { cache: "no-store" })
      .then((r) => (r.ok ? r.json() : null))
      .then((data) => {
        if (cancelled) return;
        const palette = (data?.palette || []).slice(0, 24);
        setPairings(rankPairings({ palette }).slice(0, DECK_SIZE));
      })
      .catch(() => !cancelled && setPairings(rankPairings({}).slice(0, DECK_SIZE)))
      .finally(() => !cancelled && setLoaded(true));
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    if (!activeId && pairings.length) setActiveId(pairings[0].id);
  }, [pairings, activeId]);

  useEffect(() => {
    try {
      const s = JSON.parse(localStorage.getItem(SESSION_KEY) || "null");
      if (s && typeof s === "object") {
        if (s.reactions) setReactions(s.reactions);
        if (s.activeId) setActiveId(s.activeId);
      }
    } catch {
      /* fresh session */
    }
  }, []);
  useEffect(() => {
    if (!hydrated.current) {
      hydrated.current = true;
      return;
    }
    try {
      localStorage.setItem(SESSION_KEY, JSON.stringify({ reactions, activeId }));
    } catch {
      /* storage off */
    }
  }, [reactions, activeId]);

  const families = useMemo(() => {
    const s = new Set();
    pairings.forEach((p) => {
      s.add(p.display);
      s.add(p.text);
    });
    return [...s];
  }, [pairings]);

  const active = pairings.find((p) => p.id === activeId) || null;
  const reactedCount = Object.keys(reactions).length;
  const kept = pairings.filter((p) => KEPT.has(reactions[p.id]));

  const react = useCallback(
    (id, key) => {
      if (!id) return;
      const updated = { ...reactions, [id]: key };
      setReactions(updated);
      setAdded(false);
      if (activeId === id) {
        const idx = pairings.findIndex((p) => p.id === id);
        const next =
          pairings.slice(idx + 1).find((p) => !updated[p.id]) || pairings.find((p) => !updated[p.id]);
        if (next) setActiveId(next.id);
      }
    },
    [reactions, activeId, pairings],
  );

  useEffect(() => {
    const onKey = (e) => {
      if (e.metaKey || e.ctrlKey || e.altKey) return;
      const tag = e.target?.tagName;
      if (tag === "INPUT" || tag === "TEXTAREA") return;
      const idx = ["1", "2", "3", "4", "5"].indexOf(e.key);
      if (idx >= 0 && REACTIONS[idx] && activeId) {
        e.preventDefault();
        react(activeId, REACTIONS[idx].key);
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [react, activeId]);

  const reset = useCallback(() => {
    setReactions({});
    setAdded(false);
    setActiveId(pairings[0]?.id ?? null);
    try {
      localStorage.removeItem(SESSION_KEY);
    } catch {
      /* fine */
    }
  }, [pairings]);

  const addToBoard = useCallback(async () => {
    if (!kept.length || adding) return;
    setAdding(true);
    setError(null);
    try {
      await addTypeToBoard({ pairings: kept, wordmark });
      setAdded(true);
    } catch (e) {
      setError(e?.message || "Could not add to your board.");
    } finally {
      setAdding(false);
    }
  }, [kept, adding, wordmark]);

  return (
    <div className={styles.page}>
      {families.map((f) => (
        <FontLoader key={f} fonts={{ title: { family: f, source: "google" } }} />
      ))}

      <header className={styles.bar}>
        <Link href="/" className={styles.back}>← Moodbuilder</Link>
        <ProjectSwitcher />
        <div className={styles.barTitle}>Type</div>
      </header>

      <p className={styles.lede}>
        React to type the way you reacted to your inspiration. The faces that suit the
        colors you gathered come first; keep the ones that feel right.
      </p>

      <div className={styles.layout}>
        <section className={styles.reactCol} aria-label="React to a typeface">
          {!loaded ? (
            <div className={styles.cardEmpty}>Loading type…</div>
          ) : !active ? (
            <div className={styles.cardEmpty}>No type to show.</div>
          ) : (
            <>
              <div className={`${styles.card} ${t.specimenCard}`} key={active.id}>
                <div className={t.specimen}>
                  <span
                    className={t.specimenWordmark}
                    style={{ fontFamily: fontStack({ family: active.display }, "serif") }}
                  >
                    {wordmark}
                  </span>
                  <span
                    className={t.specimenSample}
                    style={{ fontFamily: fontStack({ family: active.text }, "sans") }}
                  >
                    The quick brown fox jumps over the lazy dog.
                  </span>
                  <span className={t.specimenMeta}>
                    {active.display === active.text ? active.display : `${active.display} + ${active.text}`}
                    {active.source ? ` · via ${active.source}` : ""}
                  </span>
                </div>

                <div className={styles.reactions} role="group" aria-label="How does this land?">
                  {REACTIONS.map((r, i) => (
                    <button
                      key={r.key}
                      type="button"
                      className={styles.reactBtn}
                      data-key={r.key}
                      data-on={reactions[active.id] === r.key ? "true" : undefined}
                      onClick={() => react(active.id, r.key)}
                      aria-pressed={reactions[active.id] === r.key}
                      aria-label={`${r.label} — ${r.hint}`}
                    >
                      <span className={styles.reactNum}>{i + 1}</span>
                      <span className={styles.reactLabel}>{r.label}</span>
                    </button>
                  ))}
                </div>

                <p className={styles.progress}>
                  <strong>{reactedCount}</strong> of {pairings.length} sorted
                  <span className={styles.kbdHint}>press 1–5</span>
                  {reactedCount > 0 && (
                    <button type="button" className={styles.resetInline} onClick={reset}>
                      Start over
                    </button>
                  )}
                </p>
              </div>

              <div className={styles.boardWrap}>
                <p className={styles.boardLabel}>Type that suits your colors · pick any, in any order</p>
                <div className={t.typeBoard}>
                  {pairings.map((p) => {
                    const k = reactions[p.id];
                    return (
                      <button
                        key={p.id}
                        type="button"
                        className={t.typeChip}
                        data-active={p.id === activeId ? "true" : undefined}
                        data-reacted={k ? "true" : undefined}
                        onClick={() => setActiveId(p.id)}
                        title={`${p.display} + ${p.text}`}
                      >
                        <span style={{ fontFamily: fontStack({ family: p.display }, "serif") }}>{p.display}</span>
                        {k && (
                          <span className={t.typeBadge} data-key={k}>
                            {LABEL[k]}
                          </span>
                        )}
                      </button>
                    );
                  })}
                </div>
              </div>
            </>
          )}
        </section>

        <aside className={styles.directionCol} aria-label="Your type">
          <div className={styles.direction}>
            <h2 className={styles.directionH}>Your type so far</h2>
            {kept.length === 0 ? (
              <p className={styles.directionHint}>
                Mark a typeface <strong>YES</strong>, <strong>Sure</strong>, or{" "}
                <strong>Maybe</strong>, and it collects here.
              </p>
            ) : (
              <>
                <ul className={t.keptList}>
                  {kept.map((p) => (
                    <li key={p.id} className={t.keptItem}>
                      <span
                        className={t.keptName}
                        style={{ fontFamily: fontStack({ family: p.display }, "serif") }}
                      >
                        {p.display}
                      </span>
                      {p.display !== p.text && <span className={t.keptText}>+ {p.text}</span>}
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
                    <button
                      type="button"
                      className={styles.makeDirection}
                      onClick={addToBoard}
                      disabled={adding}
                    >
                      {adding ? "Adding…" : `Add ${kept.length} to your board`}
                    </button>
                    <p className={styles.reflectHint}>
                      Drops your type onto the same board as your colors, as live specimens.
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
