"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { apiFetch } from "../../lib/api/client";
import ProjectSwitcher from "../../components/ProjectSwitcher";
import PinColourEditor from "../../components/PinColourEditor";
import Onboarding from "../../components/Onboarding";
import { REACTIONS, buildProfile, candidateColours } from "../../lib/recognition";
import { createDirection } from "../../lib/makeDirection";
import styles from "./page.module.css";

const ONBOARDING_KEY = "moodbuilder.recognize.onboarding.v1";
const LABEL = Object.fromEntries(REACTIONS.map((r) => [r.key, r.label]));

const TOUR_STEPS = [
  {
    selector: '[data-tour="board"]',
    placement: "top",
    title: "All your pins, your order",
    body: "Here’s your whole field. Pick any pin, in any order, as many times as you like. Nothing’s chosen for you, nothing hides.",
  },
  {
    selector: '[data-tour="image"]',
    placement: "right",
    title: "You’re reacting to the image",
    body: "Not its colours. A yes just means this belongs in your world. You’ll choose the actual colours separately.",
  },
  {
    selector: '[data-tour="react"]',
    placement: "right",
    title: "React to the one you’re on",
    body: "YES, Sure, Maybe, Meh, Nope, or press 1 to 5. Go with your gut. Change it anytime by picking the pin again.",
  },
  {
    selector: '[data-tour="colours"]',
    placement: "right",
    title: "Pick your own colours",
    body: "The swatches are a rough auto-guess. Click here to open an eyedropper and sample colours off the image, delete ones you don’t want, or add more.",
  },
  {
    selector: '[data-tour="gather"]',
    placement: "left",
    title: "Your colours collect here",
    body: "Everything from your yeses lands here, with its hex. Curated by default, tap All to see every colour. Tap a pin to refine its colours anytime.",
  },
];

const copyHex = (hex) => {
  try {
    navigator.clipboard?.writeText(hex);
  } catch {
    /* clipboard unavailable — non-fatal */
  }
};

