"use client";

import { useState } from "react";
import styles from "../studio.module.css";
import { NOTE_COLORS } from "../Card";
import { everyoneWord } from "../../../../lib/studio/steps";

const TAG_LABEL = { keep: "Keep", maybe: "Maybe", no: "No", undecided: "Undecided" };

/**
 * Step 5. The reveal. Three piles that did not exist before anyone voted:
 * what you both kept, what you both cut, and the split, which is where the
 * conversation is. Each person can say why, and the split can be voted on
 * again, alone, as many times as it takes.
 */
export default function Compare({ references, votes, setWhy, everyone, allWords, revealOpen, people, reveal, total, voted, startVoting, bringKeeps, go }) {
  const [openWhy, setOpenWhy] = useState(null);
  const finished = people.filter((p) => p.done);
  const others = people.filter((p) => !p.me);
  const all = everyoneWord(finished.length);

  if (!revealOpen || !reveal) {
    return (
      <div className={`${styles.stepBody} ${styles.stepPad}`}>
        <div className={styles.narrow}>
          {others.length === 0 ? (
            <p className={styles.lead}>Compare needs at least two people. Add a collaborator in the sidebar and send them their link.</p>
          ) : voted < total ? (
            <>
              <p className={styles.lead}>Compare opens once you and at least one collaborator have voted on everything. You have {total - voted} left.</p>
              <button type="button" className={styles.action} onClick={() => startVoting("unvoted")}>Keep voting</button>
            </>
          ) : (
            <>
              <p className={styles.lead}>You are done. Waiting for {others.length === 1 ? others[0].name : "your collaborators"}. This page checks on its own.</p>
              <ul className={styles.plainList}>
                {others.map((p) => <li key={p.id} className={styles.muted}>{p.name}: {p.done ? "finished" : `${p.voted} of ${total}`}</li>)}
              </ul>
            </>
          )}
        </div>
      </div>
    );
  }

  const wordsBy = (id) => allWords.filter((w) => w.memberId === id && w.kind === "first");
  const anyWords = allWords.some((w) => w.kind === "first");
  const pileProps = { everyone, finished, votes, openWhy, setOpenWhy, setWhy };

  return (
    <div className={styles.stepBody}>
      <div className={styles.toolbar}>
        {reveal.split.length > 0 && (
          <button type="button" className={styles.action} onClick={() => startVoting(reveal.split.map((c) => c.id))}>Vote again on the split ({reveal.split.length})</button>
        )}
        {reveal.bothKeep.length > 0 && (
          <button type="button" className={styles.quiet} onClick={bringKeeps}>Bring the {reveal.bothKeep.length} {all} kept to Group</button>
        )}
        <button type="button" className={styles.quiet} onClick={() => go("colors")}>See the colors</button>
        <span className={styles.toolbarNote}>Votes from {finished.map((p) => (p.me ? "you" : p.name)).join(" and ")}.</span>
      </div>

      <div className={styles.compareScroll}>
        {anyWords && (
          <section className={styles.wordsReveal} aria-label="First words">
            <h2 className={styles.pileTitle}>First words</h2>
            <div className={styles.wordsCols}>
              {finished.map((p) => (
                <div key={p.id} className={styles.wordsCol}>
                  <h3 className={styles.wordsWho}>{p.me ? "You" : p.name}</h3>
                  <ul className={styles.stickiesSmall}>
                    {wordsBy(p.id).map((w) => <li key={w.id} className={styles.stickySmall} style={{ background: NOTE_COLORS[w.color] || NOTE_COLORS.yellow }}>{w.text}</li>)}
                    {wordsBy(p.id).length === 0 && <li className={styles.muted}>Nothing written.</li>}
                  </ul>
                </div>
              ))}
            </div>
          </section>
        )}

        <div className={styles.piles}>
          <Pile title={finished.length <= 2 ? "You both kept" : "Everyone kept"} items={reveal.bothKeep} tone="keep" hint={`Nothing ${all} kept yet.`} {...pileProps} />
          <Pile title="Split" items={reveal.split} tone="split" hint="No disagreements. That is rare." {...pileProps} />
          <Pile title={finished.length <= 2 ? "You both said no" : "Everyone said no"} items={reveal.bothNo} tone="no" hint={`Nothing ${all} cut.`} {...pileProps} />
        </div>
      </div>
    </div>
  );
}

function Pile({ title, items, tone, hint, everyone, finished, votes, openWhy, setOpenWhy, setWhy }) {
return (
  <section className={`${styles.pile} ${styles[`pile_${tone}`]}`} aria-label={`${title}, ${items.length}`}>
    <header className={styles.pileHead}>
      <h2 className={styles.pileTitle}>{title}</h2>
      <span className={styles.pileCount}>{items.length}</span>
    </header>
    {items.length === 0 && <p className={styles.laneEmpty}>{hint}</p>}
    <div className={styles.pileGrid}>
      {items.map((c) => {
        const by = everyone[c.id] || {};
        return (
          <div key={c.id} className={styles.compareCard}>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={c.src} alt={c.alt} loading="lazy" />
            <ul className={styles.chips}>
              {finished.map((p) => (
                <li key={p.id} className={`${styles.chip} ${styles[`chip_${by[p.id]?.tag || "none"}`]}`}>
                  <span className={styles.chipWho}>{p.me ? "You" : p.name}</span>
                  <span className={styles.chipTag}>{TAG_LABEL[by[p.id]?.tag] || "No vote"}</span>
                  {by[p.id]?.why && <span className={styles.chipWhy}>“{by[p.id].why}”</span>}
                </li>
              ))}
            </ul>
            {openWhy === c.id ? (
              <textarea className={styles.chooseWhy} rows={2} autoFocus defaultValue={votes[c.id]?.why || ""} placeholder="Why did you vote that way?" aria-label="Why" onBlur={(e) => { setWhy(c.id, e.target.value); setOpenWhy(null); }} />
            ) : (
              <button type="button" className={styles.link} onClick={() => setOpenWhy(c.id)}>{votes[c.id]?.why ? "Edit why" : "Say why"}</button>
            )}
          </div>
        );
      })}
    </div>
  </section>
);
}
