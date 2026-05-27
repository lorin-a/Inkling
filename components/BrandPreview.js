"use client";

import { useEffect, useRef, useState } from "react";
import FigmaFrame from "./FigmaFrame";
import { derivePreviewRoles as mapRoles } from "../lib/derivePreviewRoles";
import styles from "./BrandPreview.module.css";

/**
 * Recreates the Whelm brand wordmark composition at 1920px logical width.
 * Role-based colors driven from the parent. Variant "dark" puts bg at
 * darkest, ink at lightest. Variant "light" reverses.
 *
 * Hand-drawn marks render in their own MarksFrame component, not here —
 * they're intentional multi-color brand assets and don't take part in the
 * shuffle.
 */
const DEFAULT_PROJECT = {
  wordmark: "whelm",
  period: ".",
  initial: "w",
  tagline: "Find your way to feeling",
  body: "A ritual for cultivating a relationship with your intuition",
};

/**
 * BrandPreview is now "dumb" about role derivation — the parent computes
 * resolved roles (auto-derived + user overrides merged) and passes them in.
 * Variant just swaps bg↔ink at render time so the light/dark pair stays
 * coherent without needing duplicate overrides.
 */
export default function BrandPreview({ palette, variant = "dark", project, roles: rolesIn, onPickRole, onEditText }) {
  // Each variant carries its own resolved roles now — no more bg↔ink flip
  // at render time. The parent passes variant-specific roles, and clicks
  // on this variant only modify this variant's overrides.
  const roles = rolesIn || mapRoles(palette, variant);
  const p = { ...DEFAULT_PROJECT, ...(project || {}) };

  const editable = !!onEditText;
  const [editing, setEditing] = useState(null); // which text field, or null
  const clickTimer = useRef(null);
  const editRef = useRef(null);

  // Focus + select the field when inline editing starts.
  useEffect(() => {
    if (!editing || !editRef.current) return;
    const el = editRef.current;
    el.focus();
    const range = document.createRange();
    range.selectNodeContents(el);
    const sel = window.getSelection();
    sel.removeAllRanges();
    sel.addRange(range);
  }, [editing]);

  const pick = (role) => (e) => {
    if (!onPickRole) return;
    e.stopPropagation();
    onPickRole(variant, role, e);
  };
  const cls = (base) => `${base} ${onPickRole ? styles.clickable : ""}`;

  // Single click recolors; double click edits. On editable surfaces we delay
  // the recolor briefly so a double-click can cancel it (capturing the cursor
  // position up front — openPicker only needs clientX/Y).
  function textClick(role, field) {
    return (e) => {
      e.stopPropagation();
      if (editing === field) return;
      if (!onPickRole) return;
      const { clientX, clientY } = e;
      if (clickTimer.current) clearTimeout(clickTimer.current);
      clickTimer.current = setTimeout(() => {
        onPickRole(variant, role, { clientX, clientY });
        clickTimer.current = null;
      }, editable ? 220 : 0);
    };
  }
  function textDouble(field) {
    if (!editable) return undefined;
    return (e) => {
      e.stopPropagation();
      if (clickTimer.current) { clearTimeout(clickTimer.current); clickTimer.current = null; }
      setEditing(field);
    };
  }
  function commitEdit(field, el) {
    if (clickTimer.current) { clearTimeout(clickTimer.current); clickTimer.current = null; }
    const val = (el.innerText || "").replace(/\s+/g, " ").trim();
    setEditing(null);
    if (val && val !== p[field]) onEditText(field, val);
  }
  function editProps(field) {
    if (editing !== field) return {};
    return {
      ref: editRef,
      contentEditable: true,
      suppressContentEditableWarning: true,
      spellCheck: false,
      onClick: (e) => e.stopPropagation(),
      onBlur: (e) => commitEdit(field, e.currentTarget),
      onKeyDown: (e) => {
        if (e.key === "Enter") { e.preventDefault(); e.currentTarget.blur(); }
        else if (e.key === "Escape") { e.preventDefault(); setEditing(null); }
      },
    };
  }
  const textTitle = editable ? "Click to recolor · double-click to edit" : (onPickRole ? "Click to recolor" : undefined);

  const fontVars = buildFontVars(p.fonts);
  const texture = p.textures?.[variant] || null;

  return (
    <FigmaFrame
      width={1920}
      height={931}
      background={roles.bg}
      onClick={onPickRole ? pick("bg") : undefined}
      style={fontVars}
    >
      {texture && (
        <div
          aria-hidden="true"
          style={{
            position: "absolute",
            inset: 0,
            backgroundImage: `url(${texture.url})`,
            backgroundSize: "cover",
            backgroundPosition: "center",
            opacity: texture.opacity ?? 0.6,
            mixBlendMode: texture.blend || "multiply",
            pointerEvents: "none",
          }}
        />
      )}
      {/* primary wordmark */}
      <p
        className={styles.wordmark}
        style={{ left: 142, top: 183, color: roles.ink }}
      >
        <span
          className={cls(styles.editText)}
          onClick={textClick("ink", "wordmark")}
          onDoubleClick={textDouble("wordmark")}
          title={textTitle}
          {...editProps("wordmark")}
        >{p.wordmark}</span><span className={cls(styles.periodSpan)} onClick={pick("accent")} style={{ color: roles.accent }} title={onPickRole ? "Click to recolor accent" : undefined}>{p.period}</span>
      </p>
      {/* italic wordmark */}
      <p
        className={cls(styles.wordmarkItalic)}
        style={{ left: 135, top: 423, color: roles.muted }}
        onClick={pick("muted")}
        title={onPickRole ? "Click to recolor subtext" : undefined}
      >
        {p.wordmark}<span className={cls(styles.periodSpan)} onClick={pick("accent")} style={{ color: roles.accent }}>{p.period}</span>
      </p>
      {/* small initial italic */}
      <p
        className={cls(styles.smallW)}
        style={{ left: 1228, top: 236, color: roles.ink }}
        onClick={pick("ink")}
      >
        {p.initial}<span className={cls(styles.periodSpan)} onClick={pick("accent")} style={{ color: roles.accent }}>{p.period}</span>
      </p>
      {/* small initial roman */}
      <p
        className={cls(styles.smallWRoman)}
        style={{ left: 1484, top: 236, color: roles.muted }}
        onClick={pick("muted")}
      >
        {p.initial}<span className={cls(styles.periodSpan)} onClick={pick("accent")} style={{ color: roles.accent }}>{p.period}</span>
      </p>
      {/* tagline + body flow as a stack so a long tagline pushes the body
          down instead of overlapping it (handles any tagline length) */}
      <div className={styles.textBlock} style={{ left: 142, top: 676, width: 976 }}>
        <p
          className={cls(styles.tagline)}
          style={{ color: roles.ink }}
          onClick={textClick("ink", "tagline")}
          onDoubleClick={textDouble("tagline")}
          title={textTitle}
          {...editProps("tagline")}
        >
          {p.tagline}
        </p>
        <p
          className={cls(styles.body)}
          style={{ color: roles.muted }}
          onClick={textClick("muted", "body")}
          onDoubleClick={textDouble("body")}
          title={textTitle}
          {...editProps("body")}
        >
          {p.body}
        </p>
      </div>
      {/* swatch row */}
      <div className={styles.swatchRow} style={{ left: 1228, top: 540 }}>
        {palette.map((hex, i) => (
          <span key={i} className={styles.swatch} style={{ backgroundColor: hex }} />
        ))}
      </div>
      {/* gradient 1 */}
      <div
        className={styles.gradientBar}
        style={{
          left: 1228,
          top: 629,
          backgroundImage: roles.gradient1,
        }}
      />
      {/* gradient 2 */}
      <div
        className={styles.gradientBar}
        style={{
          left: 1228,
          top: 725,
          backgroundImage: roles.gradient2,
        }}
      />
    </FigmaFrame>
  );
}

function buildFontVars(fonts) {
  if (!fonts) return {};
  const vars = {};
  const wrap = (slot) => {
    if (!slot?.family) return null;
    return slot.family.includes(" ") ? `"${slot.family}"` : slot.family;
  };
  const title = wrap(fonts.title);
  const subhead = wrap(fonts.subhead);
  const body = wrap(fonts.body);
  if (title) vars["--font-title"] = title;
  if (subhead) vars["--font-subhead"] = subhead;
  if (body) vars["--font-body"] = body;
  return vars;
}

