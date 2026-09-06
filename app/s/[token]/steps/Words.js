"use client";

import { useState } from "react";
import styles from "../studio.module.css";
import { NOTE_COLORS, NOTE_COLOR_KEYS } from "../Card";

/**
 * Step 2. First words, written alone, before the material has had its say.
 * Private until Compare, so neither person anchors on the other. Three is a
 * suggestion, not a limit.
 *
 * [provisional] the copy is Claude's; Lorin to accept or replace.
 */
export default function Words({ words, addWord, updateWord, deleteWord, skip, start, partner }) {
  const [draft, setDraft] = useState("");
  const [color, setColor] = useState("yellow");
  const [busy, setBusy] = useState(false);

  const submit = async (e) => {
    e.preventDefault();
    const text = draft.trim();
    if (!text || busy) return;
    setBusy(true);
    await addWord(text, color);
    setDraft("");
    setBusy(false);
  };

  return (
    <div className={`${styles.stepBody} ${styles.stepPad}`}>
      <div className={styles.narrow}>
        <p className={styles.lead}>
          Before you vote, write down how this brand should feel. A word, or a short phrase. Aim for three.
          {partner ? ` ${partner.name} writes theirs alone too. You see each other’s at Compare.` : ""}
        </p>

        <form className={styles.wordForm} onSubmit={submit}>
          <label className={styles.srOnly} htmlFor="first-word">A word for how the brand should feel</label>
          <input
            id="first-word"
            className={styles.wordInput}
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            placeholder="How should it feel?"
            maxLength={200}
            autoComplete="off"
            autoFocus
          />
          <span className={styles.noteColors} role="group" aria-label="Sticky color">
            {NOTE_COLOR_KEYS.map((k) => (
              <button key={k} type="button" className={`${styles.noteDot} ${color === k ? styles.noteDotOn : ""}`} style={{ background: NOTE_COLORS[k] }} aria-label={`${k}`} aria-pressed={color === k} onClick={() => setColor(k)} />
            ))}
          </span>
          <button type="submit" className={styles.action} disabled={!draft.trim() || busy}>Add word</button>
        </form>

        <ul className={styles.stickies} aria-label="Your words">
          {words.map((w) => (
            <li key={w.id} className={styles.sticky} style={{ background: NOTE_COLORS[w.color] || NOTE_COLORS.yellow }}>
              <textarea
                className={styles.stickyText}
                value={w.text}
                aria-label="Edit word"
                rows={2}
                onChange={(e) => updateWord(w.id, e.target.value, w.color)}
              />
              <span className={styles.stickyRow}>
                <span className={styles.noteColors} role="group" aria-label="Sticky color">
                  {NOTE_COLOR_KEYS.map((k) => (
                    <button key={k} type="button" className={`${styles.noteDot} ${w.color === k ? styles.noteDotOn : ""}`} style={{ background: NOTE_COLORS[k] }} aria-label={k} aria-pressed={w.color === k} onClick={() => updateWord(w.id, w.text, k)} />
                  ))}
                </span>
                <button type="button" className={styles.trayLink} onClick={() => deleteWord(w.id)}>Delete</button>
              </span>
            </li>
          ))}
        </ul>

        <div className={styles.rowEnd}>
          {words.length === 0
            ? <button type="button" className={styles.quiet} onClick={skip}>Skip for now</button>
            : <button type="button" className={styles.action} onClick={start}>Done, start voting</button>}
        </div>
      </div>
    </div>
  );
}
