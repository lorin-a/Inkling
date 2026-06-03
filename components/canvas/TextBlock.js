"use client";

import { useEffect, useRef, useState } from "react";
import { resolveFontFamily } from "./blockOptions";
import styles from "./canvas.module.css";

/**
 * A text label / annotation block. Double-click to edit (a fresh block opens
 * straight into edit mode). While editing, keystrokes are kept from bubbling to
 * the Block wrapper so arrows/Delete edit the text instead of moving or deleting
 * the block, and the textarea is data-noselect so typing never drags the block.
 */
export default function TextBlock({ payload, selected, onChange }) {
  const text = payload?.text || "";
  const color = payload?.color || "var(--ink)";
  const fontFamily = resolveFontFamily(payload?.font);
  const caption = payload?.caption || ""; // provenance for type specimens (family · source)
  const size = payload?.size; // px; type specimens land large, not at the 16px default
  const [editing, setEditing] = useState(!text); // a new (empty) block edits immediately
  const ref = useRef(null);

  useEffect(() => {
    if (editing && ref.current) {
      const el = ref.current;
      el.focus();
      el.setSelectionRange(el.value.length, el.value.length);
    }
  }, [editing]);

  // Leaving the block (deselect) ends editing.
  useEffect(() => {
    if (!selected && editing) setEditing(false);
  }, [selected, editing]);

  if (editing) {
    return (
      <textarea
        ref={ref}
        data-noselect
        className={styles.textArea}
        style={{ color, fontFamily, fontSize: size ? `${size}px` : undefined }}
        defaultValue={text}
        placeholder="Type something…"
        onBlur={(e) => { onChange({ text: e.target.value }); setEditing(false); }}
        onKeyDown={(e) => {
          if (e.key === "Escape") e.currentTarget.blur();
          e.stopPropagation(); // don't let the Block wrapper act on these keys
        }}
      />
    );
  }

  return (
    <div
      className={styles.textView}
      style={{ color }}
      onDoubleClick={(e) => { e.stopPropagation(); setEditing(true); }}
    >
      <div
        className={styles.textBody}
        style={{ fontFamily, fontSize: size ? `${size}px` : undefined }}
      >
        {text || <span className={styles.textPlaceholder}>Double-click to edit</span>}
      </div>
      {caption && <div className={styles.textCaption}>{caption}</div>}
    </div>
  );
}
