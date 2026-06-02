"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { useProject } from "../../lib/useProject";
import { apiFetch } from "../../lib/api/client";
import { colorName } from "../../lib/nameThatColor";
import { derivePreviewRoles } from "../../lib/derivePreviewRoles";
import FontLoader, { fontStack } from "../../components/FontLoader";
import ProjectSwitcher from "../../components/ProjectSwitcher";
import {
  REACTIONS,
  buildProfile,
  pickNext,
  composeDirection,
  paletteShift,
  isSettling,
} from "../../lib/recognition";
import styles from "./page.module.css";

export default function RecognizePage() {
  const { project } = useProject();
  const [pins, setPins] = useState([]);
  const [loaded, setLoaded] = useState(false);
  const [reactions, setReactions] = useState([]); // [{ pin, key }]

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

  const reactedIds = useMemo(() => new Set(reactions.map((r) => r.pin.pinId)), [reactions]);
  const remaining = useMemo(
    () => pins.filter((p) => !reactedIds.has(p.pinId)),
    [pins, reactedIds],
  );

  const profile = useMemo(() => buildProfile(reactions), [reactions]);
  const current = useMemo(
    () => pickNext(remaining, profile, { turn: reactions.length }),
    [remaining, profile, reactions.length],
  );

  const direction = useMemo(() => composeDirection(profile), [profile]);
  // The convergence metric: how far the direction moved on the last reaction.
  // Pure — recompose from the prior reaction rather than threading a ref.
  const recentShift = useMemo(() => {
    if (!direction) return Infinity;
    const prev = composeDirection(buildProfile(reactions.slice(0, -1)));
    return paletteShift(prev?.palette, direction.palette);
  }, [direction, reactions]);
  const settling = isSettling({ resonantCount: profile.resonantCount, recentShift });

  const react = useCallback(
    (key) => {
      if (!current?.pin) return;
      const pin = current.pin;
      setReactions((prev) => [...prev, { pin, key }]);
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

  const reset = useCallback(() => setReactions([]), []);

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
              reason={current.reason}
              seen={reactions.length}
              total={pins.length}
              resonating={profile.resonantCount}
              onReact={react}
            />
          )}
        </section>

        <aside className={styles.directionCol} aria-label="The emerging direction">
          <DirectionPanel
            direction={direction}
            project={project}
            profile={profile}
            settling={settling}
          />
        </aside>
      </div>
    </div>
  );
}

function ReactCard({ pin, reason, seen, total, resonating, onReact }) {
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

      <div className={styles.cardSwatches} aria-hidden="true">
        {pin.palette.slice(0, 6).map((hex, i) => (
          <span key={i} className={styles.cardSwatch} style={{ background: hex }} />
        ))}
      </div>

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

function DirectionPanel({ direction, project, profile, settling }) {
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
        <span className={styles.typeNote}>suggested from your colours</span>
      </p>

      {profile.likedPins.length > 0 && (
        <div className={styles.cluster}>
          <p className={styles.clusterLabel}>What you resonated with</p>
          <div className={styles.clusterThumbs}>
            {profile.likedPins.map((p) => (
              <a
                key={p.pinId}
                className={styles.clusterThumb}
                href={p.sourceUrl || p.pinUrl}
                target="_blank"
                rel="noreferrer noopener"
                title={p.title || "Reference"}
              >
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={p.thumbnail} alt={p.title || "Reference"} />
              </a>
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
