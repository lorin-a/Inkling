"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import styles from "../studio.module.css";
import Canvas from "../Canvas";
import Card from "../Card";
import Thread from "../Thread";
import useCardDrag from "../useCardDrag";
import { GROUPS, BOARD2_ROW, cardSize, groupBox } from "../../../../lib/studio/geometry";
import { everyoneWord } from "../../../../lib/studio/steps";
import {
  GROUP_HEAD, GROUP_MIN, groupField, centerOf, inBox, membersOf,
  gridPlace, looseClusters, hugBox, boundsOf, groupStrip,
} from "../../../../lib/studio/grouping";

const SIZE = { w: GROUPS.x + GROUPS.w + 90, h: GROUPS.y + GROUPS.h + 90 };

// Questions, never suggested words: the moment the tool proposes the name,
// the name stops being hers. [provisional] Claude's words.
const PROMPTS = [
  "If these were one place, where are you standing?",
  "What do these have that the ones you cut did not?",
  "Describe them to someone who cannot see the images.",
  "What would this group never do?",
  "What is the feeling, before the adjective?",
];

/**
 * Step 7. Where a pile becomes a meaning. Put things near each other, draw a
 * group around them, name it, say what it is not. The tool can notice a
 * cluster your hands made and offer to draw the group; it never draws one
 * itself.
 */
