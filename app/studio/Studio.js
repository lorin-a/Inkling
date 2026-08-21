"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import styles from "./studio.module.css";

/**
 * Playtest 01 — gather, narrow, carry, name.
 *
 * The seven questions this answers are in STATUS.md. The three that shape this
 * file:
 *   Q1 carrying must be a real drag across real space, so the two boards are
 *      regions of ONE canvas rather than routes or tabs. There is deliberately
 *      no "send to board" button — if she asks for one, that is the finding.
 *   Q2 swatches mix INTO the pile rather than living in a colour panel, so we
 *      can watch whether she sorts colour together with imagery or splits them.
 *   Q3 a round offers three piles, not two. The maybe pile is the instrument.
 *
 * Nothing here auto-promotes, auto-sorts or auto-groups. Every transformation
 * is triggered by a hand (note 31/45).
 */

const PILE = { x: 90, y: 96, w: 1560, h: 1040 };
const GROUPS = { x: 1780, y: 96, w: 1420, h: 1040 };
const CANVAS = { w: GROUPS.x + GROUPS.w + 90, h: PILE.y + PILE.h + 90 };

const TAG_LABEL = { keep: "Keep", maybe: "Maybe", no: "No" };
const TAGS = ["keep", "maybe", "no"];

// The bar rises each round (Lorin's basket: "20 to 20 to 5 to 2").
const ROUND_QUESTIONS = [
  "Does it still catch your eye?",
  "Does it fit what you’ve named?",
  "Does it make you sing?",
  "Still?",
];

