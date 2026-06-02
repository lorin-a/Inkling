"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { useProject } from "../../lib/useProject";
import { apiFetch } from "../../lib/api/client";
import { colorName } from "../../lib/nameThatColor";
import { derivePreviewRoles } from "../../lib/derivePreviewRoles";
import FontLoader, { fontStack } from "../../components/FontLoader";
import ProjectSwitcher from "../../components/ProjectSwitcher";
import PinColourEditor from "../../components/PinColourEditor";
import {
  REACTIONS,
  buildProfile,
  pickNext,
  composeDirection,
  candidateColours,
  paletteShift,
  isSettling,
} from "../../lib/recognition";
import styles from "./page.module.css";

export default function RecognizePage() {
  const { project } = useProject();
  const [pins, setPins] = useState([]);
  const [loaded, setLoaded] = useState(false);
  const [reactions, setReactions] = useState([]); // [{ pin, key }]
  const [selectedColours, setSelectedColours] = useState(null); // null = follow the proposal; array = she's curating
  const [pinOverrides, setPinOverrides] = useState({}); // pinId → hex[] she hand-sampled off the image
  const [editingPinId, setEditingPinId] = useState(null);

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
  // colours reshapes the direction without rewriting the reaction log.
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

  // The auto-proposal — what the loop suggests from what resonated. Drives the
  // "settling" signal (the convergence of the narrowing, independent of edits).
  const autoDirection = useMemo(() => composeDirection(profile), [profile]);
  // What's actually shown: her hand-picked colours once she's curating, else the
  // proposal. She stays the author.
  const direction = useMemo(
    () => composeDirection(profile, { selected: selectedColours }),
    [profile, selectedColours],
  );
  // Every colour from everything that resonated — the pool she curates from.
  const pool = useMemo(() => candidateColours(profile), [profile]);
  // Which pool swatches are currently in the palette (her picks, or the proposal).
  const activeSet = useMemo(
    () => new Set((selectedColours ?? autoDirection?.palette ?? []).map((h) => h.toLowerCase())),
    [selectedColours, autoDirection],
  );

  // Convergence metric: how far the *proposal* moved on the last reaction.
  const recentShift = useMemo(() => {
    if (!autoDirection) return Infinity;
    const prev = composeDirection(buildProfile(effReactions.slice(0, -1)));
    return paletteShift(prev?.palette, autoDirection.palette);
  }, [autoDirection, effReactions]);
  const settling = isSettling({ resonantCount: profile.resonantCount, recentShift });

  const react = useCallback(
    (key) => {
      if (!current?.pin) return;
      const pin = current.pin;
      setReactions((prev) => [...prev, { pin, key }]);
    },
    [current],
  );

  // Click a pool swatch: drop into curate mode (seeding from the current
  // proposal) and toggle that colour. From here the direction follows her.
  const toggleColour = useCallback(
    (hex) => {
      const h = hex.toLowerCase();
      setSelectedColours((prev) => {
        const base = prev ?? autoDirection?.palette ?? [];
        const set = new Set(base.map((c) => c.toLowerCase()));
        if (set.has(h)) set.delete(h);
        else set.add(h);
        return [...set];
      });
    },
    [autoDirection],
  );
  const resetColours = useCallback(() => setSelectedColours(null), []);

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
    setSelectedColours(null);
    setPinOverrides({});
    setEditingPinId(null);
  }, []);

  const editingPin = editingPinId ? pinById.get(editingPinId) : null;

  return (
    <div className={styles.page}>
      <FontLoader fonts={direction?.fonts} />
      <header className={styles.bar}>
        <Link href="/" className={styles.back}>← Moodbuilder</Link>
        <ProjectSwitcher />
        <div className={styles.barTitle}>Recognize</div>
      </header>

      <p className={styles.lede}>
        React to your own inspiration. You know it when you see it. A colour
        direction emerges from what resonates, sharpened by what doesn’t.
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

        <aside className={styles.directionCol} aria-label="The emerging direction">
          <DirectionPanel
            direction={direction}
            project={project}
            profile={profile}
            settling={settling}
            pool={pool}
            activeSet={activeSet}
            curating={selectedColours !== null}
            onToggleColour={toggleColour}
            onResetColours={resetColours}
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
      <figure className={styles.figure}>
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
      <button type="button" className={styles.cardColours} onClick={onEditColours}>
        <span className={styles.cardSwatches} aria-hidden="true">
          {colours.slice(0, 8).map((hex, i) => (
            <span key={i} className={styles.cardSwatch} style={{ background: hex }} />
          ))}
        </span>
        <span className={styles.cardColoursLabel}>auto-picked · pick your own</span>
      </button>

      <div className={styles.reactions} role="group" aria-label="How does this land?">
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
        You reacted to all {count} references, and {resonating} resonated. The
        direction on the right is everything that landed.
      </p>
      <button type="button" className={styles.resetBtn} onClick={onReset}>
        Start over
      </button>
    </div>
  );
}