export default function Group({ cards, setCards, groups, setGroups, log, snapshot, selected, setSelected, topZ, canvasRef, kept, reveal, people, bringKeeps, setNoteText, setNoteColor, removeNote, noteBlur, onZoom, addNote, comments, addComment, deleteComment }) {
  const selectedCard = cards.find((c) => c.id === selected && c.board === "groups" && c.kind === "reference") || null;
  const selectedKey = selectedCard ? (selectedCard.from || selectedCard.id) : null;
  const whoKept = reveal ? `${everyoneWord(people.filter((p) => p.done).length)} kept` : "you kept";
  const b2 = useCallback((c) => cardSize(c, "groups"), []);
  const mine = useMemo(() => cards.filter((c) => c.board === "groups"), [cards]);
  const refsHere = mine.filter((c) => c.kind === "reference").length;
  const { box: G, field: F } = useMemo(() => groupBox(Math.max(refsHere, kept.length)), [refsHere, kept.length]);
  const [naming, setNaming] = useState(null);
  const [prompts, setPrompts] = useState({});
  const [dismissed, setDismissed] = useState([]);
  const [lasso, setLasso] = useState(null);
  const [groupDrag, setGroupDrag] = useState(null);
  const cardsRef = useRef(cards);
  useEffect(() => { cardsRef.current = cards; }, [cards]);

  // Frame the board on arrival and again when the first cards land on it.
  useEffect(() => {
    const id = setTimeout(() => canvasRef.current?.fit(G), 30);
    return () => clearTimeout(id);
  }, [canvasRef, refsHere > 0]); // eslint-disable-line react-hooks/exhaustive-deps

  /* --- cards ------------------------------------------------------------ */
  const { drag, onPointerDown, onPointerMove, onPointerUp } = useCardDrag({
    canvasRef, setCards, snapshot, topZRef: topZ,
    onClick: (card) => setSelected(card.id),
    onDrop: (card) => {
      log("move", { card: card.id, board: "groups" });
      setCards((cs) => cs.map((c) => (c.id === card.id ? { ...c, pinned: true } : c)));
    },
  });

  // Sending a copy back: the copy goes, the original on Look is unmarked.
  const sendBack = useCallback((id) => {
    const card = cardsRef.current.find((c) => c.id === id);
    if (!card || card.board !== "groups") return;
    snapshot();
    log("send_back", { card: card.from || card.id, kind: card.kind });
    setCards((cs) => (card.from
      ? cs.filter((c) => c.id !== id).map((c) => (c.id === card.from ? { ...c, carried: false } : c))
      : cs.filter((c) => c.id !== id)));
    setSelected(null);
  }, [snapshot, log, setCards, setSelected]);

  useEffect(() => {
    const onKey = (e) => {
      if ((e.key === "Delete" || e.key === "Backspace") && selected && !/^(INPUT|TEXTAREA)$/.test(e.target?.tagName || "")) {
        const card = cardsRef.current.find((c) => c.id === selected);
        if (card?.kind === "note") return; // notes have their own delete button
        e.preventDefault();
        sendBack(selected);
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [selected, sendBack]);

  /* --- groups ------------------------------------------------------------ */
  const makeGroup = useCallback((members, via) => {
    if (!members.length) return null;
    const box = hugBox(members.map((c) => { const s = b2(c); return { x: c.x, y: c.y, w: s.w, h: s.h }; }));
    const M = 12;
    const dx = Math.round(Math.min(0, G.x + G.w - M - (box.x + box.w)) + Math.max(0, G.x + M - box.x));
    const dy = Math.round(Math.min(0, G.y + G.h - M - (box.y + box.h)) + Math.max(0, G.y + M - box.y));
    snapshot();
    if (dx || dy) {
      const ids = new Set(members.map((m) => m.id));
      setCards((cs) => cs.map((c) => (ids.has(c.id) ? { ...c, x: c.x + dx, y: c.y + dy, pinned: true } : c)));
    }
    const g = { id: `g-${Date.now().toString(36)}${Math.round(performance.now())}`, ...box, x: box.x + dx, y: box.y + dy, name: "", notThis: "" };
    log("group_create", { group: g.id, via, members: members.length });
    setGroups((gs) => [...gs, g]);
    setNaming(g.id);
    return g;
  }, [b2, snapshot, setCards, setGroups, log, G]);

  const newGroup = useCallback(() => {
    const used = groups.length;
    const g = {
      id: `g-${Date.now().toString(36)}`,
      x: F.x + (used % 3) * (GROUP_MIN.w + 40),
      y: F.y + F.h - GROUP_MIN.h - 20 - Math.floor(used / 3) * (GROUP_MIN.h + 30),
      w: GROUP_MIN.w + 80, h: GROUP_MIN.h + 40, name: "", notThis: "",
    };
    snapshot();
    log("group_create", { group: g.id, via: "button", members: 0 });
    setGroups((gs) => [...gs, g]);
    setNaming(g.id);
    setTimeout(() => canvasRef.current?.fit({ x: g.x - 200, y: g.y - 160, w: g.w + 400, h: g.h + 320 }), 30);
  }, [groups.length, snapshot, log, setGroups, canvasRef, F]);

  const ungroup = useCallback((g) => {
    snapshot();
    log("group_release", { group: g.id, members: membersOf(g, cardsRef.current, b2).length });
    setGroups((gs) => gs.filter((x) => x.id !== g.id));
    setNaming((n) => (n === g.id ? null : n));
  }, [snapshot, log, setGroups, b2]);

  const lineUp = useCallback(() => {
    const fields = groups.map(groupField);
    const loose = cardsRef.current.filter((c) => c.board === "groups" && c.kind !== "note" && !fields.some((f) => inBox(centerOf(c, b2(c)), f)));
    if (!loose.length) return;
    snapshot();
    log("line_up", { count: loose.length });
    const order = new Map(loose.map((c, i) => [c.id, i]));
    setCards((cs) => cs.map((c) => (order.has(c.id) ? { ...c, ...gridPlace(order.get(c.id), F, b2(c), 12, BOARD2_ROW), pinned: false } : c)));
  }, [groups, b2, snapshot, log, setCards, F]);

  const onGroupPointerDown = useCallback((e, g, mode) => {
    if (e.button !== 0) return;
    e.stopPropagation();
    e.currentTarget.setPointerCapture(e.pointerId);
    const p = canvasRef.current.toCanvas(e.clientX, e.clientY);
    snapshot();
    const members = membersOf(g, cardsRef.current, b2).map((c) => ({ id: c.id, x: c.x, y: c.y }));
    setGroupDrag({ id: g.id, mode, pointer: e.pointerId, dx: p.x - g.x, dy: p.y - g.y, x0: g.x, y0: g.y, w0: g.w, h0: g.h, members, moved: false });
  }, [canvasRef, snapshot, b2]);

  const onGroupPointerMove = useCallback((e) => {
    if (!groupDrag || e.pointerId !== groupDrag.pointer) return;
    const p = canvasRef.current.toCanvas(e.clientX, e.clientY);
    if (groupDrag.mode === "move") {
      const nx = Math.round(p.x - groupDrag.dx);
      const ny = Math.round(p.y - groupDrag.dy);
      const ddx = nx - groupDrag.x0;
      const ddy = ny - groupDrag.y0;
      setGroups((gs) => gs.map((x) => (x.id === groupDrag.id ? { ...x, x: nx, y: ny } : x)));
      const by = new Map(groupDrag.members.map((m) => [m.id, m]));
      setCards((cs) => cs.map((c) => (by.has(c.id) ? { ...c, x: by.get(c.id).x + ddx, y: by.get(c.id).y + ddy, pinned: true } : c)));
    } else {
      const w = Math.max(GROUP_MIN.w, Math.round(groupDrag.w0 + (p.x - groupDrag.dx - groupDrag.x0)));
      const h = Math.max(GROUP_MIN.h, Math.round(groupDrag.h0 + (p.y - groupDrag.dy - groupDrag.y0)));
      setGroups((gs) => gs.map((x) => (x.id === groupDrag.id ? { ...x, w, h } : x)));
    }
    if (!groupDrag.moved) setGroupDrag((d) => (d ? { ...d, moved: true } : d));
  }, [groupDrag, canvasRef, setGroups, setCards]);

  // A group that lands on other cards must not quietly absorb them.
  const displace = useCallback((g, keepIds) => {
    const inside = membersOf(g, cardsRef.current, b2);
    const out = inside.filter((c) => !keepIds.has(c.id));
    if (!out.length) return;
    const field = groupField(g);
    const below = field.y + field.h + 14;
    const fits = below + 130 < G.y + G.h;
    const ids = new Set(out.map((c) => c.id));
    log("group_displace", { group: g.id, count: out.length });
    setCards((cs) => cs.map((c) => (ids.has(c.id) ? { ...c, y: fits ? below : Math.max(G.y + 16, g.y - b2(c).h - 14), pinned: true } : c)));
  }, [b2, log, setCards, G]);

  const onGroupPointerUp = useCallback(() => {
    if (!groupDrag) return;
    const g = groups.find((x) => x.id === groupDrag.id);
    if (groupDrag.moved && g) {
      displace(g, new Set(groupDrag.members.map((m) => m.id)));
      log(groupDrag.mode === "move" ? "group_move" : "group_resize", { group: g.id, members: groupDrag.members.length });
    }
    setGroupDrag(null);
  }, [groupDrag, groups, displace, log]);

  /* --- lasso ------------------------------------------------------------- */
  const onEmptyDown = (e) => {
    setSelected(null);
    const p = canvasRef.current.toCanvas(e.clientX, e.clientY);
    if (e.altKey || !inBox(p, G)) return false; // pan
    e.currentTarget.setPointerCapture(e.pointerId);
    setLasso({ x0: p.x, y0: p.y, x1: p.x, y1: p.y, pointer: e.pointerId });
    return true;
  };
  const onEmptyMove = (e) => {
    if (!lasso || e.pointerId !== lasso.pointer) return false;
    const p = canvasRef.current.toCanvas(e.clientX, e.clientY);
    setLasso((l) => (l ? { ...l, x1: p.x, y1: p.y } : l));
    return true;
  };
  const onEmptyUp = () => {
    if (!lasso) return;
    const box = lasso;
    setLasso(null);
    const rect = { x: Math.min(box.x0, box.x1), y: Math.min(box.y0, box.y1), w: Math.abs(box.x1 - box.x0), h: Math.abs(box.y1 - box.y0) };
    if (rect.w < 26 && rect.h < 26) return;
    const inside = cardsRef.current.filter((c) => c.board === "groups" && inBox(centerOf(c, b2(c)), rect));
    if (!inside.length) { log("lasso_empty", {}); return; }
    makeGroup(inside, "lasso");
  };

  /* --- derived ----------------------------------------------------------- */
  const clusters = useMemo(() => {
    if (refsHere < 3 || drag || groupDrag || lasso) return [];
    return looseClusters(cards, groups, b2)
      .map((rects) => ({ key: rects.map((r) => r.id).sort().join("|"), rects }))
      .filter((c) => !dismissed.includes(c.key))
      .slice(0, 2);
  }, [cards, groups, refsHere, drag, groupDrag, lasso, dismissed, b2]);

  const nameRefs = useRef({});
  useEffect(() => { if (naming && nameRefs.current[naming]) nameRefs.current[naming].focus(); }, [naming, groups.length]);

  const keptHere = new Set(cards.filter((c) => c.from).map((c) => c.from));
  const fresh = kept.filter((c) => !keptHere.has(c.id)).length;

  return (
    <div className={styles.stepBody}>
      <div className={styles.toolbar}>
        {fresh > 0 && (
          <button type="button" className={styles.action} onClick={bringKeeps}>
            Bring in the {fresh} {whoKept}
          </button>
        )}
        <button type="button" className={styles.quiet} onClick={newGroup}>New empty group</button>
        <button type="button" className={styles.quiet} onClick={lineUp} disabled={refsHere === 0}>Line up the loose cards</button>
        <button type="button" className={styles.quiet} onClick={() => addNote()}>+ Note</button>
        <span className={styles.toolbarNote}>Drag across empty space to draw a group around cards. Hold ⌥ to pan. Select a card and press Delete to send it back to Look.</span>
      </div>

      <Canvas
        ref={canvasRef}
        size={SIZE}
        onZoom={onZoom}
        cursor={lasso ? "crosshair" : undefined}
        onEmptyPointerDown={onEmptyDown}
        onEmptyPointerMove={onEmptyMove}
        onEmptyPointerUp={onEmptyUp}
        onPointerCancel={() => setLasso(null)}
      >
        <section className={styles.board} style={{ left: G.x, top: G.y, width: G.w, height: G.h }} aria-label="Group and name">
          <h2 className={styles.boardTitle}>Group and name</h2>
          {refsHere === 0 && (
            <div className={styles.boardHint}>
              <p><strong>This board is empty.</strong></p>
              <p>{kept.length ? "Bring in what you kept, then drag across the ones that belong together to draw a group around them." : "Vote first, then bring in what you kept."}</p>
              {fresh > 0 && <button type="button" className={styles.action} onClick={bringKeeps}>Bring in the {fresh} {whoKept}</button>}
            </div>
          )}
        </section>

        {groups.map((g) => {
          const f = groupField(g);
          return <div key={g.id} className={`${styles.groupFrame} ${g.name?.trim() ? styles.groupFrameNamed : ""}`} style={{ left: f.x, top: f.y, width: f.w, height: f.h }} aria-hidden="true" />;
        })}

        {clusters.map((c) => {
          const b = boundsOf(c.rects, 16);
          return <div key={c.key} className={styles.halo} style={{ left: b.x, top: b.y, width: b.w, height: b.h }} aria-hidden="true" />;
        })}

        {mine.map((card) => (
          <Card
            key={card.id}
            card={card}
            size={b2(card)}
            selected={selected === card.id}
            dragging={drag?.id === card.id}
            revealed
            commentCount={comments[card.from || card.id]?.length || 0}
            onPointerDown={(e) => onPointerDown(e, card)}
            onPointerMove={onPointerMove}
            onPointerUp={(e) => onPointerUp(e, cards)}
            onPointerCancel={() => {}}
            onKeyDown={(e) => {
              const px = e.shiftKey ? 48 : 12;
              const d = { ArrowLeft: [-px, 0], ArrowRight: [px, 0], ArrowUp: [0, -px], ArrowDown: [0, px] }[e.key];
              if (!d) return;
              e.preventDefault();
              snapshot();
              setCards((cs) => cs.map((c) => (c.id === card.id ? { ...c, x: c.x + d[0], y: c.y + d[1], pinned: true } : c)));
            }}
            onNoteChange={setNoteText}
            onNoteColor={setNoteColor}
            onNoteRemove={removeNote}
            onNoteBlur={noteBlur}
          />
        ))}

        <div className={styles.overLayer}>
          {clusters.map((c) => {
            const b = boundsOf(c.rects, 16);
            return (
              <div key={c.key} className={styles.offer} style={{ left: b.x + b.w / 2, top: b.y - 14 }}>
                <button type="button" className={styles.offerYes} onClick={() => { const ids = new Set(c.rects.map((r) => r.id)); log("cluster_accept", { members: ids.size }); makeGroup(cardsRef.current.filter((k) => ids.has(k.id)), "cluster"); }}>
                  Group these {c.rects.length}
                </button>
                <button type="button" className={styles.offerNo} aria-label="Not a group" onClick={() => { log("cluster_dismiss", { members: c.rects.length }); setDismissed((d) => [...d, c.key]); }}>×</button>
              </div>
            );
          })}

          {groups.map((g) => {
            const members = membersOf(g, cards, b2);
            const strip = groupStrip(members);
            const named = g.name?.trim();
            const pi = prompts[g.id];
            return (
              <div key={g.id}>
                <div className={styles.panelAnchor} style={{ left: g.x, top: g.y + GROUP_HEAD, width: g.w }}>
                  <div data-group className={`${styles.groupPanel} ${named ? styles.groupPanelNamed : ""}`}>
                    <div
                      className={styles.groupGrab}
                      role="button"
                      tabIndex={0}
                      aria-label={`Move the group ${named || "not yet named"} and everything in it`}
                      title="Drag to move the group"
                      onPointerDown={(e) => onGroupPointerDown(e, g, "move")}
                      onPointerMove={onGroupPointerMove}
                      onPointerUp={onGroupPointerUp}
                      onPointerCancel={() => setGroupDrag(null)}
                    >
                      <span className={styles.groupStrip} aria-hidden="true">
                        {strip.length ? strip.map((b) => <i key={b.hex} style={{ background: b.hex, flexGrow: b.count }} />) : <i className={styles.stripEmpty} />}
                      </span>
                      <span className={styles.groupCount}>{members.length} {members.length === 1 ? "card" : "cards"}</span>
                    </div>
                    <div className={styles.groupFields}>
                      <input
                        ref={(el) => { nameRefs.current[g.id] = el; }}
                        className={styles.groupName}
                        value={g.name}
                        placeholder="Name this group"
                        aria-label="Group name"
                        onChange={(e) => setGroups((gs) => gs.map((x) => (x.id === g.id ? { ...x, name: e.target.value } : x)))}
                        onBlur={(e) => e.target.value && log("group_name", { group: g.id, name: e.target.value, members: members.length })}
                      />
                      <input
                        className={styles.groupNot}
                        value={g.notThis}
                        placeholder="Not this: what it should never be"
                        aria-label="What this group is not"
                        onChange={(e) => setGroups((gs) => gs.map((x) => (x.id === g.id ? { ...x, notThis: e.target.value } : x)))}
                        onBlur={(e) => e.target.value && log("group_not", { group: g.id, notThis: e.target.value, members: members.length })}
                      />
                    </div>
                    <div className={styles.groupRow}>
                      {!named && (
                        <>
                          <button type="button" className={styles.promptBtn} onClick={() => { setPrompts((p) => ({ ...p, [g.id]: p[g.id] == null ? 0 : p[g.id] + 1 })); log("name_prompt", { group: g.id }); }}>
                            {pi == null ? "Need a prompt?" : "Another prompt"}
                          </button>
                          {pi != null && <span className={styles.promptText}>{PROMPTS[pi % PROMPTS.length]}</span>}
                        </>
                      )}
                      <button type="button" className={styles.groupUngroup} onClick={() => ungroup(g)}>Ungroup</button>
                    </div>
                  </div>
                </div>
                <div
                  data-group
                  className={styles.groupResize}
                  role="button"
                  tabIndex={0}
                  aria-label={`Resize the group ${named || "not yet named"}`}
                  title="Drag to resize"
                  style={{ left: g.x + g.w - 44, top: g.y + g.h - 44 }}
                  onPointerDown={(e) => onGroupPointerDown(e, g, "resize")}
                  onPointerMove={onGroupPointerMove}
                  onPointerUp={onGroupPointerUp}
                  onPointerCancel={() => setGroupDrag(null)}
                >
                  <span aria-hidden="true" />
                </div>
              </div>
            );
          })}

          {lasso && (
            <div className={styles.lasso} aria-hidden="true" style={{ left: Math.min(lasso.x0, lasso.x1), top: Math.min(lasso.y0, lasso.y1), width: Math.abs(lasso.x1 - lasso.x0), height: Math.abs(lasso.y1 - lasso.y0) }} />
          )}
        </div>
      </Canvas>

      {selectedCard && (
        <aside className={styles.cardPanel} aria-label="Comments on the selected card">
          <div className={styles.cardPanelHead}>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={selectedCard.src} alt={selectedCard.alt} />
            <div className={styles.cardPanelMeta}>
              <p className={styles.cardPanelTitle}>Comments</p>
              <p className={styles.muted}>{(comments[selectedKey] || []).length} so far</p>
            </div>
            <button type="button" className={styles.trayClose} aria-label="Close" onClick={() => setSelected(null)}>×</button>
          </div>
          <Thread cardId={selectedKey} comments={comments[selectedKey]} onAdd={addComment} onDelete={deleteComment} />
        </aside>
      )}
    </div>
  );
}
