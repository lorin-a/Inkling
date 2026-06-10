"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import gsap from "gsap";
import styles from "./BrandShuffle.module.css";

/**
 * The payoff, alive. Not a colour picker — the *brand* Inkling makes. It composes a
 * direction (palette + wordmark + type) and shuffles through expressions of it, the way
 * the old home page's shuffle was enticing, now in the editorial language and driven by
 * GSAP. This is what the landing is selling: you can make this.
 *
 * Looks are composed from the sample coastal references (true to the gathered palette),
 * so the hero reads as "your saved taste → a real identity, many directions."
 */
const LOOKS = [
  { tag: "Soft / faded", bg: "#2d2418", ink: "#f4ece0", accent: "#d0738a", muted: "#b89a8f", type: "Fraunces · Söhne" },
  { tag: "Coastal / light", bg: "#f1eadc", ink: "#2b2c33", accent: "#5b7d8f", muted: "#9aa9ab", type: "Editorial New · Inter" },
  { tag: "Deep / botanical", bg: "#26312b", ink: "#eae3d2", accent: "#cf9b3f", muted: "#8ea08a", type: "Canela · GT America" },
  { tag: "Dusk / dusty", bg: "#5a3a4a", ink: "#f6e9ee", accent: "#9cbcd9", muted: "#c2a3b1", type: "Reckless · Suisse" },
];

export default function BrandShuffle({ name = "Coastline", tagline = "where the tide turns" }) {
  const [i, setI] = useState(0);
  const rootRef = useRef(null);
  const cardRef = useRef(null);
  const wmRef = useRef(null);
  const swRef = useRef(null);
  const metaRef = useRef(null);
  const paused = useRef(false);
  const look = LOOKS[i];

  const shuffle = useCallback(() => setI((n) => (n + 1) % LOOKS.length), []);

  // Auto-cycle, the enticing part — paused on hover so it's not fighting the reader.
  useEffect(() => {
    const id = setInterval(() => { if (!paused.current) setI((n) => (n + 1) % LOOKS.length); }, 3600);
    return () => clearInterval(id);
  }, []);

  // Animate each new look in: tween the card colour, re-draw the swatches, lift the
  // wordmark. The motion is the point.
  useEffect(() => {
    const ctx = gsap.context(() => {
      gsap.to(cardRef.current, { backgroundColor: look.bg, duration: 0.7, ease: "power2.inOut" });
      gsap.fromTo(wmRef.current, { y: 16, opacity: 0, filter: "blur(6px)" },
        { y: 0, opacity: 1, filter: "blur(0px)", duration: 0.65, ease: "power3.out" });
      gsap.fromTo(metaRef.current?.children || [], { y: 10, opacity: 0 },
        { y: 0, opacity: 1, duration: 0.5, stagger: 0.06, ease: "power2.out", delay: 0.08 });
      gsap.fromTo(swRef.current?.children || [], { scaleY: 0, transformOrigin: "bottom" },
        { scaleY: 1, duration: 0.5, stagger: 0.05, ease: "power3.out" });
    }, rootRef);
    return () => ctx.revert();
  }, [i, look.bg]);

  // Entrance.
  useEffect(() => {
    const ctx = gsap.context(() => {
      gsap.fromTo(cardRef.current, { y: 28, opacity: 0 }, { y: 0, opacity: 1, duration: 0.8, ease: "power3.out", delay: 0.15 });
    }, rootRef);
    return () => ctx.revert();
  }, []);

  return (
    <div className={styles.root} ref={rootRef}
      onMouseEnter={() => { paused.current = true; }}
      onMouseLeave={() => { paused.current = false; }}>
      <div className={styles.frameLabel}>
        <span className={styles.fk}>The brand you make</span>
        <span className={styles.fno}>Direction 0{i + 1} / 0{LOOKS.length}</span>
      </div>

      <div className={styles.card} ref={cardRef} style={{ backgroundColor: look.bg }}>
        <div className={styles.cardTop} style={{ color: look.ink }}>
          <span className={styles.cardTag} style={{ color: look.accent, borderColor: look.accent }}>{look.tag}</span>
          <span className={styles.cardType} style={{ color: look.muted }}>{look.type}</span>
        </div>

        <div className={styles.wordmark} ref={wmRef} style={{ color: look.ink }}>
          {name}<span style={{ color: look.accent }}>.</span>
        </div>

        <div className={styles.meta} ref={metaRef}>
          <span className={styles.tagline} style={{ color: look.muted }}>“{tagline}”</span>
          <span className={styles.initials} style={{ color: look.ink, borderColor: look.muted }}>
            {name.slice(0, 1)}<span style={{ color: look.accent }}>·</span>{name.slice(-1)}
          </span>
        </div>

        <div className={styles.swatches} ref={swRef}>
          {[look.bg, look.ink, look.accent, look.muted].map((c, k) => (
            <span key={k} style={{ background: c }} />
          ))}
        </div>
      </div>

      <button type="button" className={styles.shuffle} onClick={shuffle}>
        <span className={styles.shuffleIcon} aria-hidden="true">⤮</span> Shuffle the direction
      </button>
    </div>
  );
}
