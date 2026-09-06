"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import styles from "./studio.module.css";
import useEventLog from "./useEventLog";
import { STEPS, statusOf, suggestedStep } from "../../../lib/studio/steps";
import { BOARD2_ROW, cardSize, scatter, pileBox, groupBox } from "../../../lib/studio/geometry";
import { gridPlace } from "../../../lib/studio/grouping";
import NotesTray from "./NotesTray";
import Thread from "./Thread";
import Look from "./steps/Look";
import Words from "./steps/Words";
import Vote from "./steps/Vote";
import Sort from "./steps/Sort";
import Compare from "./steps/Compare";
import Colors from "./steps/Colors";
import Group from "./steps/Group";

/**
 * The studio: one process, one step per screen, one canvas underneath.
 *
 * Three laws this file keeps:
 *   · nothing is auto-promoted. Voting is your hand; bringing cards to the
 *     Group board is your hand.
 *   · your votes are yours until the reveal. The server enforces it; this
 *     file never asks for what it may not see.
 *   · every state change is logged once, from outside a setState updater.
 */

const TAGS = ["keep", "maybe", "no", "undecided"];
const CANVAS_STEPS = new Set(["look", "group"]);

export default function Studio({ token, initial }) {
  const [view, setView] = useState(initial);
  const { board, me } = initial;
  const pool = board.cards;
  const { log } = useEventLog(me.name.toLowerCase());
  const api = `/api/studio/${token}`;

  /* --- material -------------------------------------------------------- */
  const [cards, setCards] = useState(() => {
    const box = pileBox(pool.length);
    const base = pool.map((p, i) => {
      const c = { ...p, kind: "reference" };
      const pos = scatter(c.id, i, pool.length, box, cardSize(c));
      return { ...c, ...pos, board: "pile", pinned: false, revealed: false, z: i + 1 };
    });
    return restore(base, board.state);
  });
  const [groups, setGroups] = useState(() => board.state?.groups || []);
  const [tidied, setTidied] = useState(() => !!board.state?.tidied);
  const [colorsPulled, setColorsPulled] = useState(() => !!board.state?.colorsPulled);
  const [votes, setVotes] = useState(() => initial.votes.mine || {});
  const [words, setWords] = useState(() => initial.words.mine || []);
  const [comments, setComments] = useState(() => initial.comments || {});
  const [wordsSkipped, setWordsSkipped] = useState(false);
  const [selected, setSelected] = useState(null);
  const [notesOpen, setNotesOpen] = useState(false);
  const [addOpen, setAddOpen] = useState(false);
  const [zoomPct, setZoomPct] = useState(100);
  const topZ = useRef(pool.length + 1);
  const canvasRef = useRef(null);

  const cardsRef = useRef(cards);
  const groupsRef = useRef(groups);
  const votesRef = useRef(votes);
  useEffect(() => { cardsRef.current = cards; }, [cards]);
  useEffect(() => { groupsRef.current = groups; }, [groups]);
  useEffect(() => { votesRef.current = votes; }, [votes]);

  /* --- undo ------------------------------------------------------------ */
  const history = useRef([]);
  const snapshot = useCallback(() => {
    history.current.push({ cards: cardsRef.current, groups: groupsRef.current, votes: votesRef.current });
    if (history.current.length > 80) history.current.shift();
  }, []);

  /* --- the step -------------------------------------------------------- */
  const [step, setStepState] = useState(() => suggestedStep(measure(initial, initial.votes.mine || {}, board.state, [], false)));
  useEffect(() => {
    try {
      const saved = window.localStorage.getItem(`inkling-step-${token}`);
      if (saved && STEPS.some((s) => s.key === saved)) setStepState(saved);
      if (window.localStorage.getItem(`inkling-words-skipped-${token}`)) setWordsSkipped(true);
    } catch { /* fine */ }
  }, [token]);
  const go = useCallback((key) => {
    setStepState(key);
    setAddOpen(false);
    log("step", { to: key });
    try { window.localStorage.setItem(`inkling-step-${token}`, key); } catch { /* fine */ }
  }, [log, token]);

  /* --- persistence: shared state -> server ----------------------------- */
  const firstSave = useRef(true);
  useEffect(() => {
    if (firstSave.current) { firstSave.current = false; return; }
    const id = setTimeout(() => {
      const state = {
        cards: cards.filter((c) => c.pinned || c.board !== "pile" || c.kind !== "reference" || c.revealed || c.carried).map(({ id, kind, x, y, rot, board: b, z, pinned, from, carried, hex, text, color, by, revealed }) => {
          const base = { id, x, y, rot, board: b, z, pinned };
          if (kind === "swatch") return { ...base, kind, hex };
          if (kind === "note") return { ...base, kind, text, color, by };
          if (from) return { ...base, kind, from };
          return { ...base, revealed, carried };
        }),
        groups, tidied, colorsPulled,
      };
      fetch(api, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ state }) }).catch(() => {});
    }, 700);
    return () => clearTimeout(id);
  }, [cards, groups, tidied, colorsPulled, api]);

  /* --- persistence: my votes -> server, immediately ------------------- */
  const pushVotes = useCallback((list) => {
    fetch(api, { method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ votes: list }) }).catch(() => {});
  }, [api]);

  const setVote = useCallback((cardId, tag, why, { via = "click", round = 1 } = {}) => {
    const prev = votesRef.current[cardId];
    if (prev?.tag === tag && (why === undefined || why === prev?.why)) return;
    snapshot();
    log("decide", { card: cardId, tag, from: prev?.tag || null, via, round, why: why ? why.length : 0 });
    setVotes((v) => {
      const next = { ...v };
      if (!tag) delete next[cardId];
      else next[cardId] = { tag, why: why === undefined ? (prev?.why || "") : why, round };
      return next;
    });
    pushVotes([{ cardId, tag, why, round }]);
  }, [snapshot, log, pushVotes]);

  const setWhy = useCallback((cardId, why) => {
    const prev = votesRef.current[cardId];
    if (!prev) return;
    setVotes((v) => ({ ...v, [cardId]: { ...v[cardId], why } }));
    pushVotes([{ cardId, tag: prev.tag, why, round: prev.round || 1 }]);
    log("why", { card: cardId, length: why.length });
  }, [pushVotes, log]);

  /* --- the other person: poll ------------------------------------------ */
  useEffect(() => {
    let alive = true;
    const tick = async () => {
      try {
        const r = await fetch(api, { cache: "no-store" });
        if (!r.ok) return;
        const data = await r.json();
        if (!alive) return;
        setView((v) => ({ ...v, people: data.people, revealOpen: data.revealOpen, total: data.total, votes: { ...v.votes, everyone: data.votes.everyone }, words: { ...v.words, everyone: data.words.everyone } }));
        if (data.comments) setComments(data.comments);
      } catch { /* offline for a moment; next tick */ }
    };
    const id = setInterval(tick, 6000);
    return () => { alive = false; clearInterval(id); };
  }, [api]);

  /* --- derived ---------------------------------------------------------- */
  const references = useMemo(() => cards.filter((c) => c.kind === "reference" && !c.from && c.board === "pile"), [cards]);
  const voted = useMemo(() => references.filter((c) => votes[c.id]?.tag).length, [references, votes]);
  const total = references.length;
  const counts = useMemo(() => {
    const c = { keep: 0, maybe: 0, no: 0, undecided: 0, unvoted: 0 };
    references.forEach((r) => { const t = votes[r.id]?.tag; if (t) c[t] += 1; else c.unvoted += 1; });
    return c;
  }, [references, votes]);

  const finishedIds = useMemo(() => view.people.filter((p) => p.done).map((p) => p.id), [view.people]);

  // Where everyone stands once the reveal is open. Cards everyone kept are
  // the set the later steps draw from; "split" is where the conversation is.
  const reveal = useMemo(() => {
    if (!view.revealOpen) return null;
    const out = { bothKeep: [], bothNo: [], split: [] };
    for (const c of references) {
      const by = view.votes.everyone[c.id] || {};
      const tags = finishedIds.map((id) => by[id]?.tag).filter(Boolean);
      if (tags.length < 2) { out.split.push(c); continue; }
      if (tags.every((t) => t === "keep")) out.bothKeep.push(c);
      else if (tags.every((t) => t === "no")) out.bothNo.push(c);
      else out.split.push(c);
    }
    return out;
  }, [view.revealOpen, view.votes.everyone, finishedIds, references]);

  const kept = useMemo(() => (reveal ? reveal.bothKeep : references.filter((c) => votes[c.id]?.tag === "keep")), [reveal, references, votes]);
  const onBoard2 = useMemo(() => cards.filter((c) => c.board === "groups" && c.kind === "reference").length, [cards]);
  const notes = useMemo(() => cards.filter((c) => c.kind === "note"), [cards]);

  const m = { total, voted, myWords: words.length, wordsSkipped, people: view.people, revealOpen: view.revealOpen, colorsPulled, groups: groups.length, namedGroups: groups.filter((g) => g.name?.trim()).length, onBoard2 };

  /* --- voting: one card at a time ---------------------------------------- */
  const [voting, setVoting] = useState(null);
  const startVoting = useCallback((source, fromId = null) => {
    const refs = cardsRef.current.filter((c) => c.kind === "reference" && !c.from && c.board === "pile");
    let queue;
    if (Array.isArray(source)) queue = source;
    else if (source === "unvoted") queue = refs.filter((c) => !votesRef.current[c.id]?.tag).map((c) => c.id);
    else if (source === "all") queue = refs.map((c) => c.id);
    else queue = refs.filter((c) => votesRef.current[c.id]?.tag === source).map((c) => c.id);
    if (fromId) {
      // Start from the card she clicked, then continue with what is unvoted.
      queue = [fromId, ...queue.filter((id) => id !== fromId)];
    }
    if (!queue.length) return;
    const round = Math.max(1, ...Object.values(votesRef.current).map((v) => v.round || 1)) + (source === "unvoted" || source === "all" ? 0 : 1);
    log("round_start", { source: Array.isArray(source) ? "split" : source, size: queue.length, round });
    setVoting({ queue, index: 0, round, source: Array.isArray(source) ? "split" : source });
    go("vote");
  }, [log, go]);

  const decide = useCallback((tag, why) => {
    const v = voting;
    if (!v) return;
    const id = v.queue[v.index];
    setVote(id, tag, why, { via: "round", round: v.round });
    const next = v.index + 1;
    if (next >= v.queue.length) {
      log("round_end", { size: v.queue.length, round: v.round });
      setVoting(null);
      go(v.source === "split" ? "compare" : "sort");
      return;
    }
    setVoting({ ...v, index: next });
  }, [voting, setVote, log, go]);

  const leaveVoting = useCallback(() => {
    if (voting) log("round_leave", { at: voting.index, size: voting.queue.length });
    setVoting(null);
    go(voted > 0 ? "sort" : "look");
  }, [voting, log, go, voted]);

  /* --- notes and colors: add from anywhere ------------------------------- */
  const addNote = useCallback((text = "", color = "yellow", at = null) => {
    const onCanvas = CANVAS_STEPS.has(step);
    const boardKey = step === "group" ? "groups" : "pile";
    const size = cardSize({ kind: "note" }, boardKey);
    let x; let y;
    if (at) { x = at.x; y = at.y; }
    else if (onCanvas && canvasRef.current) { const c = canvasRef.current.center(); x = c.x - size.w / 2; y = c.y - size.h / 2; }
    else { const box = boardKey === "groups" ? groupBox(kept.length).box : pileBox(total); x = box.x + 40 + (notes.length % 5) * 30; y = box.y + 40 + (notes.length % 5) * 30; }
    const id = `note-${Date.now().toString(36)}`;
    snapshot();
    topZ.current += 1;
    const note = { id, kind: "note", text, color, by: me.name, x: Math.round(x), y: Math.round(y), rot: 0, board: boardKey, pinned: true, z: topZ.current };
    log("note_add", { note: id, board: boardKey, color });
    setCards((cs) => [...cs, note]);
    setSelected(id);
    setAddOpen(false);
    if (!onCanvas) setNotesOpen(true);
    setTimeout(() => document.querySelector(`[data-id="${id}"] textarea, [data-tray="${id}"] textarea`)?.focus(), 40);
  }, [step, notes.length, snapshot, log, kept.length, total, me.name]);

  const setNoteText = useCallback((id, text) => setCards((cs) => cs.map((c) => (c.id === id ? { ...c, text } : c))), []);
  const setNoteColor = useCallback((id, color) => { log("note_color", { note: id, color }); setCards((cs) => cs.map((c) => (c.id === id ? { ...c, color } : c))); }, [log]);
  const removeNote = useCallback((id) => { snapshot(); log("note_remove", { note: id }); setCards((cs) => cs.filter((c) => c.id !== id)); }, [snapshot, log]);
  const noteBlur = useCallback((id, text) => log("note_edit", { note: id, text }), [log]);

  const addSwatch = useCallback((hex) => {
    const clean = /^#?[0-9a-f]{6}$/i.test(hex) ? `#${hex.replace("#", "").toLowerCase()}` : null;
    if (!clean) return;
    const boardKey = step === "group" ? "groups" : "pile";
    const box = boardKey === "groups" ? groupBox(kept.length).field : pileBox(total);
    const id = `sw-${clean.slice(1)}-${Date.now().toString(36)}`;
    snapshot();
    topZ.current += 1;
    const size = cardSize({ kind: "swatch" }, boardKey);
    const c = canvasRef.current && CANVAS_STEPS.has(step) ? canvasRef.current.center() : { x: box.x + box.w / 2, y: box.y + box.h / 2 };
    log("swatch_add", { hex: clean, board: boardKey });
    setCards((cs) => [...cs, { id, kind: "swatch", hex: clean, x: Math.round(c.x - size.w / 2), y: Math.round(c.y - size.h / 2), rot: 0, board: boardKey, pinned: true, z: topZ.current }]);
    setAddOpen(false);
  }, [step, snapshot, log, kept.length, total]);

  /* --- bringing the keeps to the Group board (your hand, never automatic) -- */
  const bringKeeps = useCallback(() => {
    const ids = new Set(kept.map((c) => c.id));
    const have = new Set(cardsRef.current.filter((c) => c.from).map((c) => c.from));
    const fresh = kept.filter((c) => !have.has(c.id));
    if (!fresh.length) { go("group"); return; }
    snapshot();
    log("bring_keeps", { count: fresh.length, of: ids.size, via: reveal ? "both" : "mine" });
    setCards((cs) => {
      const existing = cs.filter((c) => c.board === "groups" && c.kind === "reference").length;
      const copies = fresh.map((c, i) => {
        topZ.current += 1;
        const pos = gridPlace(existing + i, groupBox(ids.size).field, cardSize(c, "groups"), 12, BOARD2_ROW);
        return { ...c, id: `${c.id}~c`, from: c.id, carried: false, ...pos, board: "groups", pinned: true, z: topZ.current };
      });
      const marked = cs.map((c) => (ids.has(c.id) ? { ...c, carried: true } : c));
      return [...marked, ...copies];
    });
    go("group");
  }, [kept, reveal, snapshot, log, go]);

  /* --- undo, keyboard --------------------------------------------------- */
  const undo = useCallback(() => {
    const prev = history.current.pop();
    if (!prev) return;
    log("undo", { depth: history.current.length });
    setCards(prev.cards);
    setGroups(prev.groups);
    if (prev.votes !== votesRef.current) {
      const changed = Object.keys({ ...prev.votes, ...votesRef.current }).filter((id) => prev.votes[id]?.tag !== votesRef.current[id]?.tag);
      setVotes(prev.votes);
      if (changed.length) pushVotes(changed.map((id) => ({ cardId: id, tag: prev.votes[id]?.tag || null, why: prev.votes[id]?.why, round: prev.votes[id]?.round || 1 })));
    }
  }, [log, pushVotes]);

  useEffect(() => {
    const typing = (e) => /^(INPUT|TEXTAREA)$/.test(e.target?.tagName || "");
    const onKey = (e) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "z" && !e.shiftKey && !typing(e)) { e.preventDefault(); undo(); return; }
      if (e.key === "n" && !e.metaKey && !e.ctrlKey && !e.altKey && !typing(e) && step !== "vote") { e.preventDefault(); addNote(); }
      if (e.key === "Escape") setAddOpen(false);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [undo, addNote, step]);

  /* --- words (first words, private until Compare) ------------------------ */
  const addWord = useCallback(async (text, color) => {
    const r = await fetch(api, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ word: { kind: "first", text, color } }) });
    if (!r.ok) return null;
    const { word } = await r.json();
    log("word_add", { length: text.length });
    setWords((w) => [...w, word]);
    // The first word you write is also what opens the others' words to you.
    fetch(api, { cache: "no-store" }).then((x) => (x.ok ? x.json() : null)).then((d) => { if (d) setView((v) => ({ ...v, words: { ...v.words, everyone: d.words.everyone } })); }).catch(() => {});
    return word;
  }, [api, log]);
  const updateWord = useCallback((id, text, color) => {
    setWords((w) => w.map((x) => (x.id === id ? { ...x, text, color } : x)));
    fetch(api, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ updateWord: { id, text, color } }) }).catch(() => {});
  }, [api]);
  const deleteWord = useCallback((id) => {
    setWords((w) => w.filter((x) => x.id !== id));
    log("word_remove", {});
    fetch(api, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ deleteWord: id }) }).catch(() => {});
  }, [api, log]);
  const skipWords = useCallback(() => {
    setWordsSkipped(true);
    log("words_skip", {});
    try { window.localStorage.setItem(`inkling-words-skipped-${token}`, "1"); } catch { /* fine */ }
    go("look");
  }, [log, go, token]);

  /* --- comments on cards: said to the others, visible at once ------------ */
  const addComment = useCallback(async (cardId, text) => {
    const r = await fetch(api, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ comment: { cardId, text } }) });
    if (!r.ok) return;
    const { comment } = await r.json();
    log("comment_add", { card: cardId, length: text.length });
    setComments((c) => ({ ...c, [cardId]: [...(c[cardId] || []), comment] }));
  }, [api, log]);
  const deleteComment = useCallback((id, cardId) => {
    setComments((c) => ({ ...c, [cardId]: (c[cardId] || []).filter((x) => x.id !== id) }));
    log("comment_remove", { card: cardId });
    fetch(api, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ deleteComment: id }) }).catch(() => {});
  }, [api, log]);

  /* --- paging between steps: Back and Next, and a scroll past the edge ---- */
  const stepIdx = STEPS.findIndex((s) => s.key === step);
  const prevStep = stepIdx > 0 ? STEPS[stepIdx - 1] : null;
  const nextStep = stepIdx < STEPS.length - 1 && STEPS[stepIdx + 1].key !== "brief" ? STEPS[stepIdx + 1] : null;
  const mainRef = useRef(null);
  const edge = useRef({ sum: 0, at: 0, until: 0 });
  useEffect(() => {
    const el = mainRef.current;
    if (!el) return;
    const onWheel = (e) => {
      if (e.ctrlKey || e.metaKey || voting) return;
      // A page just turned: let the momentum of that gesture die down first.
      if (Date.now() < edge.current.until) return;
      // The nearest thing that scrolls under the pointer; if it can still move
      // in this direction, the scroll belongs to it.
      let node = e.target;
      let scroller = null;
      while (node && node !== el) {
        if (node.scrollHeight > node.clientHeight + 1 && /(auto|scroll)/.test(getComputedStyle(node).overflowY)) { scroller = node; break; }
        node = node.parentElement;
      }
      const down = e.deltaY > 0;
      if (scroller) {
        const atEnd = down ? scroller.scrollTop + scroller.clientHeight >= scroller.scrollHeight - 2 : scroller.scrollTop <= 1;
        if (!atEnd) { edge.current = { ...edge.current, sum: 0, at: 0 }; return; }
      }
      const now = Date.now();
      if (now - edge.current.at > 700 || Math.sign(edge.current.sum) !== Math.sign(e.deltaY)) edge.current.sum = 0;
      edge.current = { ...edge.current, sum: edge.current.sum + e.deltaY, at: now };
      if (Math.abs(edge.current.sum) > 900) {
        edge.current = { sum: 0, at: 0, until: now + 1200 };
        const to = down ? nextStep : prevStep;
        if (to) { log("step_scroll", { to: to.key }); go(to.key); }
      }
    };
    el.addEventListener("wheel", onWheel, { passive: true });
    return () => el.removeEventListener("wheel", onWheel);
  }, [voting, nextStep, prevStep, go, log]);

  /* --- render ----------------------------------------------------------- */
  const onCanvasStep = CANVAS_STEPS.has(step);
  const stepInfo = STEPS.find((s) => s.key === step);
  const common = { cards, setCards, votes, setVote, setWhy, log, snapshot, selected, setSelected, topZ, canvasRef, addNote, setNoteText, setNoteColor, removeNote, noteBlur, go, me, people: view.people, reveal, kept, references, counts, total, voted, startVoting, bringKeeps, comments, addComment, deleteComment };

  return (
    <div className={styles.shell}>
      <header className={styles.top}>
        <a className={styles.wordmark} href="/studio">inkling<span className={styles.period}>.</span></a>
        <span className={styles.boardName}>{board.name}</span>
        <span className={styles.topSpacer} />
        {onCanvasStep && (
          <div className={styles.zoomer} role="group" aria-label="Zoom">
            <button type="button" className={styles.iconBtn} onClick={() => canvasRef.current?.zoomBy(1 / 1.25)} aria-label="Zoom out">−</button>
            <span className={styles.zoomPct} aria-live="polite">{zoomPct}%</span>
            <button type="button" className={styles.iconBtn} onClick={() => canvasRef.current?.zoomBy(1.25)} aria-label="Zoom in">+</button>
            <button type="button" className={styles.quiet} onClick={() => canvasRef.current?.fit(step === "group" ? groupBox(Math.max(onBoard2, kept.length)).box : pileBox(total))}>Fit to screen</button>
          </div>
        )}
        <div className={styles.addWrap}>
          <button type="button" className={styles.action} aria-expanded={addOpen} aria-haspopup="menu" onClick={() => setAddOpen((v) => !v)}>+ Add</button>
          {addOpen && (
            <div className={styles.menu} role="menu">
              <button type="button" role="menuitem" className={styles.menuItem} onClick={() => addNote()}>
                <strong>Note</strong><span>A sticky note. Press N anywhere.</span>
              </button>
              <form className={styles.menuForm} onSubmit={(e) => { e.preventDefault(); addSwatch(new FormData(e.currentTarget).get("hex")); }}>
                <strong>Color</strong>
                <span className={styles.menuRow}>
                  <input name="hex" className={styles.menuInput} placeholder="#a8ae86" aria-label="Hex color" pattern="#?[0-9a-fA-F]{6}" required />
                  <button type="submit" className={styles.quiet}>Add color card</button>
                </span>
              </form>
            </div>
          )}
        </div>
        <button type="button" className={styles.quiet} onClick={undo} title="Undo (⌘Z)">Undo</button>
        <button type="button" className={`${styles.quiet} ${notesOpen ? styles.quietOn : ""}`} aria-pressed={notesOpen} onClick={() => setNotesOpen((v) => !v)}>
          Notes{notes.length ? ` (${notes.length})` : ""}
        </button>
      </header>

      <div className={styles.body}>
        <nav className={styles.side} aria-label="Steps">
          <ol className={styles.steps}>
            {STEPS.map((s) => {
              const st = statusOf(s.key, m);
              const now = s.key === step;
              return (
                <li key={s.key}>
                  <button
                    type="button"
                    className={`${styles.step} ${now ? styles.stepNow : ""} ${styles[`st_${st.state}`]}`}
                    aria-current={now ? "step" : undefined}
                    disabled={st.state === "later"}
                    onClick={() => go(s.key)}
                  >
                    <span className={styles.stepN}>{st.state === "done" ? "✓" : s.n}</span>
                    <span className={styles.stepText}>
                      <span className={styles.stepTitle}>{s.title}</span>
                      <span className={styles.stepStatus}>{st.text}</span>
                    </span>
                  </button>
                </li>
              );
            })}
          </ol>

          <Collaborators people={view.people} me={me} total={total} voted={voted} api={api} log={log} setView={setView} />
        </nav>

        <main className={styles.main} aria-labelledby="step-title" ref={mainRef}>
          <div className={styles.stepHead}>
            <p className={styles.stepKicker}>Step {stepInfo.n} of {STEPS.length}</p>
            <h1 id="step-title" className={styles.stepH}>{stepInfo.title}</h1>
            <p className={styles.stepLine}>{stepInfo.line}</p>
          </div>

          {step === "look" && <Look {...common} tidied={tidied} setTidied={setTidied} boardName={board.name} onZoom={(z) => setZoomPct(Math.round(z * 100))} />}
          {step === "words" && <Words words={words} allWords={view.words.everyone} people={view.people} total={total} addWord={addWord} updateWord={updateWord} deleteWord={deleteWord} skip={skipWords} next={() => go("look")} />}
          {step === "vote" && <Vote {...common} voting={voting} decide={decide} leave={leaveVoting} />}
          {step === "sort" && <Sort {...common} />}
          {step === "compare" && <Compare {...common} everyone={view.votes.everyone} allWords={view.words.everyone} revealOpen={view.revealOpen} />}
          {step === "colors" && <Colors {...common} colorsPulled={colorsPulled} setColorsPulled={setColorsPulled} />}
          {step === "group" && <Group {...common} groups={groups} setGroups={setGroups} onZoom={(z) => setZoomPct(Math.round(z * 100))} />}

          {!voting && (
            <nav className={styles.pager} aria-label="Previous and next step">
              {prevStep ? <button type="button" className={styles.pagerBtn} onClick={() => go(prevStep.key)}>← Back: {prevStep.title}</button> : <span />}
              <span className={styles.pagerHint}>Scroll past the edge to move between steps</span>
              {nextStep ? <button type="button" className={`${styles.pagerBtn} ${styles.pagerNext}`} onClick={() => go(nextStep.key)}>Next: {nextStep.title} →</button> : <span />}
            </nav>
          )}
        </main>

        {notesOpen && (
          <NotesTray
            notes={notes}
            onAdd={() => addNote()}
            onChange={setNoteText}
            onColor={setNoteColor}
            onRemove={removeNote}
            onBlur={noteBlur}
            onClose={() => setNotesOpen(false)}
            onJump={(n) => { go(n.board === "groups" ? "group" : "look"); setSelected(n.id); setTimeout(() => canvasRef.current?.fit({ x: n.x - 300, y: n.y - 200, w: 750, h: 500 }), 60); }}
          />
        )}
      </div>
    </div>
  );
}