function DirectionPanel({
  direction,
  project,
  profile,
  settling,
  pool,
  activeSet,
  curating,
  onToggleColour,
  onResetColours,
  onEditPin,
}) {
  if (!direction) {
    return (
      <div className={styles.directionEmpty}>
        <h2 className={styles.directionH}>The direction so far</h2>
        <p className={styles.directionHint}>
          React <strong>YES</strong> or <strong>Sure</strong> to a few references
          and a direction will start to take shape here.
        </p>
      </div>
    );
  }

  const roles = derivePreviewRoles(direction.palette, "dark", { sourceKind: "composed" });
  const roleList = [
    ["Background", roles.bg],
    ["Ink", roles.ink],
    ["Accent", roles.accent],
    ["Muted", roles.muted],
  ];

  return (
    <div className={styles.direction} data-settling={settling ? "true" : undefined}>
      <h2 className={styles.directionH}>
        {settling ? "Your direction is settling" : "The direction so far"}
      </h2>

      <DirectionPreview roles={roles} fonts={direction.fonts} project={project} />

      {pool.length > 0 && (
        <div className={styles.curate}>
          <div className={styles.curateHead}>
            <p className={styles.curateLabel}>
              Your colours <span className={styles.curateHint}>pick which ones are the direction</span>
            </p>
            {curating && (
              <button type="button" className={styles.resetColours} onClick={onResetColours}>
                Reset to suggested
              </button>
            )}
          </div>
          <div className={styles.curatePool} role="group" aria-label="Colours from what you resonated with">
            {pool.map((c) => {
              const on = activeSet.has(c.hex);
              return (
                <button
                  key={c.hex}
                  type="button"
                  className={styles.curateSwatch}
                  data-on={on ? "true" : undefined}
                  style={{ background: c.hex }}
                  onClick={() => onToggleColour(c.hex)}
                  aria-pressed={on}
                  title={`${colorName(c.hex).name} · in ${c.count} of what you liked${on ? " · in the direction" : ""}`}
                >
                  {on && <span className={styles.curateCheck} aria-hidden="true">✓</span>}
                </button>
              );
            })}
          </div>
        </div>
      )}

      <div className={styles.roles}>
        {roleList.map(([name, hex]) => (
          <div key={name} className={styles.role}>
            <span className={styles.roleSwatch} style={{ background: hex }} />
            <span className={styles.roleMeta}>
              <span className={styles.roleName}>{name}</span>
              <span className={styles.roleHex}>{colorName(hex).name}</span>
            </span>
          </div>
        ))}
      </div>

      <p className={styles.typeLine}>
        <span style={{ fontFamily: fontStack(direction.fonts.title, "serif") }}>
          {direction.pairing.display}
        </span>
        <span className={styles.typeSlash}>·</span>
        <span style={{ fontFamily: fontStack(direction.fonts.body, "sans") }}>
          {direction.pairing.text}
        </span>
        <span className={styles.typeNote}>
          {curating ? "suggested from the colours you chose" : "suggested from your colours"}
        </span>
      </p>

      {profile.likedPins.length > 0 && (
        <div className={styles.cluster}>
          <p className={styles.clusterLabel}>
            What you resonated with <span className={styles.clusterHint}>tap a pin to pick its colours</span>
          </p>
          <div className={styles.clusterThumbs}>
            {profile.likedPins.map((p) => (
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

      {profile.rejectedPins.length > 0 && (
        <div className={styles.rejected}>
          <span className={styles.rejectedLabel}>Pulling away from</span>
          <div className={styles.rejectedSwatches} aria-hidden="true">
            {profile.rejectedPins.slice(0, 8).map((p) => (
              <span
                key={p.pinId}
                className={styles.rejectedSwatch}
                style={{ background: p.palette?.[0] || "#ccc" }}
              />
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

function DirectionPreview({ roles, fonts, project }) {
  const wordmark = project?.wordmark || "Your Brand";
  const period = project?.period || ".";
  const tagline = project?.tagline || "A direction, emerging.";
  return (
    <div className={styles.preview} style={{ background: roles.bg, color: roles.ink }}>
      <span
        className={styles.previewWordmark}
        style={{ fontFamily: fontStack(fonts.title, "serif") }}
      >
        {wordmark}
        <span style={{ color: roles.accent }}>{period}</span>
      </span>
      <span
        className={styles.previewTagline}
        style={{ color: roles.muted, fontFamily: fontStack(fonts.body, "sans") }}
      >
        {tagline}
      </span>
    </div>
  );
}
