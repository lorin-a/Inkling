"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { POOLS, sampleSpread, relativeLuminance } from "./palettePool";

/**
 * Shuffle engine.
 *
 * - `palette` is the current ordered list of N colors (palette-size slider).
 * - `locks` is a Set of palette indices the user has locked.
 * - `shuffle()` replaces every unlocked slot with a fresh sample from the pool,
 *   trying to keep hexes distinct from one another and from locked slots.
 * - History keeps the last 50 palettes so the user can step back.
 *
 * Roles are derived from the palette in render-time by sorting by luminance.
 */
const HISTORY_LIMIT = 50;
const FAVORITES_KEY = "moodbuilder.favorites.v1";

export function usePalette({ initialSize = 5, initialPoolKey = "inspiration" } = {}) {
  const [poolKey, setPoolKey] = useState(initialPoolKey);
  const [size, setSize] = useState(initialSize);
  const [palette, setPalette] = useState(() => sampleSpread(POOLS[initialPoolKey], initialSize));
  const [locks, setLocks] = useState(() => new Set());
  const [history, setHistory] = useState([]);
  const [historyIdx, setHistoryIdx] = useState(-1);
  const [favorites, setFavorites] = useState([]);

  const replaying = useRef(false);

  // Hydrate favorites
  useEffect(() => {
    try {
      const raw = localStorage.getItem(FAVORITES_KEY);
      if (raw) setFavorites(JSON.parse(raw));
    } catch {}
  }, []);

  // Persist favorites
  useEffect(() => {
    try {
      localStorage.setItem(FAVORITES_KEY, JSON.stringify(favorites));
    } catch {}
  }, [favorites]);

  // Push to history whenever palette actually changes (and we're not replaying)
  useEffect(() => {
    if (replaying.current) {
      replaying.current = false;
      return;
    }
    setHistory((prev) => {
      const next = [...prev.slice(0, historyIdx + 1), palette];
      if (next.length > HISTORY_LIMIT) next.shift();
      return next;
    });
    setHistoryIdx((i) => Math.min(i + 1, HISTORY_LIMIT - 1));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [palette]);

  // When pool changes, refresh palette (respecting locks)
  useEffect(() => {
    shuffle();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [poolKey]);

  // When palette size changes, grow or trim
  useEffect(() => {
    setPalette((prev) => {
      if (prev.length === size) return prev;
      if (prev.length > size) return prev.slice(0, size);
      const need = size - prev.length;
      const fresh = sampleSpread(
        POOLS[poolKey].filter((c) => !prev.includes(c)),
        need,
      );
      return [...prev, ...fresh];
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [size]);

  const shuffle = useCallback(() => {
    setPalette((prev) => {
      const pool = POOLS[poolKey];
      const lockedHexes = [...locks].map((i) => prev[i]).filter(Boolean);
      const available = pool.filter((c) => !lockedHexes.includes(c));
      const freshCount = size - lockedHexes.length;
      const fresh = sampleSpread(available, freshCount);
      const next = new Array(size);
      let fi = 0;
      for (let i = 0; i < size; i++) {
        if (locks.has(i)) next[i] = prev[i];
        else next[i] = fresh[fi++] ?? prev[i];
      }
      return next;
    });
  }, [poolKey, size, locks]);

  const setSlot = useCallback((i, hex) => {
    setPalette((prev) => prev.map((c, idx) => (idx === i ? hex : c)));
  }, []);

  const toggleLock = useCallback((i) => {
    setLocks((prev) => {
      const next = new Set(prev);
      if (next.has(i)) next.delete(i);
      else next.add(i);
      return next;
    });
  }, []);

  const stepHistory = useCallback(
    (dir) => {
      const target = historyIdx + dir;
      if (target < 0 || target >= history.length) return;
      replaying.current = true;
      setPalette(history[target]);
      setHistoryIdx(target);
    },
    [history, historyIdx],
  );

  const favorite = useCallback(
    (name) => {
      const entry = {
        id: Date.now().toString(36),
        name: name || `Palette ${favorites.length + 1}`,
        palette: palette.slice(),
        ts: new Date().toISOString(),
      };
      setFavorites((prev) => [entry, ...prev].slice(0, 100));
    },
    [palette, favorites.length],
  );

  const removeFavorite = useCallback((id) => {
    setFavorites((prev) => prev.filter((f) => f.id !== id));
  }, []);

  const loadFavorite = useCallback((id) => {
    setFavorites((prev) => {
      const f = prev.find((x) => x.id === id);
      if (f) {
        replaying.current = true;
        setPalette(f.palette);
        setSize(f.palette.length);
      }
      return prev;
    });
  }, []);

  // Sorted by luminance for role derivation
  const sortedByLight = palette
    .map((hex, idx) => ({ hex, idx, lum: relativeLuminance(hex) }))
    .sort((a, b) => a.lum - b.lum);

  return {
    palette,
    setSlot,
    size,
    setSize,
    locks,
    toggleLock,
    poolKey,
    setPoolKey,
    shuffle,
    history,
    historyIdx,
    stepHistory,
    canUndo: historyIdx > 0,
    canRedo: historyIdx < history.length - 1,
    favorites,
    favorite,
    removeFavorite,
    loadFavorite,
    sortedByLight,
  };
}
