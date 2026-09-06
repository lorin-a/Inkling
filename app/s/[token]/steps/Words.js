"use client";

import { useState } from "react";
import styles from "../studio.module.css";
import { NOTE_COLORS, NOTE_COLOR_KEYS } from "../Card";

/**
 * Step 1. First words, before the material has had its say. Everyone writes
 * alone; you see the others' words once you have written one of your own, so
 * nobody anchors on whoever typed first. Three is a suggestion, not a limit.
 *
 * [provisional] the copy is Claude's; Lorin to accept or replace.
 */
export default function Words({ words, allWords, people, addWord, updateWord, deleteWord, skip, next, total }) {
  const [draft, setDraft] = useState("");
  const [color, setColor] = useState("yellow");
  const [busy, setBusy] = useState(false);
  const others = people.filter((p) => !p.me);
  const theirs = (id) => allWords.filter((w) => w.memberId === id && w.kind === "first");
  const anyTheirs = others.some((p) => theirs(p.id).length > 0);

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
          How should this brand feel? A word, or a short phrase. Aim for three.
          {others.length ? " Everyone writes alone. You see each other’s words once you have written one." : " Invite collaborators from the sidebar and they write theirs too."}
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

        {others.length > 0 && words.length > 0 && (
          <section className={styles.wordsReveal} aria-label="Your collaborators’ words">
            <h2 className={styles.pileTitle}>{others.length === 1 ? `${others[0].name}’s words` : "Your collaborators’ words"}</h2>
            {!anyTheirs && <p className={styles.muted}>Nothing written yet. This page checks on its own.</p>}
            <div className={styles.wordsCols}>
              {others.filter((p) => theirs(p.id).length > 0).map((p) => (
                <div key={p.id} className={styles.wordsCol}>
                  {others.length > 1 && <h3 className={styles.wordsWho}>{p.name}</h3>}
                  <ul className={styles.stickiesSmall}>
                    {theirs(p.id).map((w) => <li key={w.id} className={styles.stickySmall} style={{ background: NOTE_COLORS[w.color] || NOTE_COLORS.yellow }}>{w.text}</li>)}
                  </ul>
                </div>
              ))}
            </div>
          </section>
        )}

        <div className={styles.rowEnd}>
          {words.length === 0
            ? <button type="button" className={styles.quiet} onClick={skip}>Skip for now</button>
            : <button type="button" className={styles.action} onClick={next}>{total > 0 ? "Next: bring in the board" : "Next: import your board"}</button>}
        </div>
      </div>
    </div>
  );
}