/* ---------- deterministic scatter --------------------------------------- */
// Seeded so the pile is the same pile on reload — a playtest where the material
// rearranges itself between sessions would confound every question here.
function hash(str) {
  let h = 2166136261;
  for (let i = 0; i < str.length; i += 1) {
    h ^= str.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return (h >>> 0) / 4294967295;
}

function scatter(id, i, n, box, size) {
  const a = hash(id + "x");
  const b = hash(id + "y");
  const c = hash(id + "r");
  // Bias toward the middle so the edges feather out instead of ending in a
  // hard rectangle — a pile, not a bin.
  const cx = box.x + box.w / 2;
  const cy = box.y + box.h / 2;
  const spreadX = (box.w - size.w) * 0.5;
  const spreadY = (box.h - size.h) * 0.5;
  const t = (i + 1) / (n + 1);
  // sqrt keeps density even across the disc; a floor here would open a hole in
  // the middle and read as a wreath rather than a pile.
  const ring = Math.sqrt(t);
  const angle = t * Math.PI * 2 * 7.3 + a * 1.7;
  return {
    x: Math.round(cx + Math.cos(angle) * spreadX * ring * (0.55 + 0.45 * a) - size.w / 2),
    y: Math.round(cy + Math.sin(angle) * spreadY * ring * (0.55 + 0.45 * b) - size.h / 2),
    rot: (c - 0.5) * 17,
  };
}

function cardSize(card) {
  if (card.kind === "swatch") return { w: 74, h: 92 };
  const h = 104 + Math.round(hash(card.id + "h") * 58);
  return { w: 118, h };
}

/* ---------- event log ---------------------------------------------------- */
function useEventLog() {
  const queue = useRef([]);
  const session = useRef(null);
  // Minted after mount, never during render: the id is random + persisted, so
  // generating it in the render pass would hydrate-mismatch every load.
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
      const size = cardSize(base);
      const pos = scatter(p.id, i, pins.length, PILE, size);
      return { ...base, ...pos, board: "pile", tag: null, revealed: false, z: i + 1 };
    })
  );
  const [groups, setGroups] = useState([]);
  const [colorsPulled, setColorsPulled] = useState(false);
  const [spectrumOpen, setSpectrumOpen] = useState(false);
  const [swatchesMixed, setSwatchesMixed] = useState(false);
  const [round, setRound] = useState(null);
  const [selected, setSelected] = useState(null);
  const [drag, setDrag] = useState(null);
  // Zoom exists for one reason: Lorin's basket only works if you have SEEN
  // everything before you start judging (note 41). At 1:1 a 250-card pile is
  // 40% visible, which would quietly break the premise on the first screen.
  const [zoom, setZoom] = useState(1);
  const topZ = useRef(pins.length + 1);

  // Logging and other effects must never run inside a setState updater: React
  // double-invokes updaters in development, which silently doubled every event
  // in the session log — and the log is the instrument the playtest is read
  // from. These refs let the handlers decide and log once, then set state
  // purely.
  const cardsRef = useRef(cards);
  const roundRef = useRef(round);
  useEffect(() => { cardsRef.current = cards; }, [cards]);
  useEffect(() => { roundRef.current = round; }, [round]);

  const reduced = useRef(false);
  useEffect(() => {
    reduced.current = window.matchMedia?.("(prefers-reduced-motion: reduce)").matches ?? false;
  }, []);

  /* --- restore / persist ------------------------------------------------ */
  useEffect(() => {
    try {
      const raw = window.localStorage.getItem("inkling-playtest-01");
      if (!raw) return;
      const saved = JSON.parse(raw);
      if (saved?.cards?.length) {
        setCards((cur) => {
          const byId = new Map(saved.cards.map((c) => [c.id, c]));
          const restored = cur.map((c) => (byId.has(c.id) ? { ...c, ...byId.get(c.id) } : c));
          const extra = saved.cards.filter((c) => c.kind === "swatch");
          return [...restored, ...extra.filter((e) => !restored.some((r) => r.id === e.id))];
        });
      }
      if (saved?.groups) setGroups(saved.groups);
      if (saved?.colorsPulled) setColorsPulled(true);
      if (saved?.swatchesMixed) setSwatchesMixed(true);
    } catch { /* a corrupt draft must never block the session */ }
  }, []);

  useEffect(() => {
    const id = setTimeout(() => {
      try {
        window.localStorage.setItem(
          "inkling-playtest-01",
          JSON.stringify({
            cards: cards.map(({ id: cid, kind, x, y, rot, board, tag, revealed, hex, z }) =>
              kind === "swatch" ? { id: cid, kind, x, y, rot, board, tag, hex, z } : { id: cid, x, y, rot, board, tag, revealed, z }
            ),
            groups, colorsPulled, swatchesMixed,
          })
        );
      } catch { /* quota — the session continues, the draft does not */ }
    }, 400);
    return () => clearTimeout(id);
  }, [cards, groups, colorsPulled, swatchesMixed]);

  /* --- pulling the colours out (Q7) ------------------------------------- */
  const pullColors = useCallback(() => {
    log("pull_colors");
    setColorsPulled(true);
    if (reduced.current) {
      setCards((cs) => cs.map((c) => ({ ...c, revealed: true })));
      setTimeout(() => setSpectrumOpen(true), 200);
      return;
    }
    // Staggered so you watch it travel across the pile rather than snap.
    const ids = cards.filter((c) => c.kind === "reference").map((c) => c.id);
    ids.forEach((id, i) => {
      setTimeout(() => setCards((cs) => cs.map((c) => (c.id === id ? { ...c, revealed: true } : c))), i * 9);
    });
    setTimeout(() => setSpectrumOpen(true), ids.length * 9 + 500);
  }, [cards, log]);

  /* --- Q2 instrument: swatches INTO the pile ---------------------------- */
  const mixSwatches = useCallback(() => {
    log("mix_swatches", { count: spectrum.length });
    setSwatchesMixed(true);
    setCards((cs) => {
      const swatches = spectrum.map((band, i) => {
        const id = `sw-${band.hex.replace("#", "")}`;
        const size = { w: 74, h: 92 };
        const pos = scatter(id, i * 13, spectrum.length * 13, PILE, size);
        topZ.current += 1;
        return { id, kind: "swatch", hex: band.hex, share: band.share, count: band.count, ...pos, board: "pile", tag: null, z: topZ.current };
      });
      return [...cs, ...swatches.filter((s) => !cs.some((c) => c.id === s.id))];
    });
  }, [spectrum, log]);

  /* --- rounds (Q3, Q4) --------------------------------------------------- */
  const startRound = useCallback((source) => {
    const pool = cards.filter((c) => c.board === "pile" && (source === "all" ? c.tag !== "no" : c.tag === source));
    if (!pool.length) return;
    const n = (round?.number || 0) + 1;
    const queue = pool.map((c) => c.id);
    log("round_start", { number: n, source, size: queue.length });
    setRound({ number: n, source, queue, index: 0, question: ROUND_QUESTIONS[Math.min(n - 1, ROUND_QUESTIONS.length - 1)], decided: {} });
  }, [cards, round, log]);

  const decide = useCallback((tag) => {
    const r = roundRef.current;
    if (!r) return;
    const id = r.queue[r.index];
    log("decide", { round: r.number, card: id, tag, index: r.index });
    setCards((cs) => cs.map((c) => (c.id === id ? { ...c, tag } : c)));
    const next = r.index + 1;
    if (next >= r.queue.length) {
      log("round_end", { number: r.number, size: r.queue.length });
      setRound(null);
      return;
    }
    setRound({ ...r, index: next, decided: { ...r.decided, [id]: tag } });
  }, [log]);

  // Once a round closes, the results settle into three clusters on the pile
  // board — the activity relaxes into its board, it does not vanish (note 45).
  useEffect(() => {
    if (round) return;
    const tagged = cards.filter((c) => c.board === "pile" && c.tag);
    if (!tagged.length) return;
    const needsPlacing = tagged.some((c) => !c.placedFor || c.placedFor !== c.tag);
    if (!needsPlacing) return;
    setCards((cs) => {
      const cols = { keep: 0, maybe: 1, no: 2 };
      const colW = PILE.w / 3;
      const perCol = { keep: [], maybe: [], no: [] };
      cs.forEach((c) => { if (c.board === "pile" && c.tag) perCol[c.tag].push(c.id); });
      return cs.map((c) => {
        if (c.board !== "pile" || !c.tag || c.placedFor === c.tag) return c;
        const list = perCol[c.tag];
        const i = list.indexOf(c.id);
        const size = cardSize(c);
        const box = { x: PILE.x + cols[c.tag] * colW + 26, y: PILE.y + 74, w: colW - 52, h: PILE.h - 110 };
        const pos = scatter(c.id + c.tag, i, list.length, box, size);
        return { ...c, ...pos, placedFor: c.tag };
      });
    });
  }, [round, cards]);

  /* --- dragging (Q1) ----------------------------------------------------- */
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
    setDrag({ id: card.id, dx: p.x - card.x, dy: p.y - card.y, from: card.board, moved: false, pointer: e.pointerId });
  }, [toCanvas, round]);

  const onCardPointerMove = useCallback((e) => {
    if (!drag || e.pointerId !== drag.pointer) return;
    const p = toCanvas(e.clientX, e.clientY);
    setCards((cs) => cs.map((c) => (c.id === drag.id ? { ...c, x: Math.round(p.x - drag.dx), y: Math.round(p.y - drag.dy) } : c)));
    if (!drag.moved) setDrag((d) => (d ? { ...d, moved: true } : d));

    // Edge auto-pan — carrying across the gap must never require letting go.
    const vp = viewportRef.current;
    const r = vp.getBoundingClientRect();
    const EDGE = 90;
    if (e.clientX > r.right - EDGE) vp.scrollLeft += 16;
    else if (e.clientX < r.left + EDGE) vp.scrollLeft -= 16;
    if (e.clientY > r.bottom - EDGE) vp.scrollTop += 12;
    else if (e.clientY < r.top + EDGE) vp.scrollTop -= 12;
  }, [drag, toCanvas]);

  const onCardPointerUp = useCallback((e) => {
    if (!drag || e.pointerId !== drag.pointer) return;
    const card = cardsRef.current.find((c) => c.id === drag.id);
    if (!card) { setDrag(null); return; }

    const size = cardSize(card);
    const cx = card.x + size.w / 2;
    const cy = card.y + size.h / 2;
    const inGroups = cx > GROUPS.x && cx < GROUPS.x + GROUPS.w && cy > GROUPS.y && cy < GROUPS.y + GROUPS.h;
    const board = inGroups ? "groups" : "pile";

    if (board !== drag.from) {
      const landedIn = inGroups
        ? groups.find((g) => cx > g.x && cx < g.x + g.w && cy > g.y && cy < g.y + g.h)
        : null;
      log("carry", { card: card.id, kind: card.kind, from: drag.from, to: board, group: landedIn?.id || null, tag: card.tag });
    } else if (drag.moved) {
      log("move", { card: card.id, board });
    }

    setCards((cs) => cs.map((c) => (c.id === drag.id ? { ...c, board, placedFor: board === "pile" ? c.placedFor : null } : c)));
    setDrag(null);
  }, [drag, groups, log]);

  /* --- groups + naming (Q5) ---------------------------------------------- */
  const addGroup = useCallback(() => {
    const i = groups.length;
    const col = i % 3;
    const row = Math.floor(i / 3);
    const g = {
      id: `g-${Date.now().toString(36)}`,
      x: GROUPS.x + 40 + col * 452,
      y: GROUPS.y + 60 + row * 470,
      w: 420, h: 430, name: "", notThis: "",
    };
    log("group_add", { group: g.id });
    setGroups((gs) => [...gs, g]);
  }, [groups, log]);

  const memberCount = useCallback((g) => cards.filter((c) => {
    if (c.board !== "groups") return false;
    const s = cardSize(c);
    const cx = c.x + s.w / 2;
    const cy = c.y + s.h / 2;
    return cx > g.x && cx < g.x + g.w && cy > g.y && cy < g.y + g.h;
  }).length, [cards]);

  /* --- zoom -------------------------------------------------------------- */
  // Zoom about a point in the viewport so the thing under the cursor stays put.
  const zoomTo = useCallback((next, anchorClientX, anchorClientY) => {
    const vp = viewportRef.current;
    if (!vp) return;
    const r = vp.getBoundingClientRect();
    const ax = anchorClientX == null ? r.width / 2 : anchorClientX - r.left;
    const ay = anchorClientY == null ? r.height / 2 : anchorClientY - r.top;
    const clamped = Math.min(1.6, Math.max(0.28, next));
    setZoom((prev) => {
      if (clamped === prev) return prev;
      const cx = (vp.scrollLeft + ax) / prev;
      const cy = (vp.scrollTop + ay) / prev;
      requestAnimationFrame(() => {
        vp.scrollLeft = cx * clamped - ax;
        vp.scrollTop = cy * clamped - ay;
      });
      return clamped;
    });
  }, []);

  const fitTo = useCallback((box, label) => {
    const vp = viewportRef.current;
    if (!vp) return;
    const pad = 48;
    const next = Math.min(1.6, Math.max(0.28, Math.min((vp.clientWidth - pad * 2) / box.w, (vp.clientHeight - pad * 2) / box.h)));
    setZoom(next);
    requestAnimationFrame(() => {
      vp.scrollLeft = box.x * next - (vp.clientWidth - box.w * next) / 2;
      vp.scrollTop = box.y * next - (vp.clientHeight - box.h * next) / 2;
    });
    log("zoom_fit", { to: label, zoom: Math.round(next * 100) / 100 });
  }, [log]);

  // Frame the pile on arrival — the first thing you should see is all of it.
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

  /* --- background pan ---------------------------------------------------- */
  const [panning, setPanning] = useState(null);
  const onCanvasPointerDown = useCallback((e) => {
    if (e.button !== 0 || e.target.closest("[data-card],[data-group],input,textarea,button")) return;
    setSelected(null);
    const vp = viewportRef.current;
    setPanning({ x: e.clientX, y: e.clientY, left: vp.scrollLeft, top: vp.scrollTop, pointer: e.pointerId });
    e.currentTarget.setPointerCapture(e.pointerId);
  }, []);
  const onCanvasPointerMove = useCallback((e) => {
    if (!panning || e.pointerId !== panning.pointer) return;
    const vp = viewportRef.current;
    vp.scrollLeft = panning.left - (e.clientX - panning.x);
    vp.scrollTop = panning.top - (e.clientY - panning.y);
  }, [panning]);
  const onCanvasPointerUp = useCallback(() => setPanning(null), []);

  /* --- keyboard ---------------------------------------------------------- */
  useEffect(() => {
    if (!round) return;
    const onKey = (e) => {
      const i = ["1", "2", "3"].indexOf(e.key);
      if (i >= 0) { e.preventDefault(); decide(TAGS[i]); }
      if (e.key === "Escape") { log("round_abandon", { number: round.number, at: round.index }); setRound(null); }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [round, decide, log]);

  const counts = useMemo(() => {
    const c = { keep: 0, maybe: 0, no: 0, untagged: 0, carried: 0 };
    cards.forEach((k) => {
      if (k.board === "groups") { c.carried += 1; return; }
      if (k.tag) c[k.tag] += 1; else c.untagged += 1;
    });
    return c;
  }, [cards]);

  const roundCard = round ? cards.find((c) => c.id === round.queue[round.index]) : null;

  return (
    <div className={styles.shell}>
      <header className={styles.bar}>
        <div className={styles.barLeft}>
          <span className={styles.wordmark}>inkling<span className={styles.period}>.</span></span>
          <span className={styles.sessionTag} title="Playtest session id">{session}</span>
        </div>

        <div className={styles.actions}>
          {!colorsPulled && (
            <button type="button" className={styles.action} onClick={pullColors}>
              Pull the colors out
            </button>
          )}
          {colorsPulled && (
            <button type="button" className={styles.actionQuiet} onClick={() => { setSpectrumOpen((v) => !v); log("spectrum_toggle", { open: !spectrumOpen }); }}>
              {spectrumOpen ? "Hide the spectrum" : "What you keep reaching for"}
            </button>
          )}
          {colorsPulled && !swatchesMixed && (
            <button type="button" className={styles.actionQuiet} onClick={mixSwatches}>
              Drop the colors into the pile
            </button>
          )}
          <span className={styles.sep} aria-hidden="true" />
          <button type="button" className={styles.action} onClick={() => startRound("all")} disabled={!!round}>
            Start a round
          </button>
          {counts.maybe > 0 && (
            <button type="button" className={styles.actionQuiet} onClick={() => startRound("maybe")} disabled={!!round}>
              Round from the maybes ({counts.maybe})
            </button>
          )}
          <button type="button" className={styles.actionQuiet} onClick={addGroup}>New group</button>
          <span className={styles.sep} aria-hidden="true" />
          <div className={styles.zoomer}>
            <button type="button" className={styles.zoomBtn} onClick={() => fitTo(PILE, "pile")} title="Frame the whole pile">Fit</button>
            <button type="button" className={styles.zoomBtn} onClick={() => fitTo({ x: PILE.x, y: PILE.y, w: GROUPS.x + GROUPS.w - PILE.x, h: PILE.h }, "both")} title="Frame both boards">Both</button>
            <button type="button" className={styles.zoomBtn} onClick={() => zoomTo(1)} title="Actual size">{Math.round(zoom * 100)}%</button>
          </div>
        </div>

        <div className={styles.counts} aria-live="polite">
          {counts.untagged > 0 && <span>{counts.untagged} unsorted</span>}
          {TAGS.map((t) => counts[t] > 0 && <span key={t} className={styles[`count_${t}`]}>{counts[t]} {TAG_LABEL[t].toLowerCase()}</span>)}
          {counts.carried > 0 && <span className={styles.countCarried}>{counts.carried} carried</span>}
        </div>
      </header>

      {spectrumOpen && (
        <div className={styles.spectrum} role="region" aria-label="What you keep reaching for">
          <div className={styles.spectrumRow}>
            <p className={styles.spectrumLabel}>Everything</p>
            <div className={styles.spectrumBar}>
              {spectrum.map((band) => (
                <span
                  key={band.hex}
                  className={styles.band}
                  style={{ background: band.hex, flexGrow: band.count }}
                  title={`${band.hex} — in ${band.count} of ${swatchTotal} extracted colors`}
                />
              ))}
            </div>
          </div>
          <div className={styles.spectrumRow}>
            <p className={styles.spectrumLabel}>Setting the neutrals aside</p>
            <div className={styles.spectrumBar}>
              {chromatic.map((band) => (
                <span
                  key={band.hex}
                  className={styles.band}
                  style={{ background: band.hex, flexGrow: band.count }}
                  title={`${band.hex} — ${band.count} times`}
                />
              ))}
            </div>
          </div>
          <p className={styles.spectrumNote}>
            {swatchTotal.toLocaleString()} colors pulled from {pins.length} references. The widest bands are
            the ones you kept reaching for.
          </p>
        </div>
      )}

      <div
        ref={viewportRef}
        className={`${styles.viewport} ${panning ? styles.panning : ""}`}
        onPointerDown={onCanvasPointerDown}
        onPointerMove={onCanvasPointerMove}
        onPointerUp={onCanvasPointerUp}
        onPointerCancel={onCanvasPointerUp}
      >
        <div
          className={styles.canvasScroll}
          style={{ width: CANVAS.w * zoom, height: CANVAS.h * zoom }}
        >
        <div
          className={styles.canvas}
          style={{ width: CANVAS.w, height: CANVAS.h, transform: `scale(${zoom})`, transformOrigin: "0 0" }}
        >
          <section className={styles.board} style={{ left: PILE.x, top: PILE.y, width: PILE.w, height: PILE.h }} aria-label="Everything you gathered">
            <h2 className={styles.boardTitle}>Everything you gathered</h2>
            {cards.some((c) => c.tag && c.board === "pile") && !round && (
              <div className={styles.lanes} aria-hidden="true">
                {TAGS.map((t) => <span key={t} className={styles.lane}>{TAG_LABEL[t]}</span>)}
              </div>
            )}
          </section>

          <section className={styles.board} style={{ left: GROUPS.x, top: GROUPS.y, width: GROUPS.w, height: GROUPS.h }} aria-label="What it’s about">
            <h2 className={styles.boardTitle}>What it’s about</h2>
            {!groups.length && <p className={styles.boardHint}>Carry something over. Then make a group around it and say what it has in common.</p>}
          </section>

          {groups.map((g) => (
            <div key={g.id} data-group className={styles.group} style={{ left: g.x, top: g.y, width: g.w, height: g.h }}>
              <input
                className={styles.groupName}
                value={g.name}
                placeholder="Name this group"
                aria-label="Group name"
                onChange={(e) => setGroups((gs) => gs.map((x) => (x.id === g.id ? { ...x, name: e.target.value } : x)))}
                onBlur={(e) => e.target.value && log("group_name", { group: g.id, name: e.target.value, members: memberCount(g) })}
              />
              <input
                className={styles.groupNot}
                value={g.notThis}
                placeholder="…but not ______"
                aria-label="What this group is not"
                onChange={(e) => setGroups((gs) => gs.map((x) => (x.id === g.id ? { ...x, notThis: e.target.value } : x)))}
                onBlur={(e) => e.target.value && log("group_not", { group: g.id, notThis: e.target.value })}
              />
              <span className={styles.groupCount}>{memberCount(g)}</span>
            </div>
          ))}

          {cards.map((card) => {
            const size = cardSize(card);
            const isDragging = drag?.id === card.id;
            return (
              <div
                key={card.id}
                data-card
                tabIndex={0}
                role="button"
                aria-label={card.kind === "swatch" ? `Color ${card.hex}` : card.alt || "Reference"}
                className={`${styles.card} ${styles[card.kind]} ${isDragging ? styles.dragging : ""} ${selected === card.id ? styles.selected : ""} ${card.tag ? styles[`tag_${card.tag}`] : ""}`}
                style={{
                  left: card.x, top: card.y, width: size.w, height: size.h, zIndex: card.z,
                  transform: `rotate(${isDragging ? 0 : card.rot}deg)`,
                }}
                onPointerDown={(e) => onCardPointerDown(e, card)}
                onPointerMove={onCardPointerMove}
                onPointerUp={onCardPointerUp}
                onPointerCancel={onCardPointerUp}
                onKeyDown={(e) => {
                  const step = e.shiftKey ? 48 : 12;
                  const d = { ArrowLeft: [-step, 0], ArrowRight: [step, 0], ArrowUp: [0, -step], ArrowDown: [0, step] }[e.key];
                  if (!d) return;
                  e.preventDefault();
                  const live = cardsRef.current.find((c) => c.id === card.id) || card;
                  const nx = live.x + d[0];
                  const ny = live.y + d[1];
                  const s = cardSize(live);
                  const inG = nx + s.w / 2 > GROUPS.x && ny + s.h / 2 > GROUPS.y && ny + s.h / 2 < GROUPS.y + GROUPS.h;
                  const board = inG ? "groups" : "pile";
                  if (board !== live.board) log("carry", { card: live.id, kind: live.kind, from: live.board, to: board, via: "keyboard" });
                  setCards((cs) => cs.map((c) => (c.id === card.id
                    ? { ...c, x: nx, y: ny, board, placedFor: board === "pile" ? c.placedFor : null }
                    : c)));
                }}
              >
                {card.kind === "reference" ? (
                  <>
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src={card.src} alt={card.alt} loading="lazy" decoding="async" draggable={false} />
                    <span className={`${styles.strip} ${card.revealed ? styles.stripIn : ""}`} aria-hidden="true">
                      {card.palette.slice(0, 6).map((hex, i) => (
                        <i key={hex + i} style={{ background: hex, transitionDelay: `${i * 45}ms` }} />
                      ))}
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
        </div>
        </div>
      </div>

      {round && roundCard && (
        <div className={styles.round} role="dialog" aria-modal="true" aria-label={`Round ${round.number}`}>
          <div className={styles.roundHead}>
            <p className={styles.roundQ}>{round.question}</p>
            <p className={styles.roundCount}>{round.index + 1} of {round.queue.length}</p>
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
              <button key={t} type="button" className={`${styles.roundBtn} ${styles[`btn_${t}`]}`} onClick={() => decide(t)}>
                {TAG_LABEL[t]} <kbd>{i + 1}</kbd>
              </button>
            ))}
          </div>
          <button type="button" className={styles.roundLeave} onClick={() => { log("round_abandon", { number: round.number, at: round.index }); setRound(null); }}>
            Leave the round
          </button>
        </div>
      )}
    </div>
  );
}
