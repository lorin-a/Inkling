"use client";

import { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";
import styles from "../studio.module.css";

const LANES = [
  { tag: "keep", label: "Keep" },
  { tag: "maybe", label: "Maybe" },
  { tag: "no", label: "No" },
  { tag: "undecided", label: "Undecided" },
];
const CHOICES = LANES;

/**
 * Step 4. Your votes as four tidy columns. Drag a card to another column and
 * the column opens a gap where it will land, the one it left closes up, and
 * the drop is the vote. Click a card to change its vote without dragging.
 */
export default function Sort({ references, votes, setVote, setWhy, startVoting, counts, total, voted, people, reveal, go, bringKeeps, log }) {
  const key = typeof window !== "undefined" ? `inkling-order-${window.location.pathname}` : "inkling-order";
  const [order, setOrder] = useState({ keep: [], maybe: [], no: [], undecided: [] });
  useEffect(() => { try { const s = window.localStorage.getItem(key); if (s) setOrder(JSON.parse(s)); } catch { /* fine */ } }, [key]);
  useEffect(() => { try { window.localStorage.setItem(key, JSON.stringify(order)); } catch { /* fine */ } }, [order, key]);

  const byId = useMemo(() => new Map(references.map((c) => [c.id, c])), [references]);
  const others = people.filter((p) => !p.me);
  const lists = useMemo(() => {
    const out = {};
    for (const { tag } of LANES) {
      const inLane = references.filter((c) => votes[c.id]?.tag === tag).map((c) => c.id);
      const ordered = (order[tag] || []).filter((id) => inLane.includes(id));
      const rest = inLane.filter((id) => !ordered.includes(id));
      out[tag] = [...ordered, ...rest];
    }
    return out;
  }, [references, votes, order]);

  /* --- drag ------------------------------------------------------------- */
  const [drag, setDrag] = useState(null); // { id, from, x, y, dx, dy, w, h, moved, pointer }
  const [over, setOver] = useState(null); // { lane, index }
  const laneRefs = useRef({});
  const [open, setOpen] = useState(null); // card id with the chooser open

  const onDown = (e, id, lane) => {
    if (e.button !== 0) return;
    if (e.target.closest("button,textarea,input")) return;
    const el = e.currentTarget;
    const r = el.getBoundingClientRect();
    el.setPointerCapture(e.pointerId);
    setDrag({ id, from: lane, x: r.left, y: r.top, dx: e.clientX - r.left, dy: e.clientY - r.top, w: r.width, h: r.height, moved: false, pointer: e.pointerId, sx: e.clientX, sy: e.clientY });
  };

  const locate = useCallback((clientX, clientY, dragId) => {
    for (const { tag } of LANES) {
      const lane = laneRefs.current[tag];
      if (!lane) continue;
      const r = lane.getBoundingClientRect();
      if (clientX < r.left || clientX > r.right || clientY < r.top || clientY > r.bottom) continue;
      const items = [...lane.querySelectorAll("[data-sort-id]")].filter((el) => el.dataset.sortId !== dragId);
      let index = items.length;
      for (let i = 0; i < items.length; i += 1) {
        const b = items[i].getBoundingClientRect();
        const cy = b.top + b.height / 2;
        const cx = b.left + b.width / 2;
        // Reading order: the first card whose row is below the pointer, or
        // whose centre is to the right on the pointer's own row.
        if (clientY < b.top || (clientY <= b.bottom && clientY >= b.top && clientX < cx) || (clientY < cy && clientY >= b.top)) { index = i; break; }
      }
      return { lane: tag, index };
    }
    return null;
  }, []);

  const onMove = (e) => {
    if (!drag || e.pointerId !== drag.pointer) return;
    if (!drag.moved && Math.hypot(e.clientX - drag.sx, e.clientY - drag.sy) < 6) return;
    const next = { ...drag, moved: true, x: e.clientX - drag.dx, y: e.clientY - drag.dy };
    setDrag(next);
    setOver(locate(e.clientX, e.clientY, drag.id));
  };

  const onUp = (e) => {
    if (!drag || e.pointerId !== drag.pointer) return;
    const d = drag;
    const o = over;
    setDrag(null);
    setOver(null);
    if (!d.moved) { setOpen((cur) => (cur === d.id ? null : d.id)); return; }
    if (!o) return;
    // Place it exactly where the gap was, in the lane it was dropped in.
    setOrder((ord) => {
      const next = {};
      for (const { tag } of LANES) next[tag] = (lists[tag] || []).filter((id) => id !== d.id);
      next[o.lane].splice(Math.min(o.index, next[o.lane].length), 0, d.id);
      return next;
    });
    if (o.lane !== d.from) setVote(d.id, o.lane, undefined, { via: "drag" });
    else log("sort_reorder", { card: d.id, lane: o.lane, index: o.index });
  };

  /* --- FLIP: everything that moves, moves visibly ---------------------- */
  const rects = useRef(new Map());
  useLayoutEffect(() => {
    const reduced = window.matchMedia?.("(prefers-reduced-motion: reduce)").matches;
    const now = new Map();
    document.querySelectorAll("[data-sort-id]").forEach((el) => {
      const id = el.dataset.sortId;
      const r = el.getBoundingClientRect();
      now.set(id, r);
      const was = rects.current.get(id);
      if (was && !reduced && id !== drag?.id) {
        const dx = was.left - r.left;
        const dy = was.top - r.top;
        if (Math.abs(dx) > 1 || Math.abs(dy) > 1) {
          el.animate([{ transform: `translate(${dx}px, ${dy}px)` }, { transform: "translate(0, 0)" }], { duration: 260, easing: "cubic-bezier(0.22, 1, 0.36, 1)" });
        }
      }
    });
    rects.current = now;
  });

  const shown = useMemo(() => {
    if (!drag?.moved || !over) return lists;
    const out = {};
    for (const { tag } of LANES) out[tag] = lists[tag].filter((id) => id !== drag.id);
    out[over.lane] = [...out[over.lane]];
    out[over.lane].splice(Math.min(over.index, out[over.lane].length), 0, "__gap__");
    return out;
  }, [lists, drag, over]);

  const dragCard = drag ? byId.get(drag.id) : null;

  if (voted === 0) {
    return (
      <div className={`${styles.stepBody} ${styles.stepPad}`}>
        <div className={styles.narrow}>
          <p className={styles.lead}>Your sort appears here once you have voted.</p>
          <button type="button" className={styles.action} onClick={() => startVoting("unvoted")}>Start voting</button>
        </div>
      </div>
    );
  }

  return (
    <div className={styles.stepBody}>
      <div className={styles.toolbar}>
        {voted < total && <button type="button" className={styles.action} onClick={() => startVoting("unvoted")}>Keep voting ({total - voted} left)</button>}
        {counts.maybe > 0 && <button type="button" className={styles.quiet} onClick={() => startVoting("maybe")}>Vote again on the maybes ({counts.maybe})</button>}
        {counts.undecided > 0 && <button type="button" className={styles.quiet} onClick={() => startVoting("undecided")}>Decide the undecided ({counts.undecided})</button>}
        <span className={styles.toolbarNote}>
          {others.length === 0
            ? "Invite a collaborator from the sidebar to compare. "
            : others.map((p) => `${p.name}: ${p.done ? "finished" : `${p.voted} of ${total}`}`).join(" · ") + ". "}
        </span>
        {reveal
          ? <button type="button" className={styles.action} onClick={() => go("compare")}>Compare</button>
          : counts.keep > 0 && <button type="button" className={styles.quiet} onClick={bringKeeps}>Bring your {counts.keep} keeps to Group</button>}
      </div>

      <div className={styles.lanes} onPointerMove={onMove} onPointerUp={onUp} onPointerCancel={() => { setDrag(null); setOver(null); }}>
        {LANES.map(({ tag, label }) => (
          <section
            key={tag}
            ref={(el) => { laneRefs.current[tag] = el; }}
            className={`${styles.laneCol} ${styles[`laneCol_${tag}`]} ${over?.lane === tag && drag?.moved ? styles.laneOver : ""}`}
            aria-label={`${label}, ${lists[tag].length}`}
          >
            <header className={styles.laneColHead}>
              <h2 className={styles.laneColName}>{label}</h2>
              <span className={styles.laneColCount}>{lists[tag].length}</span>
            </header>
            <div className={styles.laneGrid}>
              {shown[tag].length === 0 && <p className={styles.laneEmpty}>Drop a card here to vote {label.toLowerCase()}.</p>}
              {shown[tag].map((id) => {
                if (id === "__gap__") return <div key="gap" className={styles.gap} style={{ height: drag?.h || 120 }} aria-hidden="true" />;
                const c = byId.get(id);
                if (!c) return null;
                const isOpen = open === id;
                return (
                  <div
                    key={id}
                    data-sort-id={id}
                    className={`${styles.sortCard} ${drag?.id === id && drag.moved ? styles.sortCardLifted : ""} ${isOpen ? styles.sortCardOpen : ""}`}
                    role="button"
                    tabIndex={0}
                    aria-label={`${c.alt || "Reference"}, ${label}. Click to change your vote.`}
                    onPointerDown={(e) => onDown(e, id, tag)}
                    onKeyDown={(e) => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); setOpen(isOpen ? null : id); } }}
                  >
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src={c.src} alt={c.alt} draggable={false} loading="lazy" />
                    {votes[id]?.why && !isOpen && <p className={styles.sortWhy}>{votes[id].why}</p>}
                    {isOpen && (
                      <div className={styles.chooser} data-ui>
                        {CHOICES.map((ch) => (
                          <button key={ch.tag} type="button" className={`${styles.chooseBtn} ${votes[id]?.tag === ch.tag ? styles.chooseBtnOn : ""}`} onClick={() => { setVote(id, ch.tag, undefined, { via: "chooser" }); setOpen(null); }}>{ch.label}</button>
                        ))}
                        <textarea className={styles.chooseWhy} rows={2} placeholder="Why? (optional)" defaultValue={votes[id]?.why || ""} aria-label="Why" onBlur={(e) => setWhy(id, e.target.value)} />
                        <button type="button" className={styles.link} onClick={() => setOpen(null)}>Close</button>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </section>
        ))}
      </div>

      {drag?.moved && dragCard && (
        <div className={styles.ghost} style={{ left: drag.x, top: drag.y, width: drag.w }} aria-hidden="true">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={dragCard.src} alt="" />
        </div>
      )}
    </div>
  );
}