export default function RecognizePage() {
  const [pins, setPins] = useState([]);
  const [loaded, setLoaded] = useState(false);
  const [reactions, setReactions] = useState({}); // pinId → reaction key (revisitable, overwrite-able)
  const [pinOverrides, setPinOverrides] = useState({}); // pinId → hex[] she hand-sampled off the image
  const [activePinId, setActivePinId] = useState(null); // the pin in the focused card
  const [editingPinId, setEditingPinId] = useState(null);
  const [tour, setTour] = useState(false);
  const tourAutoStarted = useRef(false);
  // Reflection — your own words, never autofilled (cultivate, don't supply).
  const [reflectYes, setReflectYes] = useState("");
  const [reflectNo, setReflectNo] = useState("");
  const [creating, setCreating] = useState(false);
  const [direction, setDirection] = useState(null); // the saved direction (a moodboard)
  const [directionError, setDirectionError] = useState(null);

  useEffect(() => {
    let cancelled = false;
    apiFetch("/api/library/palette", { cache: "no-store" })
      .then((r) => (r.ok ? r.json() : null))
      .then((data) => {
        if (cancelled || !data) return;
        setPins((data.pinPalettes || []).filter((p) => Array.isArray(p.palette) && p.palette.length));
      })
      .catch(() => {})
      .finally(() => !cancelled && setLoaded(true));
    return () => {
      cancelled = true;
    };
  }, []);

  const pinById = useMemo(() => new Map(pins.map((p) => [p.pinId, p])), [pins]);
  // A pin contributes the colours she hand-sampled if she's edited it, else the
  // auto-extraction. The eyedropper writes here; everything downstream reads it.
  const effPalette = useCallback(
    (id) => pinOverrides[id] ?? pinById.get(id)?.palette ?? [],
    [pinOverrides, pinById],
  );

  // Focus the first pin once loaded, so there's always something on screen.
  useEffect(() => {
    if (!activePinId && pins.length) setActivePinId(pins[0].pinId);
  }, [pins, activePinId]);

  // Reactions are a map (pinId → key), so a pin can be re-reacted or un-reacted at
  // will. Build the profile from it, applying any per-pin colour overrides.
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

  // React to a specific pin. After reacting the *focused* pin, gently move the
  // focus to the next un-reacted pin in board order — predictable, sequential,
  // never hidden, and overridable by clicking any pin. (Not the old steering: the
  // whole board stays visible and you stay in charge of where you go.)
  const react = useCallback(
    (pinId, key) => {
      if (!pinId) return;
      const updated = { ...reactions, [pinId]: key };
      setReactions(updated);
      if (activePinId === pinId) {
        const idx = pins.findIndex((p) => p.pinId === pinId);
        const nextUn =
          pins.slice(idx + 1).find((p) => !updated[p.pinId]) ||
          pins.find((p) => !updated[p.pinId]);
        if (nextUn) setActivePinId(nextUn.pinId);
      }
    },
    [reactions, activePinId, pins],
  );

  // Keyboard 1–5 react the focused pin.
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

  const setPinColours = useCallback((id, colours) => {
    setPinOverrides((prev) => ({ ...prev, [id]: colours }));
  }, []);
  const resetPinColours = useCallback((id) => {
    setPinOverrides((prev) => {
      const next = { ...prev };
      delete next[id];
      return next;
    });
  }, []);

  const reset = useCallback(() => {
    setReactions({});
    setPinOverrides({});
    setEditingPinId(null);
    setActivePinId(pins[0]?.pinId ?? null);
    setReflectYes("");
    setReflectNo("");
    setDirection(null);
    setDirectionError(null);
  }, [pins]);

  // Turn what resonated into a direction — a real moodboard that feeds Brand.
  const makeDirection = useCallback(async () => {
    if (!profile.likedPins.length || creating) return;
    setCreating(true);
    setDirectionError(null);
    try {
      const board = await createDirection({
        pins: profile.likedPins,
        colours: pool.map((c) => c.hex),
        reflectionYes: reflectYes,
        reflectionNo: reflectNo,
      });
      setDirection(board);
    } catch (e) {
      setDirectionError(e?.message || "Could not save the direction.");
    } finally {
      setCreating(false);
    }
  }, [profile.likedPins, pool, reflectYes, reflectNo, creating]);

  // First visit, once the board is on screen: run the tour. Remembered after.
  useEffect(() => {
    if (tourAutoStarted.current || !loaded || !pins.length) return;
    tourAutoStarted.current = true;
    try {
      if (!localStorage.getItem(ONBOARDING_KEY)) setTour(true);
    } catch {
      /* localStorage blocked — skip onboarding */
    }
  }, [loaded, pins.length]);

  const closeTour = useCallback(() => {
    setTour(false);
    try {
      localStorage.setItem(ONBOARDING_KEY, "1");
    } catch {
      /* non-fatal */
    }
  }, []);

  const editingPin = editingPinId ? pinById.get(editingPinId) : null;

  return (
    <div className={styles.page}>
      <header className={styles.bar}>
        <Link href="/" className={styles.back}>← Moodbuilder</Link>
        <ProjectSwitcher />
        <button type="button" className={styles.howto} onClick={() => setTour(true)}>
          How it works
        </button>
        <div className={styles.barTitle}>Recognize</div>
      </header>

      <p className={styles.lede}>
        React to your own inspiration. You know it when you see it. Pick through your
        pins in any order; the colours from what resonates collect on the right.
      </p>

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
              <Board
                pins={pins}
                reactions={reactions}
                activePinId={activePinId}
                onSelect={setActivePinId}
              />
            </>
          )}
        </section>

        <aside className={styles.directionCol} aria-label="Colours you’re gathering" data-tour="gather">
          <GatherPanel
            curated={pool}
            all={profile.likedColours}
            likedPins={profile.likedPins}
            onEditPin={setEditingPinId}
            reflectYes={reflectYes}
            setReflectYes={setReflectYes}
            reflectNo={reflectNo}
            setReflectNo={setReflectNo}
            onMakeDirection={makeDirection}
            creating={creating}
            direction={direction}
            directionError={directionError}
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
    </div>
  );
}

function FocusCard({ pin, colours, reaction, reactedCount, total, onReact, onEditColours, onReset }) {
  const credit = pin.sourceDomain && pin.sourceDomain !== "pinterest.com"
    ? pin.sourceDomain
    : "Pinterest";
  return (
    <div className={styles.card}>
      <figure className={styles.figure} data-tour="image">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img className={styles.cardImg} src={pin.thumbnail} alt={pin.title || "Reference"} />
        <a
          className={styles.credit}
          href={pin.sourceUrl || pin.pinUrl}
          target="_blank"
          rel="noreferrer noopener"
        >
          {credit} ↗
        </a>
      </figure>

      {/* React to the image, not the swatches — the colours are a rough first
          guess you can overwrite, never the basis of a yes. */}
      <button type="button" className={styles.cardColours} onClick={onEditColours} data-tour="colours">
        <span className={styles.cardSwatches} aria-hidden="true">
          {colours.slice(0, 8).map((hex, i) => (
            <span key={i} className={styles.cardSwatch} style={{ background: hex }} />
          ))}
        </span>
        <span className={styles.cardColoursLabel}>auto-picked · pick your own</span>
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
        {onReset && (
          <button type="button" className={styles.resetInline} onClick={onReset}>
            Start over
          </button>
        )}
      </p>
    </div>
  );
}

function Board({ pins, reactions, activePinId, onSelect }) {
  return (
    <div className={styles.boardWrap}>
      <p className={styles.boardLabel}>All your pins · pick any, in any order</p>
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
              {key && (
                <span className={styles.boardBadge} data-key={key}>
                  {LABEL[key]}
                </span>
              )}
            </button>
          );
        })}
      </div>
    </div>
  );
}

