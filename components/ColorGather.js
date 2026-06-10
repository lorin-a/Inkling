"use client";

/**
 * The color gather — the sophisticated recognition experience, extracted from
 * /recognize so it can run BOTH as the page AND as a focused tool summoned from
 * the canvas ("+ add color"). React to your pins, adjust by eye (the eyedropper),
 * read the Curated / All scale, put it in your own words. On the CTA it hands the
 * caller {colors, allColors, likedPins, why} — the parent decides where they land
 * (a new direction on /recognize, or the Color zone of the board).
 *
 * Sophistication on demand: this is the depth, kept whole; the surface that
 * launches it stays simple.
 */

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { REACTIONS, buildProfile, candidateColours } from "../lib/recognition";
import PinColourEditor from "./PinColourEditor";
import Onboarding from "./Onboarding";
import styles from "../app/recognize/page.module.css";

const ONBOARDING_KEY = "moodbuilder.recognize.onboarding.v1";
const SESSION_KEY = "moodbuilder.recognize.session.v1";
const LABEL = Object.fromEntries(REACTIONS.map((r) => [r.key, r.label]));

const TOUR_STEPS = [
  { selector: '[data-tour="image"]', placement: "right", title: "Start here: react to the image",
    body: "React to the image itself, not its colors. A yes, sure, or maybe means it’s worth taking to the next round." },
  { selector: '[data-tour="react"]', placement: "right", title: "Trust your gut",
    body: "YES, Sure, Maybe, Meh, Nope, or press 1 to 5. Change it anytime by picking it again." },
  { selector: '[data-tour="colours"]', placement: "right", title: "The colors are yours",
    body: "These swatches are an auto-guess. Open the eyedropper to sample colors off the image, or delete and add your own." },
  { selector: '[data-tour="board"]', placement: "top", title: "Your pool of inspiration",
    body: "Everything you’ve collected, in one place. Pick any, in any order." },
  { selector: '[data-tour="gather"]', placement: "left", title: "Your colors collect here",
    body: "The colors from what you keep gather here. When you’re ready, put it into words and add it." },
];

function EyedropperIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="m2 22 1-1h3l9-9" />
      <path d="M3 21v-3l9-9" />
      <path d="m15 6 3.4-3.4a2.1 2.1 0 1 1 3 3L18 9l.4.4a2.1 2.1 0 1 1-3 3l-3.8-3.8a2.1 2.1 0 1 1 3-3l.4.4Z" />
    </svg>
  );
}

const copyHex = (hex) => { try { navigator.clipboard?.writeText(hex); } catch { /* clipboard off */ } };

/**
 * @param {object} props
 * @param {string} [props.lede] intro line above the gather
 * @param {string} [props.ctaLabel] the commit button label
 * @param {string} [props.ctaHint] small line under the button
 * @param {(result:{colors:string[],allColors:string[],likedPins:object[],why:string})=>void} props.onComplete
 * @param {boolean} [props.busy] disable the CTA while the parent saves
 * @param {boolean} [props.enableTour] run the first-visit onboarding (page only)
 */
