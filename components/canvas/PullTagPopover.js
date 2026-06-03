"use client";

import { useEffect, useRef, useState } from "react";
import { DIMENSIONS } from "../../lib/canvasDimensions";
import { fontStack } from "../FontLoader";
import styles from "./canvas.module.css";

/**
 * The "pull" tag picker — "this part, and it's about ___." Names the dimension
 * (the spine of the tag model) plus the user's free tags, then adds the
 * reference to the well. A centered dialog so it serves both entry points
 * (a crop on the board, a whole pin from the tray) with no anchoring.
 *
 * Dimension is required (the "about"); tags are optional and the user's own.
 */
export default function PullTagPopover({ draft, onConfirm, onCancel }) {
  // Color / type drafts arrive with their dimension already known — pre-select it
  // (and echo it as a starter tag); an image crop opens with none chosen.
  const [dimension, setDimension] = useState(draft?.dimension || "");
  const [tags, setTags] = useState(draft?.dimension ? [draft.dimension] : []);
  const [draftTag, setDraftTag] = useState("");
  const firstRef = useRef(null);

  useEffect(() => {
    firstRef.current?.focus();
    const onKey = (e) => { if (e.key === "Escape") onCancel?.(); };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onCancel]);

  function pickDimension(slug) {
    setDimension(slug);
    // Echo the dimension as a starter tag (the user can remove it) so the
    // dimension and tags stay consistent — search by either finds it.
    setTags((prev) => (prev.length === 0 ? [slug] : prev));
  }
  function addTag() {
    const t = draftTag.trim().toLowerCase();
    if (t && !tags.includes(t)) setTags([...tags, t]);
    setDraftTag("");
  }

  return (
    <div className={styles.pullScrim} onPointerDown={(e) => { if (e.target === e.currentTarget) onCancel?.(); }}>
      <div className={styles.pullCard} role="dialog" aria-modal="true" aria-label="Pull to your well">
        <PullPreview draft={draft} />
        <h2 className={styles.pullTitle}>This part, and it&rsquo;s about&hellip;</h2>

        <div className={styles.pullDims} role="radiogroup" aria-label="Dimension">
          {DIMENSIONS.map((d, i) => (
            <button
              key={d.slug}
              ref={i === 0 ? firstRef : undefined}
              type="button"
              role="radio"
              aria-checked={dimension === d.slug}
              className={styles.pullDim}
              data-on={dimension === d.slug ? "true" : undefined}
              onClick={() => pickDimension(d.slug)}
            >
              {d.label}
            </button>
          ))}
        </div>

        <label className={styles.pullTagLabel}>
          Your tags <span className={styles.pullOpt}>(optional)</span>
        </label>
        <div className={styles.pullTagRow}>
          <input
            className={styles.pullTagInput}
            value={draftTag}
            onChange={(e) => setDraftTag(e.target.value)}
            onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); addTag(); } }}
            placeholder="Add a word, press Enter"
            spellCheck={false}
          />
        </div>
        {tags.length > 0 && (
          <ul className={styles.pullChips}>
            {tags.map((t) => (
              <li key={t} className={styles.pullChip}>
                {t}
                <button type="button" className={styles.pullChipX} onClick={() => setTags(tags.filter((x) => x !== t))} aria-label={`Remove ${t}`}>×</button>
              </li>
            ))}
          </ul>
        )}

        <div className={styles.pullActions}>
          <button type="button" className={styles.pullCancel} onClick={onCancel}>Cancel</button>
          <button type="button" className={styles.pullAdd} disabled={!dimension} onClick={() => onConfirm?.(dimension, tags)}>
            Add to well
          </button>
        </div>
      </div>
    </div>
  );
}

function PullPreview({ draft }) {
  const v = draft?.visual || {};
  if (draft?.kind === "color") {
    return <div className={styles.pullPreview} style={{ background: v.hex }} />;
  }
  if (draft?.kind === "type") {
    return <div className={styles.pullPreview} style={{ display: "grid", placeItems: "center", fontSize: 30, fontFamily: fontStack({ family: v.font?.family }, "serif") }}>{v.text || "Ag"}</div>;
  }
  const fx = v.crop?.focal?.x ?? 0.5;
  const fy = v.crop?.focal?.y ?? 0.5;
  const zoom = v.crop?.zoom || 1;
  return (
    <div className={styles.pullPreview}>
      {v.src && (
        <img
          src={v.src}
          alt=""
          draggable={false}
          style={{ width: "100%", height: "100%", objectFit: "cover", objectPosition: `${fx * 100}% ${fy * 100}%`, transform: `scale(${zoom})`, transformOrigin: `${fx * 100}% ${fy * 100}%` }}
        />
      )}
    </div>
  );
}