function GatherPanel({
  curated,
  all,
  likedPins,
  onEditPin,
  reflectYes,
  setReflectYes,
  reflectNo,
  setReflectNo,
  onMakeDirection,
  creating,
  direction,
  directionError,
}) {
  // Default to the curated set (she likes it), but the full extracted set is always
  // one tap away with its count shown — nothing narrowed is ever hidden.
  const [view, setView] = useState("curated");

  if (all.length === 0) {
    return (
      <div className={styles.directionEmpty}>
        <h2 className={styles.directionH}>Colours you’re gathering</h2>
        <p className={styles.directionHint}>
          Mark a pin <strong>YES</strong> or <strong>Sure</strong> and the colours from
          it collect here to build from later.
        </p>
      </div>
    );
  }

  const narrowed = all.length > curated.length;
  const hexes = view === "all" ? all : curated.map((c) => c.hex);

  return (
    <div className={styles.direction}>
      <div className={styles.gatherHead}>
        <h2 className={styles.directionH}>Colours you’re gathering</h2>
        {narrowed && (
          <div className={styles.viewToggle} role="group" aria-label="How many colours to show">
            <button
              type="button"
              data-on={view === "curated" ? "true" : undefined}
              onClick={() => setView("curated")}
            >
              Curated {curated.length}
            </button>
            <button
              type="button"
              data-on={view === "all" ? "true" : undefined}
              onClick={() => setView("all")}
            >
              All {all.length}
            </button>
          </div>
        )}
      </div>
      {narrowed && (
        <p className={styles.gatherNote}>
          {view === "curated"
            ? `A tidied set of ${curated.length}. Nothing’s lost. Tap All for every colour you gathered.`
            : `Every colour extracted from the pins you kept.`}
        </p>
      )}

      <div className={styles.spectrum}>
        {hexes.map((hex) => (
          <button
            key={hex}
            type="button"
            className={styles.spectrumItem}
            onClick={() => copyHex(hex.toUpperCase())}
            title="Click to copy"
          >
            <span className={styles.spectrumSwatch} style={{ background: hex }} />
            <span className={styles.spectrumHex}>{hex.toUpperCase()}</span>
          </button>
        ))}
      </div>

      {likedPins.length > 0 && (
        <div className={styles.cluster}>
          <p className={styles.clusterLabel}>
            What you resonated with <span className={styles.clusterHint}>tap a pin to pick its colours</span>
          </p>
          <div className={styles.clusterThumbs}>
            {likedPins.map((p) => (
              <div key={p.pinId} className={styles.clusterThumb}>
                <button
                  type="button"
                  className={styles.clusterPick}
                  onClick={() => onEditPin(p.pinId)}
                  title={`Pick colours from ${p.title || "this reference"}`}
                >
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={p.thumbnail} alt={p.title || "Reference"} />
                </button>
                <a
                  className={styles.clusterSource}
                  href={p.sourceUrl || p.pinUrl}
                  target="_blank"
                  rel="noreferrer noopener"
                  aria-label="Open source"
                  title="Open source"
                >
                  ↗
                </a>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* The capstone: your words → a direction → a brand. The seam that makes this
          a product, not an island. */}
      {likedPins.length > 0 && (
        <div className={styles.reflect}>
          <h3 className={styles.reflectH}>In your own words</h3>
          <label className={styles.reflectLabel} htmlFor="reflect-yes">
            Looking at everything you kept — what do these have in common in your eyes?
            What feelings or sensations do they evoke?
          </label>
          <textarea
            id="reflect-yes"
            className={styles.reflectInput}
            value={reflectYes}
            onChange={(e) => setReflectYes(e.target.value)}
            placeholder="It’s yours to name…"
            rows={3}
          />
          <label className={styles.reflectLabel} htmlFor="reflect-no">
            Anything you’re steering away from? What wasn’t working?
          </label>
          <textarea
            id="reflect-no"
            className={styles.reflectInput}
            value={reflectNo}
            onChange={(e) => setReflectNo(e.target.value)}
            placeholder="Optional"
            rows={2}
          />

          {direction ? (
            <div className={styles.directionSaved}>
              <p className={styles.directionSavedTitle}>
                ✓ Saved as <strong>“{direction.name}”</strong>
              </p>
              <div className={styles.directionActions}>
                <Link href="/brand" className={styles.directionPrimary}>
                  Compose a brand →
                </Link>
                <Link href="/moodboard" className={styles.directionSecondary}>
                  Open the board
                </Link>
              </div>
            </div>
          ) : (
            <>
              <button
                type="button"
                className={styles.makeDirection}
                onClick={onMakeDirection}
                disabled={creating}
              >
                {creating ? "Making your direction…" : "Make a direction"}
              </button>
              <p className={styles.reflectHint}>
                Turns what resonated into a moodboard you can shape and compose into a brand.
              </p>
            </>
          )}
          {directionError && <p className={styles.directionError}>{directionError}</p>}
        </div>
      )}
    </div>
  );
}
