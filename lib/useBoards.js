"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { apiFetch } from "./api/client";

/**
 * Owns the moodboard canvases for the active project: load the list, track
 * which board is open, and persist edits. The canvas components stay pure —
 * they call setBlocks / renameBoard and this hook handles the autosave.
 *
 * Boards arrive from /api/moodboards with their full block arrays, so
 * switching between boards is in-memory; only writes hit the network.
 * Block edits debounce (whole-document PUT) so a drag is one save, not forty.
 */

const SAVE_DELAY = 600;
const ACTIVE_KEY = "moodbuilder.moodboard.activeId";

function readActiveId() {
  try { return localStorage.getItem(ACTIVE_KEY); } catch { return null; }
}
function writeActiveId(id) {
  try { localStorage.setItem(ACTIVE_KEY, id); } catch { /* storage off — fine */ }
}

export function useBoards() {
  const [boards, setBoards] = useState([]); // full board docs, incl. blocks
  const [activeId, setActiveId] = useState(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  // Pending debounced saves, keyed by board id, so edits to different boards
  // don't clobber each other's timers.
  const timers = useRef(new Map());
  const latest = useRef(new Map()); // id -> patch to flush

  // Undo/redo. A live mirror of `boards` (so handlers can read the current state
  // synchronously) + two stacks of board snapshots. Rapid edits within one gesture
  // (a drag fires many) coalesce into a single undo step.
  const boardsRef = useRef([]);
  const undoStack = useRef([]);
  const redoStack = useRef([]);
  const lastEditAt = useRef(0);
  const COALESCE_MS = 500;

  const snapOf = (b) => ({ blocks: b.blocks, sections: b.sections, comments: b.comments, background: b.background });

  // Capture the board's pre-edit state for undo. Called BEFORE a mutation applies,
  // so it records where things were. Coalesces a continuous gesture into one entry.
  const recordHistory = useCallback((boardId) => {
    const b = boardsRef.current.find((x) => x.id === boardId);
    if (!b) return;
    const now = Date.now();
    const last = undoStack.current[undoStack.current.length - 1];
    const continuing = now - lastEditAt.current < COALESCE_MS && last && last.id === boardId;
    lastEditAt.current = now;
    if (continuing) return; // same gesture — keep the snapshot taken at its start
    undoStack.current.push({ id: boardId, snap: snapOf(b) });
    if (undoStack.current.length > 100) undoStack.current.shift();
    redoStack.current = []; // a fresh edit invalidates the redo trail
  }, []);

  const flush = useCallback(async (id) => {
    const patch = latest.current.get(id);
    if (!patch) return;
    latest.current.delete(id);
    setSaving(true);
    try {
      await apiFetch(`/api/moodboards/${id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(patch),
      });
    } catch {
      // Edit stays in memory; next change re-schedules a save.
    } finally {
      if (latest.current.size === 0) setSaving(false);
    }
  }, []);

  const scheduleSave = useCallback((id, patch) => {
    const prev = latest.current.get(id) || {};
    latest.current.set(id, { ...prev, ...patch });
    const existing = timers.current.get(id);
    if (existing) clearTimeout(existing);
    timers.current.set(id, setTimeout(() => {
      timers.current.delete(id);
      flush(id);
    }, SAVE_DELAY));
  }, [flush]);

  // Initial load. If the project has no boards yet, seed one so the canvas
  // is never an empty void with no way in.
  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const res = await apiFetch("/api/moodboards", { cache: "no-store" });
        const data = await res.json();
        let list = data.boards || [];
        if (list.length === 0) {
          const created = await apiFetch("/api/moodboards", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ name: "First board" }),
          }).then((r) => r.json());
          if (created.board) list = [created.board];
        }
        if (cancelled) return;
        setBoards(list);
        // Reopen the board you were last on (per browser), not always board 1.
        const remembered = readActiveId();
        const initial = list.some((b) => b.id === remembered) ? remembered : (list[0]?.id || null);
        setActiveId(initial);
      } catch {
        if (!cancelled) setBoards([]);
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => { cancelled = true; };
  }, []);

  // Flush any pending saves on unmount so a quick edit-then-leave still lands.
  useEffect(() => {
    return () => {
      for (const id of timers.current.keys()) flush(id);
    };
  }, [flush]);

  // Remember the active board across reloads (per browser).
  useEffect(() => {
    if (activeId) writeActiveId(activeId);
  }, [activeId]);

  const active = boards.find((b) => b.id === activeId) || null;

  // Keep the ref in sync so undo/history can read current board state synchronously.
  useEffect(() => { boardsRef.current = boards; }, [boards]);

  const setBlocks = useCallback((updater) => {
    recordHistory(activeId);
    setBoards((prev) => prev.map((b) => {
      if (b.id !== activeId) return b;
      const blocks = typeof updater === "function" ? updater(b.blocks || []) : updater;
      scheduleSave(activeId, { blocks });
      return { ...b, blocks };
    }));
  }, [activeId, scheduleSave, recordHistory]);

  // Affinity sections (workshop board). Mirrors setBlocks: same debounced
  // whole-document save, its own patch field, so a section drag and a block
  // drag coexist on one autosave (scheduleSave merges the patches).
  const setSections = useCallback((updater) => {
    recordHistory(activeId);
    setBoards((prev) => prev.map((b) => {
      if (b.id !== activeId) return b;
      const sections = typeof updater === "function" ? updater(b.sections || []) : updater;
      scheduleSave(activeId, { sections });
      return { ...b, sections };
    }));
  }, [activeId, scheduleSave, recordHistory]);

  // Comment pins — same debounced whole-doc save as blocks/sections; its own patch
  // field, so a comment edit coexists with block/section edits on one autosave.
  const setComments = useCallback((updater) => {
    recordHistory(activeId);
    setBoards((prev) => prev.map((b) => {
      if (b.id !== activeId) return b;
      const comments = typeof updater === "function" ? updater(b.comments || []) : updater;
      scheduleSave(activeId, { comments });
      return { ...b, comments };
    }));
  }, [activeId, scheduleSave, recordHistory]);

  const createBoard = useCallback(async (name) => {
    const res = await apiFetch("/api/moodboards", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name: name || "Untitled board" }),
    });
    const data = await res.json();
    if (data.board) {
      setBoards((prev) => [...prev, data.board]);
      setActiveId(data.board.id);
    }
    return data.board;
  }, []);

  const renameBoard = useCallback((id, name) => {
    setBoards((prev) => prev.map((b) => (b.id === id ? { ...b, name } : b)));
    scheduleSave(id, { name });
  }, [scheduleSave]);

  // Board-level background colour (hex string, or null for the default surface).
  const setBoardBackground = useCallback((background) => {
    if (!activeId) return;
    recordHistory(activeId);
    setBoards((prev) => prev.map((b) => (b.id === activeId ? { ...b, background } : b)));
    scheduleSave(activeId, { background });
  }, [activeId, scheduleSave, recordHistory]);

  const deleteBoard = useCallback(async (id) => {
    await apiFetch(`/api/moodboards/${id}`, { method: "DELETE" });
    setBoards((prev) => {
      const next = prev.filter((b) => b.id !== id);
      setActiveId((cur) => (cur === id ? (next[0]?.id || null) : cur));
      return next;
    });
  }, []);

  // Undo: restore the last snapshot (pushing the current state onto redo). Redo is
  // its mirror. Both target the snapshot's board and make it active so the change
  // is visible where it happened.
  const restore = useCallback((fromStack, toStack) => {
    const entry = fromStack.current.pop();
    if (!entry) return;
    const cur = boardsRef.current.find((x) => x.id === entry.id);
    if (cur) toStack.current.push({ id: entry.id, snap: snapOf(cur) });
    lastEditAt.current = 0; // a restore is its own step, never coalesced into the next edit
    setBoards((prev) => prev.map((x) => (x.id === entry.id ? { ...x, ...entry.snap } : x)));
    scheduleSave(entry.id, entry.snap);
    setActiveId(entry.id);
  }, [scheduleSave]);

  const undo = useCallback(() => restore(undoStack, redoStack), [restore]);
  const redo = useCallback(() => restore(redoStack, undoStack), [restore]);

  return {
    boards,
    active,
    activeId,
    setActiveId,
    loading,
    saving,
    setBlocks,
    setSections,
    setComments,
    createBoard,
    renameBoard,
    deleteBoard,
    setBoardBackground,
    undo,
    redo,
  };
}
