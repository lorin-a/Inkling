"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import styles from "./studio.module.css";
import {
  PILE, GROUPS, FIELD, CANVAS, LANES, LANE_LABEL, BOARD2_ROW,
  cardSize, scatter, tidy, laneBoxes, placeInLane,
} from "../../lib/studio/geometry";
import {
  GROUP_HEAD, GROUP_MIN, groupField, centerOf, inBox, membersOf,
  gridPlace, looseClusters, hugBox, boundsOf, groupStrip,
} from "../../lib/studio/grouping";

/**
 * Playtest 01 — gather, narrow, carry, name. Questions in STATUS.md.
 *
 * The three laws this file keeps:
 *   · nothing is auto-promoted. Voting is her hand; carrying is her hand.
 *   · the pile is the default and the tidy grid is opt-in, never the reverse.
 *   · every state change is logged once, from outside a setState updater.
 */

const TAGS = ["keep", "maybe", "no"];
const TAG_LABEL = { keep: "Keep", maybe: "Maybe", no: "No" };

const ROUND_QUESTIONS = [
  "Does it still catch your eye?",
  "Does it fit what you’ve named?",
  "Does it make you sing?",
  "Still?",
];

// The step strip: where you are, and what this step is FOR. Derived from actual
// state, never advanced by hand — you are wherever your material says you are.
const STEPS = [
  { n: 1, title: "Gather", caption: "Everything you found, with no judgment yet. Look at all of it before you decide anything." },
  { n: 2, title: "See the color", caption: "Pull the color out of what you gathered, and see what you keep reaching for." },
  { n: 3, title: "Narrow it down", caption: "A round shows you one thing at a time. Keep, maybe, or no — as many rounds as it takes." },
  { n: 4, title: "Say what it’s about", caption: "Move what belongs together near each other, drag a frame around it, and say what it is. And what it is not." },
  { n: 5, title: "The brief", caption: "Not in this build yet — it assembles from what you carried." },
];

/**
 * Naming prompts (playtest Q5).
 *
 * They are questions, never suggested words: the moment a tool proposes the
 * name, the name stops being hers and the spec stops being evidence of her
 * taste. They are also the instrument — if she reaches for these, "sorting
 * produces the language" is weaker than we think and the generative-questions
 * door has to open before the sort, not after it. So every reveal is logged.
 */
const NAME_PROMPTS = [
  "If these were one place, where are you standing?",
  "What do these have that the ones you cut didn’t?",
  "Say it to someone who can’t see the images.",
  "What would this group never do?",
  "What’s the feeling, before the adjective?",
];

/* ---------- event log ---------------------------------------------------- */
function useEventLog() {
  const queue = useRef([]);
  const session = useRef(null);
  const [sessionId, setSessionId] = useState(null);

  useEffect(() => {
    const key = "inkling-playtest-session";
    let s = window.localStorage.getItem(key);
    if (!s) {
      s = `pt01-${new Date().toISOString().slice(0, 10)}-${Math.random().toString(36).slice(2, 6)}`;
      window.localStorage.setItem(key, s);
    }
    session.current = s;
    setSessionId(s);
  }, []);

  const flush = useCallback((useBeacon = false) => {
    if (!queue.current.length || !session.current) return;
    const body = JSON.stringify({ session: session.current, events: queue.current });
    queue.current = [];
    if (useBeacon && navigator.sendBeacon) {
      navigator.sendBeacon("/api/studio/log", new Blob([body], { type: "application/json" }));
    } else {
      fetch("/api/studio/log", { method: "POST", headers: { "Content-Type": "application/json" }, body }).catch(() => {});
    }
  }, []);

  const log = useCallback((type, payload = {}) => {
    queue.current.push({ type, ...payload, at: new Date().toISOString() });
    if (queue.current.length >= 12) flush();
  }, [flush]);

  useEffect(() => {
    const id = setInterval(() => flush(), 4000);
    const bye = () => flush(true);
    window.addEventListener("pagehide", bye);
    return () => { clearInterval(id); window.removeEventListener("pagehide", bye); flush(true); };
  }, [flush]);

  return { log, session: sessionId };
}

/* ---------- component ---------------------------------------------------- */