export default function ColorGather({
  lede = "React to your own inspiration in any order. You know it when you see it; the colors you keep collect on the right.",
  ctaLabel = "Make a moodboard",
  ctaHint = "Turns what you kept into a moodboard to shape and compose into a brand.",
  onComplete,
  busy = false,
  enableTour = false,
}) {
  const [pins, setPins] = useState([]);
  const [loaded, setLoaded] = useState(false);
  const [reactions, setReactions] = useState({});
  const [pinOverrides, setPinOverrides] = useState({});
  const [activePinId, setActivePinId] = useState(null);
  const [editingPinId, setEditingPinId] = useState(null);
  const [tour, setTour] = useState(false);
  const [reflectYes, setReflectYes] = useState("");
  const tourAutoStarted = useRef(false);
  const sessionHydrated = useRef(false);

  // ---- load + session (shared key so an in-progress gather survives navigation) ----
  useEffect(() => {
    let cancelled = false;
    import("../lib/api/client").then(({ apiFetch }) =>
      apiFetch("/api/library/palette", { cache: "no-store" })
        .then((r) => (r.ok ? r.json() : null))
        .then((data) => {
          if (cancelled || !data) return;
          setPins((data.pinPalettes || []).filter((p) => Array.isArray(p.palette) && p.palette.length));
        })
        .catch(() => {})
        .finally(() => !cancelled && setLoaded(true)),
    );
    return () => { cancelled = true; };
  }, []);

  useEffect(() => {
    try {
      const s = JSON.parse(localStorage.getItem(SESSION_KEY) || "null");
      if (s && typeof s === "object") {
        if (s.reactions) setReactions(s.reactions);
        if (s.pinOverrides) setPinOverrides(s.pinOverrides);
        if (typeof s.reflectYes === "string") setReflectYes(s.reflectYes);
        if (s.activePinId) setActivePinId(s.activePinId);
      }
    } catch { /* storage off — fresh session */ }
  }, []);

  useEffect(() => {
    if (!sessionHydrated.current) { sessionHydrated.current = true; return; }
    try {
      localStorage.setItem(SESSION_KEY, JSON.stringify({ reactions, pinOverrides, reflectYes, activePinId }));
    } catch { /* storage off — fine */ }
  }, [reactions, pinOverrides, reflectYes, activePinId]);

  const pinById = useMemo(() => new Map(pins.map((p) => [p.pinId, p])), [pins]);
  const effPalette = useCallback((id) => pinOverrides[id] ?? pinById.get(id)?.palette ?? [], [pinOverrides, pinById]);

  useEffect(() => { if (!activePinId && pins.length) setActivePinId(pins[0].pinId); }, [pins, activePinId]);

  const effReactions = useMemo(
    () =>
      Object.entries(reactions)
        .map(([pinId, key]) => {
          const p = pinById.get(pinId);
          return p ? { key, pin: { ...p, palette: pinOverrides[pinId] ?? p.palette } } : null;
        })
        .filter(Boolean),
    [reactions, pinById, pinOverrides],
  );
  const profile = useMemo(() => buildProfile(effReactions), [effReactions]);
  const pool = useMemo(() => candidateColours(profile), [profile]);
  const reactedCount = Object.keys(reactions).length;
  const activePin = activePinId ? pinById.get(activePinId) : null;

  const react = useCallback(
    (pinId, key) => {
      if (!pinId) return;
      const updated = { ...reactions, [pinId]: key };
      setReactions(updated);
      if (activePinId === pinId) {
        const idx = pins.findIndex((p) => p.pinId === pinId);
        const nextUn = pins.slice(idx + 1).find((p) => !updated[p.pinId]) || pins.find((p) => !updated[p.pinId]);
        if (nextUn) setActivePinId(nextUn.pinId);
      }
    },
    [reactions, activePinId, pins],
  );

  useEffect(() => {
    const onKey = (e) => {
      if (e.metaKey || e.ctrlKey || e.altKey) return;
      const tag = e.target?.tagName;
      if (tag === "INPUT" || tag === "TEXTAREA") return;
      const idx = ["1", "2", "3", "4", "5"].indexOf(e.key);
      if (idx >= 0 && REACTIONS[idx] && activePinId) {
        e.preventDefault();
        react(activePinId, REACTIONS[idx].key);
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [react, activePinId]);

  const setPinColours = useCallback((id, colours) => setPinOverrides((prev) => ({ ...prev, [id]: colours })), []);
  const resetPinColours = useCallback((id) => {
    setPinOverrides((prev) => { const next = { ...prev }; delete next[id]; return next; });
  }, []);

  const reset = useCallback(() => {
    setReactions({});
    setPinOverrides({});
    setEditingPinId(null);
    setActivePinId(pins[0]?.pinId ?? null);
    setReflectYes("");
    try { localStorage.removeItem(SESSION_KEY); } catch { /* fine */ }
  }, [pins]);

  // The hand-off: hand the caller what was gathered; the parent decides where it lands.
  const complete = useCallback(() => {
    if (!profile.likedPins.length || busy) return;
    onComplete?.({
      colors: pool.map((c) => c.hex),
      allColors: profile.likedColours,
      likedPins: profile.likedPins,
      why: (reflectYes || "").trim(),
    });
  }, [profile.likedPins, profile.likedColours, pool, reflectYes, busy, onComplete]);

  useEffect(() => {
    if (!enableTour || tourAutoStarted.current || !loaded || !pins.length) return;
    tourAutoStarted.current = true;
    try { if (!localStorage.getItem(ONBOARDING_KEY)) setTour(true); } catch { /* blocked */ }
  }, [enableTour, loaded, pins.length]);

  const closeTour = useCallback(() => {
    setTour(false);
    try { localStorage.setItem(ONBOARDING_KEY, "1"); } catch { /* non-fatal */ }
  }, []);

  const editingPin = editingPinId ? pinById.get(editingPinId) : null;

  return (
    <>
      <p className={styles.lede}>{lede}</p>

      <div className={styles.layout}>
        <section className={styles.reactCol} aria-label="Your pins">
          {!loaded ? (
            <div className={styles.cardEmpty}>Loading your inspiration…</div>
          ) : !pins.length ? (
            <div className={styles.cardEmpty}>No pins in this studio yet.</div>
          ) : (
            <>
              {activePin && (
                <FocusCard
                  key={activePin.pinId}
                  pin={activePin}
                  colours={effPalette(activePin.pinId)}
                  reaction={reactions[activePin.pinId]}
                  reactedCount={reactedCount}
                  total={pins.length}
                  onReact={(key) => react(activePin.pinId, key)}
                  onEditColours={() => setEditingPinId(activePin.pinId)}
                  onReset={reactedCount ? reset : null}
                />
              )}
              <Board pins={pins} reactions={reactions} activePinId={activePinId} onSelect={setActivePinId} />
            </>
          )}
        </section>

        <aside className={styles.directionCol} aria-label="Colors you’re gathering" data-tour="gather">
          <GatherPanel
            curated={pool}
            all={profile.likedColours}
            likedPins={profile.likedPins}
            onEditPin={setEditingPinId}
            reflectYes={reflectYes}
            setReflectYes={setReflectYes}
            onComplete={complete}
            busy={busy}
            ctaLabel={ctaLabel}
            ctaHint={ctaHint}
          />
        </aside>
      </div>

      {editingPin && (
        <PinColourEditor
          pin={editingPin}
          colours={effPalette(editingPin.pinId)}
          isOverridden={Object.prototype.hasOwnProperty.call(pinOverrides, editingPin.pinId)}
          onChange={(colours) => setPinColours(editingPin.pinId, colours)}
          onReset={() => resetPinColours(editingPin.pinId)}
          onClose={() => setEditingPinId(null)}
        />
      )}

      {tour && <Onboarding steps={TOUR_STEPS} onClose={closeTour} />}
    </>
  );
}

function FocusCard({ pin, colours, reaction, reactedCount, total, onReact, onEditColours, onReset }) {
  const credit = pin.sourceDomain && pin.sourceDomain !== "pinterest.com" ? pin.sourceDomain : "Pinterest";
  return (
    <div className={styles.card}>
      <figure className={styles.figure} data-tour="image">
        <span className={styles.figureBackdrop} style={{ backgroundImage: `url("${pin.thumbnail}")` }} aria-hidden="true" />
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img className={styles.cardImg} src={pin.thumbnail} alt={pin.title || "Reference"} />
        <a className={styles.credit} href={pin.sourceUrl || pin.pinUrl} target="_blank" rel="noreferrer noopener">{credit} ↗</a>
      </figure>

      <button type="button" className={styles.cardColours} onClick={onEditColours} data-tour="colours">
        <span className={styles.cardSwatches} aria-hidden="true">
          {colours.slice(0, 8).map((hex, i) => (
            <span key={i} className={styles.cardSwatch} style={{ background: hex }} />
          ))}
        </span>
        <span className={styles.cardColoursLabel}><EyedropperIcon /> pick your own</span>
      </button>

      <div className={styles.reactions} role="group" aria-label="How does this land?" data-tour="react">
        {REACTIONS.map((r, i) => (
          <button
            key={r.key}
            type="button"
            className={styles.reactBtn}
            data-key={r.key}
            data-on={reaction === r.key ? "true" : undefined}
            onClick={() => onReact(r.key)}
            aria-pressed={reaction === r.key}
            aria-label={`${r.label} — ${r.hint}`}
          >
            <span className={styles.reactNum}>{i + 1}</span>
            <span className={styles.reactLabel}>{r.label}</span>
          </button>
        ))}
      </div>

      <p className={styles.progress}>
        <strong>{reactedCount}</strong> of {total} sorted
        <span className={styles.kbdHint}>press 1–5</span>
        {onReset && <button type="button" className={styles.resetInline} onClick={onReset}>Start over</button>}
      </p>
    </div>
  );
}

function Board({ pins, reactions, activePinId, onSelect }) {
  return (
    <div className={styles.boardWrap}>
      <p className={styles.boardLabel}>Your pool of inspiration · pick any, in any order</p>
      <div className={styles.board} data-tour="board">
        {pins.map((p) => {
          const key = reactions[p.pinId];
          return (
            <button
              key={p.pinId}
              type="button"
              className={styles.boardPin}
              data-active={p.pinId === activePinId ? "true" : undefined}
              data-reacted={key ? "true" : undefined}
              onClick={() => onSelect(p.pinId)}
              title={p.title || "Reference"}
              aria-label={key ? `${p.title || "Reference"}, marked ${LABEL[key]}` : p.title || "Reference"}
            >
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={p.thumbnail} alt="" />
              {key && <span className={styles.boardBadge} data-key={key}>{LABEL[key]}</span>}
            </button>
          );
        })}
      </div>
    </div>
  );
}

function GatherPanel({ curated, all, likedPins, onEditPin, reflectYes, setReflectYes, onComplete, busy, ctaLabel, ctaHint }) {
  const [view, setView] = useState("curated");

  if (all.length === 0) {
    return (
      <div className={styles.directionEmpty}>
        <div className={styles.emptyGhost} aria-hidden="true">
          {Array.from({ length: 12 }).map((_, n) => (<span key={n} className={styles.emptyGhostSwatch} />))}
        </div>
        <h2 className={styles.directionH}>Colors you’re gathering</h2>
        <p className={styles.directionHint}>
          Mark something <strong>YES</strong>, <strong>Sure</strong>, or <strong>Maybe</strong>, and its colors collect here.
        </p>
      </div>
    );
  }

  const narrowed = all.length > curated.length;
  const hexes = view === "all" ? all : curated.map((c) => c.hex);

  return (
    <div className={styles.direction}>
      <div className={styles.gatherHead}>
        <h2 className={styles.directionH}>Colors you’re gathering</h2>
        {narrowed && (
          <div className={styles.viewToggle} role="group" aria-label="How many colors to show">
            <button type="button" data-on={view === "curated" ? "true" : undefined} onClick={() => setView("curated")}>Curated {curated.length}</button>
            <button type="button" data-on={view === "all" ? "true" : undefined} onClick={() => setView("all")}>All {all.length}</button>
          </div>
        )}
      </div>
      {narrowed && (
        <p className={styles.gatherNote}>
          {view === "curated"
            ? `A tidied set of ${curated.length}. Nothing’s lost. Tap All for every color you gathered.`
            : `Every color from what you kept.`}
        </p>
      )}

      <div className={styles.spectrum}>
        {hexes.map((hex) => (
          <button key={hex} type="button" className={styles.spectrumItem} onClick={() => copyHex(hex.toUpperCase())} title="Click to copy">
            <span className={styles.spectrumSwatch} style={{ background: hex }} />
            <span className={styles.spectrumHex}>{hex.toUpperCase()}</span>
          </button>
        ))}
      </div>

      {likedPins.length > 0 && (
        <div className={styles.cluster}>
          <p className={styles.clusterLabel}>
            What you resonated with <span className={styles.clusterHint}>tap one to pick its colors</span>
          </p>
          <div className={styles.clusterThumbs}>
            {likedPins.map((p) => (
              <div key={p.pinId} className={styles.clusterThumb}>
                <button type="button" className={styles.clusterPick} onClick={() => onEditPin(p.pinId)} title={`Pick colors from ${p.title || "this reference"}`}>
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={p.thumbnail} alt={p.title || "Reference"} />
                </button>
                <a className={styles.clusterSource} href={p.sourceUrl || p.pinUrl} target="_blank" rel="noreferrer noopener" aria-label="Open source" title="Open source">↗</a>
              </div>
            ))}
          </div>
        </div>
      )}

      {likedPins.length > 0 && (
        <div className={styles.reflect}>
          <h3 className={styles.reflectH}>In your own words</h3>
          <label className={styles.reflectLabel} htmlFor="reflect-words">
            What did you learn shuffling through your inspiration? What are you gravitating toward, and what isn’t quite working?
          </label>
          <textarea
            id="reflect-words"
            className={styles.reflectInput}
            value={reflectYes}
            onChange={(e) => setReflectYes(e.target.value)}
            placeholder="e.g. Soft, faded, coastal. Muted greens and dusty rose, nothing too sharp or corporate."
            rows={4}
          />
          <button type="button" className={styles.makeDirection} onClick={onComplete} disabled={busy}>
            {busy ? "Working…" : ctaLabel}
          </button>
          {ctaHint && <p className={styles.reflectHint}>{ctaHint}</p>}
        </div>
      )}
    </div>
  );
}