/* ---- helpers --------------------------------------------------------------- */

function restore(base, state) {
  if (!state?.cards?.length) return base;
  const byId = new Map(state.cards.map((c) => [c.id, c]));
  const merged = base.map((c) => (byId.has(c.id) ? { ...c, ...byId.get(c.id) } : c));
  const extra = state.cards
    .filter((c) => !merged.some((m) => m.id === c.id))
    .map((c) => {
      if (c.from) { const b = merged.find((x) => x.id === c.from); return b ? { ...b, ...c, carried: false } : null; }
      return c.kind === "swatch" || c.kind === "note" ? c : null;
    })
    .filter(Boolean);
  return [...merged, ...extra];
}

function measure(view, votes, state, words, skipped) {
  const total = view.board.cards.length;
  const voted = view.board.cards.filter((c) => votes[c.id]?.tag).length;
  const groups = state?.groups || [];
  return {
    total, voted, myWords: (view.words?.mine || words).length, wordsSkipped: skipped, people: view.people, revealOpen: view.revealOpen,
    colorsPulled: !!state?.colorsPulled, groups: groups.length, namedGroups: groups.filter((g) => g.name?.trim()).length,
    onBoard2: (state?.cards || []).filter((c) => c.from).length,
  };
}

export { TAGS };

/* ---- collaborators: the owner names them and hands each a link ------------- */
function Collaborators({ people, me, total, voted, api, log, setView }) {
  const [adding, setAdding] = useState(false);
  const [copied, setCopied] = useState(null);
  const [error, setError] = useState(null);
  const others = people.filter((p) => !p.me);
  const owner = me.role === "owner";
  const origin = typeof window !== "undefined" ? window.location.origin : "";

  const post = (body) => fetch(api, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });

  const add = async (e) => {
    e.preventDefault();
    const name = new FormData(e.currentTarget).get("name")?.toString().trim();
    if (!name) return;
    const r = await post({ invite: { name } });
    const d = await r.json();
    if (!r.ok) { setError(d.error || "Could not add"); return; }
    log("collaborator_add", {});
    setView((v) => ({ ...v, people: [...v.people, { id: d.member.id, name: d.member.name, role: "member", me: false, voted: 0, done: false, token: d.member.token }] }));
    setAdding(false);
    setError(null);
  };

  const rename = (p, name) => {
    if (!name || name === p.name) return;
    setView((v) => ({ ...v, people: v.people.map((x) => (x.id === p.id ? { ...x, name } : x)) }));
    post(p.me ? { rename: name } : { renameMember: { id: p.id, name } }).catch(() => {});
    log("collaborator_rename", { self: p.me });
  };

  const remove = (p) => {
    if (!window.confirm(`Remove ${p.name}? Their link stops working and their votes are gone.`)) return;
    setView((v) => ({ ...v, people: v.people.filter((x) => x.id !== p.id) }));
    post({ removeMember: p.id }).catch(() => {});
    log("collaborator_remove", {});
  };

  const copy = async (p) => {
    try { await navigator.clipboard.writeText(`${origin}/s/${p.token}`); setCopied(p.id); setTimeout(() => setCopied(null), 1800); log("invite_copy", {}); } catch { /* the field is selectable */ }
  };

  return (
    <div className={styles.people}>
      <h2 className={styles.sideH}>Collaborators</h2>
      <ul className={styles.peopleList}>
        {people.map((p) => (
          <li key={p.id} className={styles.person}>
            {(p.me || owner) ? (
              <input
                className={styles.personEdit}
                defaultValue={p.name}
                aria-label={p.me ? "Your name" : `${p.name}’s name`}
                title="Click to change the name"
                maxLength={60}
                onBlur={(e) => { const name = e.target.value.trim(); if (!name) { e.target.value = p.name; return; } rename(p, name); }}
                onKeyDown={(e) => { if (e.key === "Enter") e.currentTarget.blur(); }}
              />
            ) : (
              <span className={styles.personName}>{p.name}</span>
            )}
            <span className={styles.personState}>{p.me ? "you · " : ""}{total ? `${p.me ? voted : p.voted} of ${total} voted` : "no cards yet"}</span>
            {owner && !p.me && p.token && (
              <div className={styles.personLink}>
                <input className={styles.inviteField} readOnly value={`${origin}/s/${p.token}`} aria-label={`${p.name}’s link`} onFocus={(e) => e.target.select()} />
                <div className={styles.row}>
                  <button type="button" className={styles.quietSmall} onClick={() => copy(p)}>{copied === p.id ? "Copied" : "Copy link"}</button>
                  <button type="button" className={styles.trayLink} onClick={() => remove(p)}>Remove</button>
                </div>
              </div>
            )}
          </li>
        ))}
      </ul>
      {owner && (
        adding ? (
          <form className={styles.invite} onSubmit={add}>
            <label className={styles.inviteLabel} htmlFor="collab-name">Their name</label>
            <input id="collab-name" name="name" className={styles.wordInputSmall} placeholder="Joseph" maxLength={60} autoFocus autoComplete="off" />
            <div className={styles.row}>
              <button type="submit" className={styles.action}>Add and make a link</button>
              <button type="button" className={styles.quietSmall} onClick={() => { setAdding(false); setError(null); }}>Cancel</button>
            </div>
            {error && <p className={styles.muted}>{error}</p>}
          </form>
        ) : (
          <div className={styles.invite}>
            <button type="button" className={styles.quiet} onClick={() => setAdding(true)} disabled={others.length >= 5}>
              {others.length >= 5 ? "Five collaborators is the limit" : "+ Add a collaborator"}
            </button>
            <p className={styles.inviteHint}>Each one gets their own link. No account needed. Votes stay hidden from each other until everyone who started has finished.</p>
          </div>
        )
      )}
    </div>
  );
}
