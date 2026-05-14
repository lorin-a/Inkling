"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { POOLS, sampleSpread, relativeLuminance, dedupe } from "./palettePool";

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
const FAVORITES_KEY_PREFIX = "moodbuilder.favorites.v1";
const favoritesKey = (slug) => (slug ? `${FAVORITES_KEY_PREFIX}.${slug}` : FAVORITES_KEY_PREFIX);

export function usePalette({ initialSize = 5, initialPoolKey = "inspiration" } = {}) {
  const [poolKey, setPoolKey] = useState(initialPoolKey);
  const [size, setSize] = useState(initialSize);
  // Initialize empty to avoid SSR/CSR hydration mismatch — sampleSpread is
  // random, server and client would otherwise produce different palettes.
  // The mount effect below seeds the real initial palette.
  const [palette, setPalette] = useState([]);
  const [locks, setLocks] = useState(() => new Set());
  const [history, setHistory] = useState([]);
  const [historyIdx, setHistoryIdx] = useState(-1);
  const [favorites, setFavorites] = useState([]);
  const [moodboardPool, setMoodboardPool] = useState([]);
  const [starredPool, setStarredPool] = useState([]);
  const [hydrated, setHydrated] = useState(false);
  const [activeSlug, setActiveSlug] = useState(null);
  const [favoritesHydrated, setFavoritesHydrated] = useState(false);

  const replaying = useRef(false);

  // `all` becomes the true union — every color across every source
  // (Figma vocabulary + moodboard pool from pins + uploads), deduped.
  const allColors = dedupe([...(POOLS.all || []), ...moodboardPool]);
  const pools = {
    ...POOLS,
    moodboard: moodboardPool,
    starred: starredPool,
    all: allColors,
  };

  // Seed the initial palette on mount (client only). For pools whose data
  // arrives async (starred, moodboard), wait until they're populated, then
  // seed. Otherwise the Brand page renders blank for a half-second after
  // each load until the user clicks Shuffle.
  useEffect(() => {
    if (hydrated) return;
    const pool = pools[poolKey] || [];
    const isAsyncPool = poolKey === "starred" || poolKey === "moodboard";
    if (pool.length === 0 && isAsyncPool) return; // wait for hydration
    setPalette(sampleSpread(pool, size));
    setHydrated(true);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [starredPool, moodboardPool]);

  // Fetch the active project slug so favorites can be project-scoped.
  // Re-fetch on focus so switching projects in another tab updates here.
  useEffect(() => {
    let cancelled = false;
    const fetchActive = () => {
      fetch("/api/projects/active", { cache: "no-store" })
        .then((r) => (r.ok ? r.json() : null))
        .then((data) => {
          if (cancelled || !data) return;
          setActiveSlug(data.slug || null);
        })
        .catch(() => {});
    };
    fetchActive();
    window.addEventListener("focus", fetchActive);
    return () => {
      cancelled = true;
      window.removeEventListener("focus", fetchActive);
    };
  }, []);

  // Hydrate favorites from the active-slug bucket. When the slug changes,
  // re-read so the user sees the new project's saved palettes.
  // Migration: if the slug-scoped key is empty but the legacy unscoped key
  // has data, adopt it into the active project (one-time).
  useEffect(() => {
    if (activeSlug === null) return;
    try {
      const scoped = localStorage.getItem(favoritesKey(activeSlug));
      if (scoped) {
        setFavorites(JSON.parse(scoped));
      } else {
        const legacy = localStorage.getItem(FAVORITES_KEY_PREFIX);
        if (legacy) {
          setFavorites(JSON.parse(legacy));
          localStorage.setItem(favoritesKey(activeSlug), legacy);
          localStorage.removeItem(FAVORITES_KEY_PREFIX);
        } else {
          setFavorites([]);
        }
      }
    } catch {
      setFavorites([]);
    }
    setFavoritesHydrated(true);
  }, [activeSlug]);

  // Hydrate moodboard + starred pools from the library API
  useEffect(() => {
    let cancelled = false;
    const refetch = () => {
      fetch("/api/library/palette", { cache: "no-store" })
        .then((r) => r.ok ? r.json() : null)
        .then((data) => {
          if (cancelled || !data) return;
          if (data.palette) setMoodboardPool(data.palette);
          if (data.starred) setStarredPool(data.starred);
        })
        .catch(() => {});
    };
    refetch();
    // Refetch when window regains focus — picks up stars toggled from /colors
    window.addEventListener("focus", refetch);
    return () => {
      cancelled = true;
      window.removeEventListener("focus", refetch);
    };
  }, []);

  // Persist favorites to the active-slug bucket. Skip until both the slug
  // and an initial read have happened — otherwise we'd clobber the stored
  // list with the empty default before hydration.
  useEffect(() => {
    if (!favoritesHydrated || activeSlug === null) return;
    try {
      localStorage.setItem(favoritesKey(activeSlug), JSON.stringify(favorites));
    } catch {}
  }, [favorites, activeSlug, favoritesHydrated]);

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
        (pools[poolKey] || []).filter((c) => !prev.includes(c)),
        need,
      );
      return [...prev, ...fresh];
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [size]);

  const shuffle = useCallback(() => {
    setPalette((prev) => {
      const pool = pools[poolKey] || [];
      if (pool.length === 0) return prev;
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
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [poolKey, size, locks, moodboardPool]);

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

  // Apply a saved palette+size+poolKey atomically (used by Brand Presets).
  // `replaying` keeps it out of history so undo doesn't ping-pong on apply.
  const applySnapshot = useCallback(({ palette: hexes, size: sz, poolKey: pk }) => {
    if (Array.isArray(hexes)) {
      replaying.current = true;
      setPalette(hexes);
      if (Number.isFinite(sz)) setSize(sz);
      else setSize(hexes.length);
    }
    if (typeof pk === "string") setPoolKey(pk);
  }, []);

  return {
    palette,
    setSlot,
    size,
    setSize,
    applySnapshot,
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
    moodboardPool,
    starredPool,
  };
}
