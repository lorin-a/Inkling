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

export function useBoards() {
  const [boards, setBoards] = useState([]); // full board docs, incl. blocks
  const [activeId, setActiveId] = useState(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  // Pending debounced saves, keyed by board id, so edits to different boards
  // don't clobber each other's timers.
  const timers = useRef(new Map());
  const latest = useRef(new Map()); // id -> patch to flush

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
        setActiveId(list[0]?.id || null);
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

  const active = boards.find((b) => b.id === activeId) || null;

  const setBlocks = useCallback((updater) => {
    setBoards((prev) => prev.map((b) => {
      if (b.id !== activeId) return b;
      const blocks = typeof updater === "function" ? updater(b.blocks || []) : updater;
      scheduleSave(activeId, { blocks });
      return { ...b, blocks };
    }));
  }, [activeId, scheduleSave]);

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

  const deleteBoard = useCallback(async (id) => {
    await apiFetch(`/api/moodboards/${id}`, { method: "DELETE" });
    setBoards((prev) => {
      const next = prev.filter((b) => b.id !== id);
      setActiveId((cur) => (cur === id ? (next[0]?.id || null) : cur));
      return next;
    });
  }, []);

  return {
    boards,
    active,
    activeId,
    setActiveId,
    loading,
    saving,
    setBlocks,
    createBoard,
    renameBoard,
    deleteBoard,
  };
}
