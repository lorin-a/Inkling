"use client";

import { useEffect, useRef, useState } from "react";
import styles from "../studio.module.css";

const CHOICES = [
  { tag: "keep", label: "Keep", key: "1" },
  { tag: "maybe", label: "Maybe", key: "2" },
  { tag: "no", label: "No", key: "3" },
  { tag: "undecided", label: "Undecided", key: "4" },
];

/**
 * Step 3. One card at a time, nothing else on screen. Four answers, a place
 * to say why, and the count. Your votes are yours until Compare.
 */
export default function Vote({ voting, cards, votes, decide, leave, startVoting, total, voted, counts, partner }) {
  const card = voting ? cards.find((c) => c.id === voting.queue[voting.index]) : null;
  const [why, setWhy] = useState("");
  const whyRef = useRef(null);

  useEffect(() => { setWhy(card ? votes[card.id]?.why || "" : ""); }, [card?.id]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    if (!voting) return;
    const onKey = (e) => {
      if (/^(INPUT|TEXTAREA)$/.test(e.target?.tagName || "") && e.key !== "Escape") return;
      const c = CHOICES.find((x) => x.key === e.key);
      if (c) { e.preventDefault(); decide(c.tag, why); }
      if (e.key === "Escape") { e.preventDefault(); leave(); }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [voting, decide, leave, why]);

  if (!voting || !card) {
    const left = total - voted;
    return (
      <div className={`${styles.stepBody} ${styles.stepPad}`}>
        <div className={styles.narrow}>
          {total === 0 ? (
            <p className={styles.lead}>Nothing to vote on yet. Import a board first.</p>
          ) : left > 0 ? (
            <>
              <p className={styles.lead}>{voted === 0 ? `${total} cards to vote on.` : `${voted} voted, ${left} left.`}</p>
              <button type="button" className={styles.action} onClick={() => startVoting("unvoted")}>{voted === 0 ? "Start voting" : "Keep voting"}</button>
            </>
          ) : (
            <>
              <p className={styles.lead}>You have voted on all {total}. {counts.keep} keep, {counts.maybe} maybe, {counts.no} no, {counts.undecided} undecided.</p>
              <div className={styles.row}>
                {counts.maybe > 0 && <button type="button" className={styles.action} onClick={() => startVoting("maybe")}>Vote again on the maybes ({counts.maybe})</button>}
                {counts.undecided > 0 && <button type="button" className={styles.action} onClick={() => startVoting("undecided")}>Decide the undecided ({counts.undecided})</button>}
                <button type="button" className={styles.quiet} onClick={() => startVoting("all")}>Vote on everything again</button>
              </div>
              {partner && <p className={styles.muted}>{partner.done ? `${partner.name} has finished too. Compare is open.` : `${partner.name} has voted on ${partner.voted} of ${total}.`}</p>}
            </>
          )}
        </div>
      </div>
    );
  }

  const current = votes[card.id]?.tag;
  return (
    <div className={`${styles.stepBody} ${styles.voteScreen}`}>
      <p className={styles.voteCount} aria-live="polite">{voting.index + 1} of {voting.queue.length}{voting.round > 1 ? ` · round ${voting.round}` : ""}</p>

      <div className={styles.voteCard}>
        {card.kind === "reference" && (
          // eslint-disable-next-line @next/next/no-img-element
          <img key={card.id} src={card.full || card.src} alt={card.alt} className={styles.voteImg} />
        )}
        {card.kind === "swatch" && <span className={styles.voteSwatch} style={{ background: card.hex }}>{card.hex}</span>}
        {card.kind === "note" && <p className={styles.voteNote}>{card.text || "…"}</p>}
      </div>

      <div className={styles.voteChoices} role="group" aria-label="Your vote">
        {CHOICES.map((c) => (
          <button
            key={c.tag}
            type="button"
            className={`${styles.voteBtn} ${styles[`vote_${c.tag}`]} ${current === c.tag ? styles.voteBtnCurrent : ""}`}
            onClick={() => decide(c.tag, why)}
          >
            {c.label} <kbd>{c.key}</kbd>
          </button>
        ))}
      </div>

      <label className={styles.whyWrap}>
        <span className={styles.whyLabel}>Why? (optional) What you like, dislike, or the impression it gives.</span>
        <textarea
          ref={whyRef}
          className={styles.why}
          value={why}
          onChange={(e) => setWhy(e.target.value)}
          rows={2}
          maxLength={600}
          placeholder="Say it in a few words"
        />
      </label>

      <button type="button" className={styles.link} onClick={leave}>Stop for now <kbd>Esc</kbd></button>
    </div>
  );
}
