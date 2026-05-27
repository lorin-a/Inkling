"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { sampleSpread, relativeLuminance, dedupe } from "./palettePool";
import { composePalette } from "./composePalette";
import { SANZO_POOL } from "./sanzoWada";
import { apiFetch } from "./api/client";

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
  const [brandPool, setBrandPool] = useState([]);
  const [curatedPool, setCuratedPool] = useState([]);
  const [pinPalettes, setPinPalettes] = useState([]); // [{ pinId, palette, sourceDomain, ... }]
  const [starredPaletteIds, setStarredPaletteIds] = useState([]);
  const [libraryLoaded, setLibraryLoaded] = useState(false); // first /palette fetch settled
  const [paletteSource, setPaletteSource] = useState(null); // { kind: 'pin', pinId, sourceDomain } | null
  const [hydrated, setHydrated] = useState(false);
  const [activeSlug, setActiveSlug] = useState(null);
  const [favoritesHydrated, setFavoritesHydrated] = useState(false);

  const replaying = useRef(false);

  const allColors = dedupe([
    ...brandPool,
    ...curatedPool,
    ...moodboardPool,
    ...starredPool,
  ]);
  const pools = {
    moodboard: moodboardPool,
    starred: starredPool,
    brand: brandPool,
    curated: curatedPool,
    all: allColors,
    sanzo: SANZO_POOL,
  };

  // Seed the initial palette on mount (client only). For pools whose data
  // arrives async (starred, moodboard), wait until they’re populated, then
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

  // Zero-input on-ramp: once the library has loaded and the project turns out
  // to have no colors at all, seed the Sanzo Wada starter set and switch the
  // source to it, so composition works on day one before any import. Only
  // fires for a genuinely empty project — a populated-but-unstarred project
  // keeps its existing "nothing starred yet" nudge.
  useEffect(() => {
    if (hydrated || !libraryLoaded) return;
    if (allColors.length === 0) {
      setPoolKey("sanzo");
      setPalette(sampleSpread(SANZO_POOL, size));
      setHydrated(true);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [libraryLoaded, allColors.length]);

  // Fetch the active project slug so favorites can be project-scoped.
  // Re-fetch on focus so switching projects in another tab updates here.
  useEffect(() => {
    let cancelled = false;
    const fetchActive = () => {
      apiFetch("/api/projects/active", { cache: "no-store" })
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
  // re-read so the user sees the new project’s saved palettes.
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
      apiFetch("/api/library/palette", { cache: "no-store" })
        .then((r) => r.ok ? r.json() : null)
        .then((data) => {
          if (cancelled || !data) return;
          if (data.palette) setMoodboardPool(data.palette);
          if (data.starred) setStarredPool(data.starred);
          if (Array.isArray(data.brand)) setBrandPool(data.brand);
          if (data.curated) setCuratedPool(dedupe(Object.values(data.curated).flat()));
          if (Array.isArray(data.pinPalettes)) setPinPalettes(data.pinPalettes);
          if (Array.isArray(data.starredPalettes)) setStarredPaletteIds(data.starredPalettes);
        })
        .catch(() => {})
        .finally(() => { if (!cancelled) setLibraryLoaded(true); });
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
  // and an initial read have happened — otherwise we’d clobber the stored
  // list with the empty default before hydration.
  useEffect(() => {
    if (!favoritesHydrated || activeSlug === null) return;
    try {
      localStorage.setItem(favoritesKey(activeSlug), JSON.stringify(favorites));
    } catch {}
  }, [favorites, activeSlug, favoritesHydrated]);

  // Push to history whenever palette actually changes (and we’re not replaying)
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
      if (freshCount === 0) return prev;

      // Pin-palette sampler: when the project has rated pin palettes, the
      // shuffle samples a whole pin’s palette as a unit instead of
      // composing from atoms. Every output is grounded in a real
      // combination the user has demonstrated taste for. Falls through
      // to the composer when no pin data exists (new project) or every
      // slot is locked.
      let fresh = null;
      let sampledSource = null;
      if (poolKey === "starred" && freshCount >= 3 && pinPalettes.length > 0) {
        const sampled = samplePinPalette({
          pinPalettes,
          starredIds: starredPaletteIds,
          targetSize: freshCount,
          available,
        });
        if (sampled) {
          fresh = sampled.palette;
          sampledSource = sampled.source;
        }
      }

      // Smart composer fallback. Same as before.
      if (!fresh && available.length >= 6) {
        const composed = composePalette({ pool: available, size: freshCount });
        if (composed && composed.length === freshCount) fresh = composed;
      }
      if (!fresh) fresh = sampleSpread(available, freshCount);

      // Track where this palette came from so the UI can show
      // attribution ("from: vogue.com") when the source was a pin.
      setPaletteSource(sampledSource);

      const next = new Array(size);
      let fi = 0;
      for (let i = 0; i < size; i++) {
        if (locks.has(i)) next[i] = prev[i];
        else next[i] = fresh[fi++] ?? prev[i];
      }
      return next;
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [poolKey, size, locks, moodboardPool, pinPalettes, starredPaletteIds]);

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
  // `replaying` keeps it out of history so undo doesn’t ping-pong on apply.
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
    pools,
    paletteSource,
    setPaletteSource,
    pinPalettes,
    starredPaletteIds,
  };
}

/**
 * Sample a pin’s palette as the basis for a shuffle. Weighting:
 *   - Starred pin palettes get 4× weight.
 *   - Unstarred eligible palettes get 1×.
 *   - Once a pin is picked, extend or trim its palette to targetSize:
 *     too short → add luminance-distant fillers from `available`.
 *     too long → trim to top N (already top-extracted by k-means).
 */
function samplePinPalette({ pinPalettes, starredIds, targetSize, available }) {
  const starSet = new Set(starredIds || []);
  // Eligible = palettes long enough to anchor the shuffle.
  const eligible = pinPalettes.filter((p) => Array.isArray(p.palette) && p.palette.length >= Math.min(3, targetSize));
  if (eligible.length === 0) return null;

  const weights = eligible.map((p) => (starSet.has(p.pinId) ? 4 : 1));
  const total = weights.reduce((a, b) => a + b, 0);
  let pick = Math.random() * total;
  let chosen = eligible[0];
  for (let i = 0; i < eligible.length; i++) {
    pick -= weights[i];
    if (pick <= 0) { chosen = eligible[i]; break; }
  }

  let basis = chosen.palette.slice(0, Math.max(targetSize, chosen.palette.length));
  if (basis.length > targetSize) basis = basis.slice(0, targetSize);

  // Extend if the pin palette has fewer colors than we need.
  if (basis.length < targetSize) {
    const need = targetSize - basis.length;
    const fillerPool = (available || []).filter((c) => !basis.includes(c));
    const fillers = sampleSpread(fillerPool, need);
    basis = [...basis, ...fillers];
  }

  return {
    palette: basis,
    source: {
      kind: "pin",
      pinId: chosen.pinId,
      sourceDomain: chosen.sourceDomain,
      sourceUrl: chosen.sourceUrl,
      pinUrl: chosen.pinUrl,
      title: chosen.title,
      starred: starSet.has(chosen.pinId),
    },
  };
}
