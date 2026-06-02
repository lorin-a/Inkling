"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { apiFetch } from "../../lib/api/client";
import ProjectSwitcher from "../../components/ProjectSwitcher";
import PinColourEditor from "../../components/PinColourEditor";
import Onboarding from "../../components/Onboarding";
import { REACTIONS, buildProfile, pickNext, candidateColours } from "../../lib/recognition";
import styles from "./page.module.css";

const ONBOARDING_KEY = "moodbuilder.recognize.onboarding.v1";

const TOUR_STEPS = [
  {
    selector: '[data-tour="react"]',
    placement: "top",
    title: "React to each reference",
    body: "YES, Sure, Maybe, Meh, Nope, or press 1 to 5. Go with your gut. The no matters as much as the yes.",
  },
  {
    selector: '[data-tour="image"]',
    placement: "right",
    title: "You’re reacting to the image",
    body: "Not its colours. A yes just means this belongs in your world. You’ll choose the actual colours separately.",
  },
  {
    selector: '[data-tour="colours"]',
    placement: "right",
    title: "Pick your own colours",
    body: "The swatches are a rough auto-guess. Click here to open an eyedropper and sample colours straight off the image, delete ones you don’t want, or add more.",
  },
  {
    selector: '[data-tour="gather"]',
    placement: "left",
    title: "Your colours collect here",
    body: "Everything you gather lands on this side, with its hex. Start from the curated set or tap All to see every colour. Tap a pin to refine its colours anytime.",
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
  const [reactions, setReactions] = useState([]); // [{ pin, key }]
  const [pinOverrides, setPinOverrides] = useState({}); // pinId → hex[] she hand-sampled off the image
  const [editingPinId, setEditingPinId] = useState(null);
  const [tour, setTour] = useState(false);
  const tourAutoStarted = useRef(false);

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

  const reactedIds = useMemo(() => new Set(reactions.map((r) => r.pin.pinId)), [reactions]);
  const remaining = useMemo(
    () => pins.filter((p) => !reactedIds.has(p.pinId)),
    [pins, reactedIds],
  );

  // Reactions keep the original pins; overrides apply here so editing a pin's
  // colours reshapes what's gathered without rewriting the reaction log.
  const effReactions = useMemo(
    () => reactions.map((r) => ({
      key: r.key,
      pin: { ...r.pin, palette: pinOverrides[r.pin.pinId] ?? r.pin.palette },
    })),
    [reactions, pinOverrides],
  );
  const profile = useMemo(() => buildProfile(effReactions), [effReactions]);
  const current = useMemo(
    () => pickNext(remaining, profile, { turn: reactions.length }),
    [remaining, profile, reactions.length],
  );

  // The colours gathered from everything that resonated — clustered + deduped.
  // This step's whole job: bring in the images and their colours, for use later.
  const pool = useMemo(() => candidateColours(profile), [profile]);

  const react = useCallback(
    (key) => {
      if (!current?.pin) return;
      const pin = current.pin;
      // Idempotent per pin: a fast double-press (two keydowns before re-render)
      // must not react to the same pin twice.
      setReactions((prev) =>
        prev.some((r) => r.pin.pinId === pin.pinId) ? prev : [...prev, { pin, key }],
      );
    },
    [current],
  );

  // Keyboard: 1–5 map to the five reactions, warm → cold.
  useEffect(() => {
    const onKey = (e) => {
      if (e.metaKey || e.ctrlKey || e.altKey) return;
      const tag = e.target?.tagName;
      if (tag === "INPUT" || tag === "TEXTAREA") return;
      const idx = ["1", "2", "3", "4", "5"].indexOf(e.key);
      if (idx >= 0 && REACTIONS[idx]) {
        e.preventDefault();
        react(REACTIONS[idx].key);
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [react]);

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
    setReactions([]);
    setPinOverrides({});
    setEditingPinId(null);
  }, []);

  // First visit, once the card is actually on screen: run the tour. Remembered after.
  useEffect(() => {
    if (tourAutoStarted.current || !loaded || !current) return;
    tourAutoStarted.current = true;
    try {
      if (!localStorage.getItem(ONBOARDING_KEY)) setTour(true);
    } catch {
      /* localStorage blocked — skip onboarding */
    }
  }, [loaded, current]);

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
        React to your own inspiration. You know it when you see it. The colours from
        everything that resonates collect on the right, to build from later.
      </p>

      <div className={styles.layout}>
        <section className={styles.reactCol} aria-label="React to a reference">
          {!loaded ? (
            <div className={styles.cardEmpty}>Loading your inspiration…</div>
          ) : !current ? (
            <ExhaustedCard count={pins.length} resonating={profile.resonantCount} onReset={reset} />
          ) : (
            <ReactCard
              key={current.pin.pinId}
              pin={current.pin}
              colours={effPalette(current.pin.pinId)}
              reason={current.reason}
              seen={reactions.length}
              total={pins.length}
              resonating={profile.resonantCount}
              onReact={react}
              onEditColours={() => setEditingPinId(current.pin.pinId)}
            />
          )}
        </section>

        <aside className={styles.directionCol} aria-label="Colours you’re gathering" data-tour="gather">
          <GatherPanel
            curated={pool}
            all={profile.likedColours}
            likedPins={profile.likedPins}
            onEditPin={setEditingPinId}
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

function ReactCard({ pin, colours, reason, seen, total, resonating, onReact, onEditColours }) {
  const credit = pin.sourceDomain && pin.sourceDomain !== "pinterest.com"
    ? pin.sourceDomain
    : "Pinterest";
  return (
    <div className={styles.card}>
      {reason === "contrast" && (
        <p className={styles.probe}>A contrast. Does this land too, or sharpen the no?</p>
      )}
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
            onClick={() => onReact(r.key)}
            aria-label={`${r.label} — ${r.hint}`}
          >
            <span className={styles.reactNum}>{i + 1}</span>
            <span className={styles.reactLabel}>{r.label}</span>
          </button>
        ))}
      </div>

      <p className={styles.progress}>
        {seen} of {total} · <strong>{resonating}</strong> resonating
        <span className={styles.kbdHint}>press 1–5</span>
      </p>
    </div>
  );
}

function ExhaustedCard({ count, resonating, onReset }) {
  return (
    <div className={styles.cardEmpty}>
      <p className={styles.exhaustedTitle}>That’s the whole well.</p>
      <p className={styles.exhaustedBody}>
        You reacted to all {count} references, and {resonating} resonated. The colours
        on the right are everything you gathered.
      </p>
      <button type="button" className={styles.resetBtn} onClick={onReset}>
        Start over
      </button>
    </div>
  );
}

function GatherPanel({ curated, all, likedPins, onEditPin }) {
  // Default to the curated set (she likes it), but the full extracted set is always
  // one tap away with its count shown — nothing narrowed is ever hidden.
  const [view, setView] = useState("curated");

  if (all.length === 0) {
    return (
      <div className={styles.directionEmpty}>
        <h2 className={styles.directionH}>Colours you’re gathering</h2>
        <p className={styles.directionHint}>
          React <strong>YES</strong> or <strong>Sure</strong> to a few references, and
          the colours from them collect here to build from later.
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
    </div>
  );
}
