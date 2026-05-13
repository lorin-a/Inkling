"use client";

import { useCallback, useEffect, useState } from "react";

/**
 * Client-side hook for the starred color set. Fetches the current starred
 * array from /api/library/palette on mount (which seeds it from the Figma
 * inspiration grid on first run), and exposes an optimistic toggle that
 * updates local state immediately and persists in the background.
 */
export function useStarred() {
  const [starred, setStarred] = useState(new Set());
  const [hydrated, setHydrated] = useState(false);

  useEffect(() => {
    let cancelled = false;
    fetch("/api/library/palette", { cache: "no-store" })
      .then((r) => (r.ok ? r.json() : null))
      .then((data) => {
        if (cancelled || !data?.starred) return;
        setStarred(new Set(data.starred.map((h) => h.toLowerCase())));
        setHydrated(true);
      })
      .catch(() => setHydrated(true));
    return () => { cancelled = true; };
  }, []);

  const isStarred = useCallback((hex) => starred.has(String(hex).toLowerCase()), [starred]);

  const toggleStar = useCallback(async (hex) => {
    const h = String(hex).toLowerCase();
    const willStar = !starred.has(h);
    setStarred((prev) => {
      const next = new Set(prev);
      if (willStar) next.add(h);
      else next.delete(h);
      return next;
    });
    try {
      const res = await fetch("/api/library/star", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ hex: h, starred: willStar }),
      });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data = await res.json();
      if (data?.starred) {
        setStarred(new Set(data.starred.map((x) => x.toLowerCase())));
      }
    } catch {
      // Roll back on failure
      setStarred((prev) => {
        const next = new Set(prev);
        if (willStar) next.delete(h);
        else next.add(h);
        return next;
      });
    }
  }, [starred]);

  return { starred, isStarred, toggleStar, hydrated };
}