export default function Studio({ pins, spectrum, chromatic, swatchTotal }) {
  const { log, session } = useEventLog();
  const viewportRef = useRef(null);

  const [cards, setCards] = useState(() =>
    pins.map((p, i) => {
      const base = { id: p.id, kind: "reference", src: p.src, alt: p.alt, palette: p.palette, credit: p.credit };
      const pos = scatter(p.id, i, pins.length, PILE, cardSize(base));
      return { ...base, ...pos, board: "pile", tag: null, revealed: false, pinned: false, z: i + 1 };
    })
  );
  const [groups, setGroups] = useState([]);
  const [colorsPulled, setColorsPulled] = useState(false);
  const [spectrumOpen, setSpectrumOpen] = useState(false);
  const [swatchesMixed, setSwatchesMixed] = useState(false);
  const [tidied, setTidied] = useState(false);
  const [expanded, setExpanded] = useState({ keep: true, maybe: false, no: false, unsorted: true });
  const [round, setRound] = useState(null);
  const [selected, setSelected] = useState(null);
  const [drag, setDrag] = useState(null);
  const [zoom, setZoom] = useState(1);
  const [arriving, setArriving] = useState(false);
  const topZ = useRef(pins.length + 1);

  // Board 2. The lasso is the grouping gesture; naming is what a new group
  // opens into; dismissed remembers the clusters she has already said no to,
  // so an offer she declined never comes back and nags.
  const [lasso, setLasso] = useState(null);
  const [groupDrag, setGroupDrag] = useState(null);
  const [naming, setNaming] = useState(null);
  const [prompts, setPrompts] = useState({});
  const [dismissed, setDismissed] = useState([]);

  // Nothing may log from inside a setState updater: React double-invokes them
  // in development, which would double every number the playtest is read from.
  const cardsRef = useRef(cards);
  const roundRef = useRef(round);
  const groupsRef = useRef(groups);
  useEffect(() => { cardsRef.current = cards; }, [cards]);
  useEffect(() => { roundRef.current = round; }, [round]);
  useEffect(() => { groupsRef.current = groups; }, [groups]);

  const reduced = useRef(false);
  useEffect(() => { reduced.current = window.matchMedia?.("(prefers-reduced-motion: reduce)").matches ?? false; }, []);

  /* --- restore / persist ------------------------------------------------ */
  const restored = useRef(false);
  useEffect(() => {
    try {
      const raw = window.localStorage.getItem("inkling-playtest-01");
      if (!raw) {
        // First arrival: the references come IN rather than being already there.
        setArriving(true);
        setTimeout(() => setArriving(false), 2600);
        return;
      }
      restored.current = true;
      const saved = JSON.parse(raw);
      if (saved?.cards?.length) {
        setCards((cur) => {
          const byId = new Map(saved.cards.map((c) => [c.id, c]));
          const merged = cur.map((c) => (byId.has(c.id) ? { ...c, ...byId.get(c.id) } : c));
          const swatches = saved.cards.filter((c) => c.kind === "swatch" && !merged.some((m) => m.id === c.id));
          return [...merged, ...swatches];
        });
      }
      if (saved?.groups) setGroups(saved.groups);
      if (saved?.colorsPulled) setColorsPulled(true);
      if (saved?.swatchesMixed) setSwatchesMixed(true);
      if (saved?.tidied) setTidied(true);
      if (saved?.expanded) setExpanded(saved.expanded);
    } catch { /* a corrupt draft must never block the session */ }
  }, []);

  useEffect(() => {
    const id = setTimeout(() => {
      try {
        window.localStorage.setItem("inkling-playtest-01", JSON.stringify({
          cards: cards.map(({ id: cid, kind, x, y, rot, board, tag, revealed, hex, z, pinned }) =>
            kind === "swatch"
              ? { id: cid, kind, x, y, rot, board, tag, hex, z, pinned }
              : { id: cid, x, y, rot, board, tag, revealed, z, pinned }),
          groups, colorsPulled, swatchesMixed, tidied, expanded,
        }));
      } catch { /* quota — the session continues, the draft does not */ }
    }, 400);
    return () => clearTimeout(id);
  }, [cards, groups, colorsPulled, swatchesMixed, tidied, expanded]);

  /* --- counts + lanes ---------------------------------------------------- */
  const counts = useMemo(() => {
    const c = { unsorted: 0, keep: 0, maybe: 0, no: 0, carried: 0 };
    cards.forEach((k) => {
      if (k.board === "groups") { c.carried += 1; return; }
      if (k.tag) c[k.tag] += 1; else c.unsorted += 1;
    });
    return c;
  }, [cards]);

  const sorting = counts.keep + counts.maybe + counts.no > 0;
  const boxes = useMemo(() => (sorting ? laneBoxes(counts) : {}), [sorting, counts]);

  /* --- layout ------------------------------------------------------------ */
  // Arranged only on request. Cards the user has moved by hand are never
  // re-placed — the tool arranges what she has not claimed.
  const relayout = useCallback((opts = {}) => {
    const useTidy = opts.tidied ?? tidied;
    const exp = opts.expanded ?? expanded;
    setCards((cs) => {
      const pile = cs.filter((c) => c.board === "pile");
      const anyTag = pile.some((c) => c.tag);
      const localCounts = { unsorted: 0, keep: 0, maybe: 0, no: 0 };
      pile.forEach((c) => { localCounts[c.tag || "unsorted"] += 1; });
      const laneBox = anyTag ? laneBoxes(localCounts) : null;
      const seen = { unsorted: 0, keep: 0, maybe: 0, no: 0 };

      return cs.map((c) => {
        if (c.board !== "pile" || c.pinned) return c;
        const lane = c.tag || "unsorted";
        const i = seen[lane]; seen[lane] += 1;
        if (!anyTag) {
          const size = cardSize(c);
          return { ...c, ...(useTidy ? tidy(i, pile.length, PILE, size) : scatter(c.id, i, pile.length, PILE, size)) };
        }
        const box = laneBox[lane];
        if (!box) return c;
        return { ...c, ...placeInLane(c, lane, i, localCounts[lane], box, lane === "unsorted" ? !useTidy : exp[lane]) };
      });
    });
  }, [tidied, expanded]);

  /* --- pulling the colors out (Q7) --------------------------------------- */
  const pullColors = useCallback(() => {
    log("pull_colors");
    setColorsPulled(true);
    if (reduced.current) {
      setCards((cs) => cs.map((c) => ({ ...c, revealed: true })));
      setSpectrumOpen(true);
      return;
    }
    const ids = cardsRef.current.filter((c) => c.kind === "reference").map((c) => c.id);
    ids.forEach((id, i) => {
      setTimeout(() => setCards((cs) => cs.map((c) => (c.id === id ? { ...c, revealed: true } : c))), i * 9);
    });
    setTimeout(() => setSpectrumOpen(true), ids.length * 9 + 500);
  }, [log]);

  /* --- Q2 instrument: swatches INTO the pile ----------------------------- */
  const mixSwatches = useCallback(() => {
    log("mix_swatches", { count: spectrum.length });
    setSwatchesMixed(true);
    setCards((cs) => {
      const made = spectrum.map((band, i) => {
        const id = `sw-${band.hex.replace("#", "")}`;
        const pos = scatter(id, i * 13, spectrum.length * 13, PILE, { w: 76, h: 94 });
        topZ.current += 1;
        return { id, kind: "swatch", hex: band.hex, ...pos, board: "pile", tag: null, pinned: false, z: topZ.current };
      });
      return [...cs, ...made.filter((m) => !cs.some((c) => c.id === m.id))];
    });
    setTimeout(() => relayout(), 30);
  }, [spectrum, log, relayout]);

  /* --- rounds (Q3, Q4) ---------------------------------------------------- */
  const startRound = useCallback((source) => {
    const pool = cardsRef.current.filter((c) => c.board === "pile" && (source === "all" ? c.tag !== "no" : c.tag === source));
    if (!pool.length) return;
    const n = (roundRef.current?.number || 0) + 1;
    log("round_start", { number: n, source, size: pool.length });
    setRound({ mode: "round", number: n, source, queue: pool.map((c) => c.id), index: 0, question: ROUND_QUESTIONS[Math.min(n - 1, ROUND_QUESTIONS.length - 1)] });
  }, [log]);

  // One card, opened by clicking it — the way a vote gets changed or undone.
  const openVote = useCallback((cardId) => {
    log("vote_open", { card: cardId });
    setRound({ mode: "single", number: 0, queue: [cardId], index: 0, question: "Where does this one go?" });
  }, [log]);

  const closeRound = useCallback((why, r) => {
    log(why, { number: r?.number, at: r?.index, mode: r?.mode });
    setRound(null);
    setTimeout(() => relayout(), 20);
  }, [log, relayout]);

  const decide = useCallback((tag) => {
    const r = roundRef.current;
    if (!r) return;
    const id = r.queue[r.index];
    log("decide", { round: r.number, mode: r.mode, card: id, tag, index: r.index });
    setCards((cs) => cs.map((c) => (c.id === id ? { ...c, tag, pinned: false } : c)));
    const next = r.index + 1;
    if (next >= r.queue.length) {
      log(r.mode === "single" ? "vote_close" : "round_end", { number: r.number, size: r.queue.length });
      setRound(null);
      setTimeout(() => relayout(), 20);
      return;
    }
    setRound({ ...r, index: next });
  }, [log, relayout]);

  /* --- carrying (Q1) ------------------------------------------------------ */
  const toCanvas = useCallback((clientX, clientY) => {
    const vp = viewportRef.current;
    const r = vp.getBoundingClientRect();
    return { x: (clientX - r.left + vp.scrollLeft) / zoom, y: (clientY - r.top + vp.scrollTop) / zoom };
  }, [zoom]);

  const onCardPointerDown = useCallback((e, card) => {
    if (e.button !== 0 || round) return;
    e.stopPropagation();
    e.currentTarget.setPointerCapture(e.pointerId);
    const p = toCanvas(e.clientX, e.clientY);
    topZ.current += 1;
    setCards((cs) => cs.map((c) => (c.id === card.id ? { ...c, z: topZ.current } : c)));
    setSelected(card.id);
    setDrag({ id: card.id, dx: p.x - card.x, dy: p.y - card.y, moved: false, from: card.board, pointer: e.pointerId });
  }, [toCanvas, round]);

  const onCardPointerMove = useCallback((e) => {
    if (!drag || e.pointerId !== drag.pointer) return;
    const p = toCanvas(e.clientX, e.clientY);
    const nx = Math.round(p.x - drag.dx);
    const ny = Math.round(p.y - drag.dy);
    setCards((cs) => cs.map((c) => (c.id === drag.id ? { ...c, x: nx, y: ny } : c)));
    if (!drag.moved) setDrag((d) => (d ? { ...d, moved: true } : d));

    const vp = viewportRef.current;
    const r = vp.getBoundingClientRect();
    const EDGE = 90;
    if (e.clientX > r.right - EDGE) vp.scrollLeft += 18;
    else if (e.clientX < r.left + EDGE) vp.scrollLeft -= 18;
    if (e.clientY > r.bottom - EDGE) vp.scrollTop += 12;
    else if (e.clientY < r.top + EDGE) vp.scrollTop -= 12;
  }, [drag, toCanvas]);

  const onCardPointerUp = useCallback((e) => {
    if (!drag || e.pointerId !== drag.pointer) return;
    const card = cardsRef.current.find((c) => c.id === drag.id);
    setDrag(null);
    if (!card) return;

    // A click that never moved is a request to vote on this one thing.
    if (!drag.moved) { openVote(card.id); return; }

    const size = cardSize(card);
    const cx = card.x + size.w / 2;
    const cy = card.y + size.h / 2;
    const inGroups = cx > GROUPS.x && cx < GROUPS.x + GROUPS.w && cy > GROUPS.y && cy < GROUPS.y + GROUPS.h;
    const board = inGroups ? "groups" : "pile";

    if (board !== drag.from) {
      const landedIn = inGroups ? groups.find((g) => cx > g.x && cx < g.x + g.w && cy > g.y && cy < g.y + g.h) : null;
      log("carry", { card: card.id, kind: card.kind, from: drag.from, to: board, group: landedIn?.id || null, tag: card.tag });
    } else {
      log("move", { card: card.id, board });
    }
    setCards((cs) => cs.map((c) => (c.id === drag.id ? { ...c, board, pinned: true } : c)));
  }, [drag, groups, log, openVote]);

  // Every card voted → one explicit gesture takes the keeps across. Deliberately
  // NOT automatic: auto-promotion is the thing this tool does not do.
  const carryKeeps = useCallback(() => {
    const keeps = cardsRef.current.filter((c) => c.board === "pile" && c.tag === "keep");
    if (!keeps.length) return;
    log("carry_keeps", { count: keeps.length });
    // They land in a legible grid, not another pile. Board 1's mess is an
    // invitation to rummage; board 2 asks her to see a pattern, and sixty
    // overlapping cards hide one.
    setCards((cs) => {
      let i = 0;
      return cs.map((c) => {
        if (c.board !== "pile" || c.tag !== "keep") return c;
        const pos = gridPlace(i, FIELD, cardSize(c, "groups"), 12, BOARD2_ROW);
        i += 1;
        return { ...c, ...pos, board: "groups", pinned: false };
      });
    });
    setTimeout(() => fitTo({ x: GROUPS.x, y: GROUPS.y, w: GROUPS.w, h: GROUPS.h }, "groups"), 40);
  }, [log]); // eslint-disable-line react-hooks/exhaustive-deps

  /* --- groups + naming (Q5) ---------------------------------------------- */
  /**
   * This is the conversion event. Everything on this board exists so that a
   * pile turns into a sentence she would defend — which is the one thing the
   * playtest cannot fake and the whole thesis rests on.
   */

  const makeGroup = useCallback((members, via) => {
    if (!members.length) return null;
    const box = hugBox(members.map((c) => {
      const s = cardSize(c, "groups");
      return { x: c.x, y: c.y, w: s.w, h: s.h };
    }));

    // A group that cannot show its own name is not a group. If the frame would
    // hang off the board, the whole cluster shifts back on — cards and all, so
    // that nothing she just circled quietly falls out of it.
    const M = 12;
    const dx = Math.round(Math.min(0, GROUPS.x + GROUPS.w - M - (box.x + box.w)) + Math.max(0, GROUPS.x + M - box.x));
    const dy = Math.round(Math.min(0, GROUPS.y + GROUPS.h - M - (box.y + box.h)) + Math.max(0, GROUPS.y + M - box.y));
    if (dx || dy) {
      const ids = new Set(members.map((m) => m.id));
      setCards((cs) => cs.map((c) => (ids.has(c.id) ? { ...c, x: c.x + dx, y: c.y + dy, pinned: true } : c)));
    }

    const g = { id: `g-${Date.now().toString(36)}${Math.round(performance.now())}`, ...box, x: box.x + dx, y: box.y + dy, name: "", notThis: "" };
    log("group_create", { group: g.id, via, members: members.length });
    setGroups((gs) => [...gs, g]);
    setNaming(g.id);
    return g;
  }, [log]);

  // The fallback for anyone who does not discover the drag. Placed under the
  // grid rather than over it, so it never lands on top of her material.
  const addGroup = useCallback(() => {
    const used = groups.length;
    const g = {
      id: `g-${Date.now().toString(36)}`,
      x: FIELD.x + (used % 3) * (GROUP_MIN.w + 40),
      y: FIELD.y + FIELD.h - GROUP_MIN.h - 20 - Math.floor(used / 3) * (GROUP_MIN.h + 30),
      w: GROUP_MIN.w + 80, h: GROUP_MIN.h + 40, name: "", notThis: "",
    };
    log("group_create", { group: g.id, via: "button", members: 0 });
    setGroups((gs) => [...gs, g]);
    setNaming(g.id);
  }, [groups.length, log]);

  // Releasing a group frees its cards; it never deletes material. Lassoing the
  // wrong five things has to be a one-click mistake or she will not lasso.
  const releaseGroup = useCallback((g) => {
    log("group_release", { group: g.id, members: membersOf(g, cardsRef.current, (c) => cardSize(c, "groups")).length });
    setGroups((gs) => gs.filter((x) => x.id !== g.id));
    setNaming((n) => (n === g.id ? null : n));
  }, [log]);

  const onGroupPointerDown = useCallback((e, g, mode) => {
    if (e.button !== 0) return;
    e.stopPropagation();
    e.currentTarget.setPointerCapture(e.pointerId);
    const p = toCanvas(e.clientX, e.clientY);
    const members = membersOf(g, cardsRef.current, (c) => cardSize(c, "groups")).map((c) => ({ id: c.id, x: c.x, y: c.y }));
    setGroupDrag({ id: g.id, mode, pointer: e.pointerId, dx: p.x - g.x, dy: p.y - g.y, x0: g.x, y0: g.y, w0: g.w, h0: g.h, members, moved: false });
  }, [toCanvas]);

  const onGroupPointerMove = useCallback((e) => {
    if (!groupDrag || e.pointerId !== groupDrag.pointer) return;
    const p = toCanvas(e.clientX, e.clientY);
    if (groupDrag.mode === "move") {
      const nx = Math.round(p.x - groupDrag.dx);
      const ny = Math.round(p.y - groupDrag.dy);
      const ddx = nx - groupDrag.x0;
      const ddy = ny - groupDrag.y0;
      setGroups((gs) => gs.map((x) => (x.id === groupDrag.id ? { ...x, x: nx, y: ny } : x)));
      // A group that moved without its cards would be a frame, not a container.
      const by = new Map(groupDrag.members.map((m) => [m.id, m]));
      setCards((cs) => cs.map((c) => (by.has(c.id)
        ? { ...c, x: by.get(c.id).x + ddx, y: by.get(c.id).y + ddy, pinned: true }
        : c)));
    } else {
      const w = Math.max(GROUP_MIN.w, Math.round(groupDrag.w0 + (p.x - groupDrag.dx - groupDrag.x0)));
      const h = Math.max(GROUP_MIN.h, Math.round(groupDrag.h0 + (p.y - groupDrag.dy - groupDrag.y0)));
      setGroups((gs) => gs.map((x) => (x.id === groupDrag.id ? { ...x, w, h } : x)));
    }
    if (!groupDrag.moved) setGroupDrag((d) => (d ? { ...d, moved: true } : d));
  }, [groupDrag, toCanvas]);

  /**
   * A frame that lands on other cards must not quietly absorb them.
   *
   * Membership here is spatial, which is what makes dragging a card into a
   * group work at all — but the same rule means sliding a frame across the
   * board would swallow whatever it crossed, and she would find things in a
   * group she never put there. So the frame behaves like a tray on a table:
   * what it lands on gets nudged out, visibly, below it.
   */
  const displaceIntruders = useCallback((g, keepIds) => {
    const inside = membersOf(g, cardsRef.current, (c) => cardSize(c, "groups"));
    const out = inside.filter((c) => !keepIds.has(c.id));
    if (!out.length) return;
    // Straight out along the short axis, keeping each card's column. Re-gridding
    // them somewhere tidy would move them further than the shove requires, and
    // she would lose track of where the thing she was looking at went.
    const field = groupField(g);
    const below = field.y + field.h + 14;
    const fits = below + 130 < GROUPS.y + GROUPS.h;
    const ids = new Set(out.map((c) => c.id));
    log("group_displace", { group: g.id, count: out.length });
    setCards((cs) => cs.map((c) => (ids.has(c.id)
      ? { ...c, y: fits ? below : Math.max(GROUPS.y + 16, g.y - cardSize(c, "groups").h - 14), pinned: true }
      : c)));
  }, [log]);

  const onGroupPointerUp = useCallback((e) => {
    if (!groupDrag || e.pointerId !== groupDrag.pointer) return;
    const g = groupsRef.current.find((x) => x.id === groupDrag.id);
    if (groupDrag.moved && g) {
      displaceIntruders(g, new Set(groupDrag.members.map((m) => m.id)));
      log(groupDrag.mode === "move" ? "group_move" : "group_resize", {
        group: g.id,
        members: groupDrag.members.length,
      });
    }
    setGroupDrag(null);
  }, [groupDrag, log, displaceIntruders]);

  /* --- zoom / pan --------------------------------------------------------- */
  const zoomTo = useCallback((next, ax0, ay0) => {
    const vp = viewportRef.current;
    if (!vp) return;
    const r = vp.getBoundingClientRect();
    const ax = ax0 == null ? r.width / 2 : ax0 - r.left;
    const ay = ay0 == null ? r.height / 2 : ay0 - r.top;
    const clamped = Math.min(1.6, Math.max(0.24, next));
    setZoom((prev) => {
      if (clamped === prev) return prev;
      const cx = (vp.scrollLeft + ax) / prev;
      const cy = (vp.scrollTop + ay) / prev;
      requestAnimationFrame(() => { vp.scrollLeft = cx * clamped - ax; vp.scrollTop = cy * clamped - ay; });
      return clamped;
    });
  }, []);

  // Remembered so the framing survives anything that changes the viewport —
  // opening the spectrum used to silently crop the bottom of the pile.
  const lastFrame = useRef(null);

  const fitTo = useCallback((box, label) => {
    const vp = viewportRef.current;
    if (!vp) return;
    const pad = 44;
    const next = Math.min(1.6, Math.max(0.24, Math.min((vp.clientWidth - pad * 2) / box.w, (vp.clientHeight - pad * 2) / box.h)));
    setZoom(next);
    requestAnimationFrame(() => {
      vp.scrollLeft = box.x * next - (vp.clientWidth - box.w * next) / 2;
      vp.scrollTop = box.y * next - (vp.clientHeight - box.h * next) / 2;
    });
    lastFrame.current = { box, label };
    if (label) log("zoom_fit", { to: label, zoom: Math.round(next * 100) / 100 });
  }, [log]);

  // Re-frame when the chrome above the canvas grows or shrinks.
  useEffect(() => {
    if (!lastFrame.current) return;
    const id = setTimeout(() => fitTo(lastFrame.current.box, null), 60);
    return () => clearTimeout(id);
  }, [spectrumOpen, fitTo]);

  useEffect(() => {
    const onResize = () => { if (lastFrame.current) fitTo(lastFrame.current.box, null); };
    window.addEventListener("resize", onResize);
    return () => window.removeEventListener("resize", onResize);
  }, [fitTo]);

  const framed = useRef(false);
  useEffect(() => {
    if (framed.current || !viewportRef.current) return;
    framed.current = true;
    fitTo(PILE, "pile");
  }, [fitTo]);

  useEffect(() => {
    const vp = viewportRef.current;
    if (!vp) return;
    const onWheel = (e) => {
      if (!e.ctrlKey && !e.metaKey) return;
      e.preventDefault();
      zoomTo(zoom * (1 - e.deltaY * 0.0016), e.clientX, e.clientY);
    };
    vp.addEventListener("wheel", onWheel, { passive: false });
    return () => vp.removeEventListener("wheel", onWheel);
  }, [zoom, zoomTo]);

  /* --- lasso: the grouping gesture (Q5) ---------------------------------- */
  // Board 2's primary verb is "draw a frame around these", so on board 2 a
  // plain drag draws rather than pans. Panning is still there under Alt, and
  // everywhere outside the boards it is unchanged.
  const [panning, setPanning] = useState(null);

  const commitLasso = useCallback((box) => {
    setLasso(null);
    if (!box) return;
    const rect = {
      x: Math.min(box.x0, box.x1), y: Math.min(box.y0, box.y1),
      w: Math.abs(box.x1 - box.x0), h: Math.abs(box.y1 - box.y0),
    };
    // A twitch is a click on the board, not an attempt to draw.
    if (rect.w < 26 && rect.h < 26) return;
    const inside = cardsRef.current.filter((c) => c.board === "groups" && inBox(centerOf(c, cardSize(c, "groups")), rect));
    if (!inside.length) { log("lasso_empty", {}); return; }
    makeGroup(inside, "lasso");
  }, [log, makeGroup]);

  const onCanvasPointerDown = useCallback((e) => {
    if (e.button !== 0 || e.target.closest("[data-card],[data-group],[data-lane],input,textarea,button")) return;
    setSelected(null);
    const vp = viewportRef.current;
    e.currentTarget.setPointerCapture(e.pointerId);
    const p = toCanvas(e.clientX, e.clientY);
    if (!e.altKey && inBox(p, GROUPS)) {
      setLasso({ x0: p.x, y0: p.y, x1: p.x, y1: p.y, pointer: e.pointerId });
      return;
    }
    setPanning({ x: e.clientX, y: e.clientY, left: vp.scrollLeft, top: vp.scrollTop, pointer: e.pointerId });
  }, [toCanvas]);

  const onCanvasPointerMove = useCallback((e) => {
    if (lasso && e.pointerId === lasso.pointer) {
      const p = toCanvas(e.clientX, e.clientY);
      setLasso((l) => (l ? { ...l, x1: p.x, y1: p.y } : l));
      return;
    }
    if (!panning || e.pointerId !== panning.pointer) return;
    const vp = viewportRef.current;
    vp.scrollLeft = panning.left - (e.clientX - panning.x);
    vp.scrollTop = panning.top - (e.clientY - panning.y);
  }, [panning, lasso, toCanvas]);

  const onCanvasPointerUp = useCallback(() => {
    setPanning(null);
    if (lasso) commitLasso(lasso);
  }, [lasso, commitLasso]);

  /* --- keyboard ----------------------------------------------------------- */
  useEffect(() => {
    if (!round) return;
    const onKey = (e) => {
      const i = ["1", "2", "3"].indexOf(e.key);
      if (i >= 0) { e.preventDefault(); decide(TAGS[i]); }
      if (e.key === "0" && round.mode === "single") { e.preventDefault(); decide(null); }
      if (e.key === "Escape") closeRound(round.mode === "single" ? "vote_close" : "round_abandon", round);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [round, decide, closeRound]);

  /* --- board 2 derived ---------------------------------------------------- */
  const b2 = useCallback((c) => cardSize(c, "groups"), []);

  // Put the leftovers back in order without touching what she has framed.
  const tidyCarried = useCallback(() => {
    const fields = groups.map(groupField);
    const loose = cardsRef.current.filter((c) => c.board === "groups" && !fields.some((f) => inBox(centerOf(c, b2(c)), f)));
    if (!loose.length) return;
    log("tidy_carried", { count: loose.length });
    const order = new Map(loose.map((c, i) => [c.id, i]));
    setCards((cs) => cs.map((c) => (order.has(c.id)
      ? { ...c, ...gridPlace(order.get(c.id), FIELD, b2(c), 12, BOARD2_ROW), pinned: false }
      : c)));
  }, [groups, b2, log]);

  // What her hands have already clustered, offered back to her as a frame she
  // can draw with one click. Held back mid-gesture so nothing flickers under
  // the cursor, and never re-offered once declined.
  const clusters = useMemo(() => {
    if (counts.carried < 3 || drag || groupDrag || lasso) return [];
    return looseClusters(cards, groups, b2)
      .map((rects) => ({ key: rects.map((r) => r.id).sort().join("|"), rects }))
      .filter((c) => !dismissed.includes(c.key))
      .slice(0, 2);
  }, [cards, groups, counts.carried, drag, groupDrag, lasso, dismissed, b2]);

  const acceptCluster = useCallback((c) => {
    const ids = new Set(c.rects.map((r) => r.id));
    const members = cardsRef.current.filter((k) => ids.has(k.id));
    log("cluster_accept", { members: members.length });
    makeGroup(members, "cluster");
  }, [log, makeGroup]);

  const moveGroupBy = useCallback((g, dx, dy) => {
    const members = membersOf(g, cardsRef.current, b2);
    const ids = new Set(members.map((m) => m.id));
    setGroups((gs) => gs.map((x) => (x.id === g.id ? { ...x, x: x.x + dx, y: x.y + dy } : x)));
    setCards((cs) => cs.map((c) => (ids.has(c.id) ? { ...c, x: c.x + dx, y: c.y + dy, pinned: true } : c)));
  }, [b2]);

  const cyclePrompt = useCallback((gid) => {
    setPrompts((p) => {
      const next = p[gid] == null ? 0 : p[gid] + 1;
      return { ...p, [gid]: next };
    });
    const shown = prompts[gid] == null ? 0 : prompts[gid] + 1;
    log("name_prompt", { group: gid, prompt: NAME_PROMPTS[shown % NAME_PROMPTS.length] });
  }, [prompts, log]);

  const nameRefs = useRef({});
  useEffect(() => {
    if (naming && nameRefs.current[naming]) nameRefs.current[naming].focus();
  }, [naming, groups.length]);

  /* --- derived ------------------------------------------------------------ */
  const step = counts.carried > 0 ? 4 : (sorting || round) ? 3 : colorsPulled ? 2 : 1;
  const stepInfo = STEPS[step - 1];
  const namedGroups = groups.filter((g) => g.name.trim()).length;
  const roundCard = round ? cards.find((c) => c.id === round.queue[round.index]) : null;
  const allVoted = counts.unsorted === 0 && counts.keep + counts.maybe + counts.no > 0;
  const keepsOnPile = cards.some((c) => c.board === "pile" && c.tag === "keep");

  const toggleLane = useCallback((lane) => {
    const next = { ...expanded, [lane]: !expanded[lane] };
    log("lane_toggle", { lane, expanded: next[lane] });
    setExpanded(next);
    setTimeout(() => relayout({ expanded: next }), 10);
  }, [expanded, log, relayout]);

  const toggleTidy = useCallback(() => {
    const next = !tidied;
    log("tidy_toggle", { tidied: next });
    setTidied(next);
    setTimeout(() => relayout({ tidied: next }), 10);
  }, [tidied, log, relayout]);

  return (
    <div className={styles.shell}>
      <header className={styles.bar}>
        <span className={styles.wordmark}>inkling<span className={styles.period}>.</span></span>

        <div className={styles.actions}>
          {!colorsPulled ? (
            <button type="button" className={styles.action} onClick={pullColors}>Pull the colors out</button>
          ) : (
            <>
              <button type="button" className={styles.actionQuiet} onClick={() => { setSpectrumOpen((v) => !v); log("spectrum_toggle", { open: !spectrumOpen }); }}>
                {spectrumOpen ? "Hide the spectrum" : "What you keep reaching for"}
              </button>
              {!swatchesMixed && <button type="button" className={styles.actionQuiet} onClick={mixSwatches}>Drop the colors in</button>}
            </>
          )}

          <span className={styles.sep} aria-hidden="true" />

          <button type="button" className={styles.action} onClick={() => startRound("all")} disabled={!!round || counts.unsorted + counts.keep + counts.maybe === 0}>
            {sorting ? "Another round" : "Start a round — vote one at a time"}
          </button>
          {counts.maybe > 0 && (
            <button type="button" className={styles.actionQuiet} onClick={() => startRound("maybe")} disabled={!!round}>
              Round from the maybes ({counts.maybe})
            </button>
          )}
          <button type="button" className={styles.actionQuiet} onClick={toggleTidy} aria-pressed={tidied}>
            {tidied ? "Loosen the pile" : "Tidy the pile"}
          </button>
        </div>

        <div className={styles.zoomer}>
          <button type="button" className={styles.zoomBtn} onClick={() => fitTo(PILE, "pile")}>Board 1</button>
          <button type="button" className={styles.zoomBtn} onClick={() => fitTo(GROUPS, "groups")}>Board 2</button>
          <button type="button" className={styles.zoomBtn} onClick={() => fitTo({ x: PILE.x, y: PILE.y, w: GROUPS.x + GROUPS.w - PILE.x, h: PILE.h }, "both")}>Both</button>
          <button type="button" className={styles.zoomBtn} onClick={() => zoomTo(1)}>{Math.round(zoom * 100)}%</button>
        </div>
      </header>

      <div className={styles.stepStrip}>
        <p className={styles.stepNow}>
          <span className={styles.stepNum}>Step {step} of 5</span>
          <span className={styles.stepTitle}>{stepInfo.title}</span>
        </p>
        <p className={styles.stepCaption}>{stepInfo.caption}</p>
        <ol className={styles.stepDots} aria-label={`Step ${step} of 5: ${stepInfo.title}`}>
          {STEPS.map((s) => (
            <li key={s.n} className={`${styles.stepDot} ${s.n === step ? styles.stepDotNow : ""} ${s.n < step ? styles.stepDotDone : ""}`}>
              <span className={styles.srOnly}>{s.title}</span>
            </li>
          ))}
        </ol>
        <p className={styles.tally} aria-live="polite">
          {counts.unsorted > 0 && <span>{counts.unsorted} to look at</span>}
          {TAGS.map((t) => counts[t] > 0 && <span key={t} className={styles[`count_${t}`]}>{counts[t]} {TAG_LABEL[t].toLowerCase()}</span>)}
          {counts.carried > 0 && <span className={styles.countCarried}>{counts.carried} carried</span>}
          {groups.length > 0 && <span className={styles.countNamed}>{namedGroups} of {groups.length} named</span>}
        </p>
      </div>

      {spectrumOpen && (
        <div className={styles.spectrum} role="region" aria-label="What you keep reaching for">
          <div className={styles.spectrumRow}>
            <p className={styles.spectrumLabel}>Everything</p>
            <div className={styles.spectrumBar}>
              {spectrum.map((b) => <span key={b.hex} className={styles.band} style={{ background: b.hex, flexGrow: b.count }} title={`${b.hex} — in ${b.count} of ${swatchTotal} extracted colors`} />)}
            </div>
          </div>
          <div className={styles.spectrumRow}>
            <p className={styles.spectrumLabel}>Neutrals aside</p>
            <div className={styles.spectrumBar}>
              {chromatic.map((b) => <span key={b.hex} className={styles.band} style={{ background: b.hex, flexGrow: b.count }} title={`${b.hex} — ${b.count} times`} />)}
            </div>
          </div>
          <p className={styles.spectrumNote}>
            {swatchTotal.toLocaleString()} colors pulled from {pins.length} references. The widest bands are the ones you kept reaching for.
          </p>
        </div>
      )}

      <div
        ref={viewportRef}
        className={`${styles.viewport} ${panning ? styles.panning : ""} ${lasso ? styles.lassoing : ""}`}
        onPointerDown={onCanvasPointerDown}
        onPointerMove={onCanvasPointerMove}
        onPointerUp={onCanvasPointerUp}
        onPointerCancel={() => { setPanning(null); setLasso(null); }}
      >
        <div className={styles.canvasScroll} style={{ width: CANVAS.w * zoom, height: CANVAS.h * zoom }}>
          <div className={styles.canvas} style={{ width: CANVAS.w, height: CANVAS.h, transform: `scale(${zoom})`, transformOrigin: "0 0" }}>

            <section className={styles.board} style={{ left: PILE.x, top: PILE.y, width: PILE.w, height: PILE.h }} aria-label="Everything you gathered">
              <h2 className={styles.boardTitle}>1 · Everything you gathered</h2>
            </section>

            {LANES.filter((l) => boxes[l]).map((lane) => (
              <div key={lane} data-lane className={`${styles.lane} ${styles[`lane_${lane}`]}`} style={{ left: boxes[lane].x, top: boxes[lane].y, width: boxes[lane].w, height: boxes[lane].h }}>
                <div className={styles.laneHead}>
                  <span className={styles.laneName}>{LANE_LABEL[lane]}</span>
                  <span className={styles.laneCount}>{counts[lane]}</span>
                  {lane !== "unsorted" && (
                    <button type="button" className={styles.laneToggle} onClick={() => toggleLane(lane)} aria-expanded={!!expanded[lane]}>
                      {expanded[lane] ? "Stack" : "Spread"}
                    </button>
                  )}
                </div>
              </div>
            ))}

            <section className={styles.board} style={{ left: GROUPS.x, top: GROUPS.y, width: GROUPS.w, height: GROUPS.h }} aria-label="What it’s about">
              <h2 className={styles.boardTitle}>2 · What it’s about</h2>
              {counts.carried === 0 ? (
                <div className={styles.boardHint}>
                  <p><strong>This board is for meaning, not material.</strong></p>
                  <p>Carry over a few things that belong together. Draw a frame around them, and say what they have in common in your own words. Then say what they are not. Those two sentences are the first thing your brand actually knows about itself.</p>
                </div>
              ) : (
                <>
                  <div className={styles.boardTools}>
                    <button type="button" className={styles.boardAction} onClick={tidyCarried}>Tidy what is loose</button>
                    <button type="button" className={styles.boardAction} onClick={addGroup}>+ Empty group</button>
                  </div>
                  <p className={styles.boardLegend}>Drag across the board to frame a group. Hold <kbd>⌥</kbd> to pan instead.</p>
                </>
              )}
            </section>

            {/* Frames sit UNDER the cards and take no pointer events, so the
                cards read as being inside them and a drag through a group still
                draws a new frame. */}
            {groups.map((g) => {
              const f = groupField(g);
              return (
                <div
                  key={g.id}
                  className={`${styles.groupFrame} ${g.name.trim() ? styles.groupFrameNamed : ""}`}
                  style={{ left: f.x, top: f.y, width: f.w, height: f.h }}
                  aria-hidden="true"
                />
              );
            })}

            {clusters.map((c) => {
              const b = boundsOf(c.rects, 16);
              return <div key={c.key} className={styles.halo} style={{ left: b.x, top: b.y, width: b.w, height: b.h }} aria-hidden="true" />;
            })}

            {cards.map((card, i) => {
              const size = cardSize(card);
              const isDragging = drag?.id === card.id;
              return (
                <div
                  key={card.id}
                  data-card
                  tabIndex={0}
                  role="button"
                  aria-label={card.kind === "swatch" ? `Color ${card.hex}${card.tag ? `, ${TAG_LABEL[card.tag]}` : ""}` : `${card.alt || "Reference"}${card.tag ? `, ${TAG_LABEL[card.tag]}` : ""}`}
                  className={`${styles.card} ${styles[card.kind]} ${isDragging ? styles.dragging : ""} ${selected === card.id ? styles.selected : ""} ${card.tag ? styles[`tag_${card.tag}`] : ""} ${arriving ? styles.arrive : ""}`}
                  style={{
                    left: card.x, top: card.y, width: size.w, height: size.h, zIndex: card.z,
                    transform: `rotate(${isDragging ? 0 : card.rot}deg)`,
                    animationDelay: arriving ? `${Math.min(i * 7, 1800)}ms` : undefined,
                  }}
                  onPointerDown={(e) => onCardPointerDown(e, card)}
                  onPointerMove={onCardPointerMove}
                  onPointerUp={onCardPointerUp}
                  onPointerCancel={() => setDrag(null)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter" || e.key === " ") { e.preventDefault(); openVote(card.id); return; }
                    const stepPx = e.shiftKey ? 48 : 12;
                    const d = { ArrowLeft: [-stepPx, 0], ArrowRight: [stepPx, 0], ArrowUp: [0, -stepPx], ArrowDown: [0, stepPx] }[e.key];
                    if (!d) return;
                    e.preventDefault();
                    const live = cardsRef.current.find((c) => c.id === card.id) || card;
                    const nx = live.x + d[0];
                    const ny = live.y + d[1];
                    const s = cardSize(live);
                    const inG = nx + s.w / 2 > GROUPS.x && ny + s.h / 2 > GROUPS.y && ny + s.h / 2 < GROUPS.y + GROUPS.h;
                    const board = inG ? "groups" : "pile";
                    if (board !== live.board) log("carry", { card: live.id, kind: live.kind, from: live.board, to: board, via: "keyboard" });
                    setCards((cs) => cs.map((c) => (c.id === card.id ? { ...c, x: nx, y: ny, board, pinned: true } : c)));
                  }}
                >
                  {card.kind === "reference" ? (
                    <>
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img src={card.src} alt={card.alt} loading="lazy" decoding="async" draggable={false} />
                      <span className={`${styles.strip} ${card.revealed ? styles.stripIn : ""}`} aria-hidden="true">
                        {card.palette.slice(0, 6).map((hex, j) => <i key={hex + j} style={{ background: hex, transitionDelay: `${j * 45}ms` }} />)}
                      </span>
                    </>
                  ) : (
                    <>
                      <span className={styles.swatchFill} style={{ background: card.hex }} />
                      <span className={styles.swatchHex}>{card.hex}</span>
                    </>
                  )}
                </div>
              );
            })}

            {/* Everything that must stay ABOVE the cards: the group panels
                (a group is a card with a header, and its header can never be
                buried by its own contents), the cluster offers, and the lasso. */}
            <div className={styles.overLayer}>
              {clusters.map((c) => {
                const b = boundsOf(c.rects, 16);
                return (
                  <div key={c.key} className={styles.offer} style={{ left: b.x + b.w / 2, top: b.y - 14 }}>
                    <button type="button" className={styles.offerYes} onClick={() => acceptCluster(c)}>
                      Frame these {c.rects.length}
                    </button>
                    <button type="button" className={styles.offerNo} aria-label="Not a group" onClick={() => { log("cluster_dismiss", { members: c.rects.length }); setDismissed((d) => [...d, c.key]); }}>
                      ×
                    </button>
                  </div>
                );
              })}

              {groups.map((g) => {
                const members = membersOf(g, cards, b2);
                const strip = groupStrip(members);
                const named = g.name.trim();
                const pi = prompts[g.id];
                return (
                  <div key={g.id}>
                    <div className={styles.panelAnchor} style={{ left: g.x, top: g.y + GROUP_HEAD, width: g.w }}>
                      <div data-group className={`${styles.groupPanel} ${named ? styles.groupPanelNamed : ""}`}>
                        <div
                          className={styles.groupGrab}
                          role="button"
                          tabIndex={0}
                          aria-label={`Move the group ${named || "not yet named"}. Arrow keys move it and everything in it.`}
                          onPointerDown={(e) => onGroupPointerDown(e, g, "move")}
                          onPointerMove={onGroupPointerMove}
                          onPointerUp={onGroupPointerUp}
                          onPointerCancel={() => setGroupDrag(null)}
                          onKeyDown={(e) => {
                            const px = e.shiftKey ? 48 : 12;
                            const d = { ArrowLeft: [-px, 0], ArrowRight: [px, 0], ArrowUp: [0, -px], ArrowDown: [0, px] }[e.key];
                            if (!d) return;
                            e.preventDefault();
                            moveGroupBy(g, d[0], d[1]);
                          }}
                        >
                          <span className={styles.groupStrip} aria-hidden="true">
                            {strip.length
                              ? strip.map((b) => <i key={b.hex} style={{ background: b.hex, flexGrow: b.count }} />)
                              : <i className={styles.stripEmpty} />}
                          </span>
                        </div>

                        <div className={styles.groupFields}>
                          <input
                            ref={(el) => { nameRefs.current[g.id] = el; }}
                            className={styles.groupName}
                            value={g.name}
                            placeholder="What do these have in common?"
                            aria-label="What these have in common"
                            onChange={(e) => setGroups((gs) => gs.map((x) => (x.id === g.id ? { ...x, name: e.target.value } : x)))}
                            onBlur={(e) => e.target.value && log("group_name", { group: g.id, name: e.target.value, members: members.length })}
                          />
                          <input
                            className={styles.groupNot}
                            value={g.notThis}
                            placeholder="…but not ______"
                            aria-label="What this group is not"
                            onChange={(e) => setGroups((gs) => gs.map((x) => (x.id === g.id ? { ...x, notThis: e.target.value } : x)))}
                            onBlur={(e) => e.target.value && log("group_not", { group: g.id, notThis: e.target.value, members: members.length })}
                          />
                        </div>

                        <span className={styles.groupCount}>{members.length}</span>
                        <button type="button" className={styles.groupRelease} onClick={() => releaseGroup(g)} aria-label={`Release the group ${named || "not yet named"}. The cards stay.`}>
                          <span aria-hidden="true">×</span>
                        </button>

                        {!named && (
                          <p className={styles.groupPromptRow}>
                            <button type="button" className={styles.promptBtn} onClick={() => cyclePrompt(g.id)}>
                              {pi == null ? "Stuck?" : "Ask another"}
                            </button>
                            {pi != null && <span className={styles.promptText}>{NAME_PROMPTS[pi % NAME_PROMPTS.length]}</span>}
                          </p>
                        )}
                      </div>
                    </div>

                    <div
                      data-group
                      className={styles.groupResize}
                      role="button"
                      tabIndex={0}
                      aria-label={`Resize the group ${named || "not yet named"}`}
                      style={{ left: g.x + g.w - 44, top: g.y + g.h - 44 }}
                      onPointerDown={(e) => onGroupPointerDown(e, g, "resize")}
                      onPointerMove={onGroupPointerMove}
                      onPointerUp={onGroupPointerUp}
                      onPointerCancel={() => setGroupDrag(null)}
                      onKeyDown={(e) => {
                        const px = e.shiftKey ? 48 : 12;
                        const d = { ArrowLeft: [-px, 0], ArrowRight: [px, 0], ArrowUp: [0, -px], ArrowDown: [0, px] }[e.key];
                        if (!d) return;
                        e.preventDefault();
                        setGroups((gs) => gs.map((x) => (x.id === g.id
                          ? { ...x, w: Math.max(GROUP_MIN.w, x.w + d[0]), h: Math.max(GROUP_MIN.h, x.h + d[1]) }
                          : x)));
                      }}
                    >
                      <span aria-hidden="true" />
                    </div>
                  </div>
                );
              })}

              {lasso && (
                <div
                  className={styles.lasso}
                  aria-hidden="true"
                  style={{
                    left: Math.min(lasso.x0, lasso.x1),
                    top: Math.min(lasso.y0, lasso.y1),
                    width: Math.abs(lasso.x1 - lasso.x0),
                    height: Math.abs(lasso.y1 - lasso.y0),
                  }}
                />
              )}
            </div>
          </div>
        </div>
      </div>

      {allVoted && keepsOnPile && !round && (
        <div className={styles.prompt}>
          <p className={styles.promptText}>Everything is voted. {counts.keep} kept.</p>
          <button type="button" className={styles.action} onClick={carryKeeps}>Carry the keeps over →</button>
        </div>
      )}

      {round && roundCard && (
        <div className={styles.round} role="dialog" aria-modal="true" aria-label={round.mode === "single" ? "Vote on this reference" : `Round ${round.number}`}>
          <div className={styles.roundHead}>
            <p className={styles.roundQ}>{round.question}</p>
            {round.mode === "round" && <p className={styles.roundCount}>{round.index + 1} of {round.queue.length}</p>}
          </div>

          <div className={styles.roundCard}>
            {roundCard.kind === "reference" ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={roundCard.src} alt={roundCard.alt} />
            ) : (
              <span className={styles.roundSwatch} style={{ background: roundCard.hex }}>{roundCard.hex}</span>
            )}
          </div>

          <div className={styles.roundActions}>
            {TAGS.map((t, i) => (
              <button key={t} type="button" className={`${styles.roundBtn} ${styles[`btn_${t}`]} ${roundCard.tag === t ? styles.roundBtnCurrent : ""}`} onClick={() => decide(t)}>
                {TAG_LABEL[t]} <kbd>{i + 1}</kbd>
              </button>
            ))}
            {round.mode === "single" && roundCard.tag && (
              <button type="button" className={styles.roundBtn} onClick={() => decide(null)}>Undecide <kbd>0</kbd></button>
            )}
          </div>

          <button type="button" className={styles.roundLeave} onClick={() => closeRound(round.mode === "single" ? "vote_close" : "round_abandon", round)}>
            {round.mode === "single" ? "Close" : "Leave the round"}
          </button>
        </div>
      )}
    </div>
  );
}
