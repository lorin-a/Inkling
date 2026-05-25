"use client";

import { useCallback, useEffect, useState } from "react";

const DEFAULTS = {
  name: "Untitled",
  slug: "",
  wordmark: "wordmark",
  period: ".",
  initial: "w",
  tagline: "",
  body: "",
};

export function useProject() {
  const [project, setProject] = useState(DEFAULTS);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    let cancelled = false;
    fetch("/api/project", { cache: "no-store" })
      .then((r) => (r.ok ? r.json() : null))
      .then((data) => {
        if (!cancelled && data) setProject({ ...DEFAULTS, ...data });
      })
      .finally(() => !cancelled && setLoaded(true));
    return () => { cancelled = true; };
  }, []);

  const save = useCallback(async (patch) => {
    const optimistic = { ...project, ...patch };
    setProject(optimistic);
    try {
      const res = await fetch("/api/project", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(patch),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || `HTTP ${res.status}`);
      setProject({ ...DEFAULTS, ...data });
      return data;
    } catch (e) {
      // Roll back
      setProject(project);
      throw e;
    }
  }, [project]);

  return { project, save, loaded };
}
