"use client";

import { useCallback, useEffect, useLayoutEffect, useState } from "react";
import styles from "./Onboarding.module.css";

/**
 * A first-run coachmark tour: spotlights each action in turn and says what you can
 * do with it. Controlled — the parent decides when it's open (first visit, or a
 * "How it works" replay) and persists "seen." Each step targets a real element by
 * `[data-tour="…"]`, so the highlight tracks the actual UI.
 */
const TIP_W = 300;

function computeTip(rect, placement) {
  if (typeof window === "undefined" || !rect) {
    return { left: "50%", top: "40%", transform: "translate(-50%, -50%)", width: TIP_W };
  }
  const pad = 14;
  const vw = window.innerWidth;
  const vh = window.innerHeight;
  let left;
  let top;
  switch (placement) {
    case "right": left = rect.left + rect.width + pad; top = rect.top; break;
    case "left": left = rect.left - TIP_W - pad; top = rect.top; break;
    case "top": left = rect.left; top = rect.top - pad - 150; break;
    default: left = rect.left; top = rect.top + rect.height + pad; // bottom
  }
  left = Math.max(8, Math.min(left, vw - TIP_W - 8));
  top = Math.max(8, Math.min(top, vh - 168));
  return { left, top, width: TIP_W };
}

export default function Onboarding({ steps, onClose }) {
  const [i, setI] = useState(0);
  const [rect, setRect] = useState(null);
  const step = steps[i];
  const last = i === steps.length - 1;

  const measure = useCallback(() => {
    const el = step?.selector ? document.querySelector(step.selector) : null;
    if (!el) {
      setRect(null);
      return;
    }
    const reduce = window.matchMedia?.("(prefers-reduced-motion: reduce)").matches;
    el.scrollIntoView({ block: "nearest", behavior: reduce ? "auto" : "smooth" });
    const r = el.getBoundingClientRect();
    setRect({ top: r.top, left: r.left, width: r.width, height: r.height });
  }, [step]);

  // Measure now, then again as layout settles — the pin image loads after first
  // paint and shifts the targets, so a single measure can anchor to a stale rect.
  useLayoutEffect(() => {
    measure();
    const raf = requestAnimationFrame(measure);
    const t = setTimeout(measure, 320);
    return () => {
      cancelAnimationFrame(raf);
      clearTimeout(t);
    };
  }, [measure]);

  useEffect(() => {
    const onMove = () => measure();
    window.addEventListener("resize", onMove);
    window.addEventListener("scroll", onMove, true);
    return () => {
      window.removeEventListener("resize", onMove);
      window.removeEventListener("scroll", onMove, true);
    };
  }, [measure]);

  const next = useCallback(() => {
    if (last) onClose();
    else setI((v) => v + 1);
  }, [last, onClose]);

  useEffect(() => {
    const onKey = (e) => {
      if (e.key === "Escape") onClose();
      else if (e.key === "ArrowRight" || e.key === "Enter") next();
      else if (e.key === "ArrowLeft") setI((v) => Math.max(0, v - 1));
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [next, onClose]);

  const tip = computeTip(rect, step?.placement);

  return (
    <div className={styles.layer} role="dialog" aria-modal="true" aria-label="How it works">
      {rect ? (
        <div
          className={styles.spot}
          style={{ top: rect.top - 6, left: rect.left - 6, width: rect.width + 12, height: rect.height + 12 }}
        />
      ) : (
        <div className={styles.dim} />
      )}

      <div className={styles.tip} style={tip}>
        <p className={styles.count}>{i + 1} of {steps.length}</p>
        <p className={styles.title}>{step.title}</p>
        <p className={styles.body}>{step.body}</p>
        <div className={styles.actions}>
          <button type="button" className={styles.skip} onClick={onClose}>
            {last ? "Close" : "Skip"}
          </button>
          <div className={styles.nav}>
            {i > 0 && (
              <button type="button" className={styles.back} onClick={() => setI((v) => v - 1)}>
                Back
              </button>
            )}
            <button type="button" className={styles.next} onClick={next}>
              {last ? "Got it" : "Next"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
