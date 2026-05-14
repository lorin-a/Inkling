"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import styles from "./ProjectSwitcher.module.css";

/**
 * Compact dropdown chip showing the active project, expanding to a list
 * of all projects. Selecting a different project PUTs the active slug
 * server-side and reloads the page so every fetcher re-resolves.
 */
export default function ProjectSwitcher() {
  const [projects, setProjects] = useState([]);
  const [activeSlug, setActiveSlugState] = useState(null);
  const [open, setOpen] = useState(false);
  const [switching, setSwitching] = useState(false);
  const rootRef = useRef(null);

  useEffect(() => {
    let cancelled = false;
    Promise.all([
      fetch("/api/projects", { cache: "no-store" }).then((r) => r.json()),
      fetch("/api/projects/active", { cache: "no-store" }).then((r) => r.json()),
    ]).then(([p, a]) => {
      if (cancelled) return;
      setProjects(p.projects || []);
      setActiveSlugState(a.slug || null);
    }).catch(() => {});
    return () => { cancelled = true; };
  }, []);

  useEffect(() => {
    if (!open) return;
    function onClick(e) {
      if (rootRef.current && !rootRef.current.contains(e.target)) setOpen(false);
    }
    function onKey(e) {
      if (e.key === "Escape") setOpen(false);
    }
    window.addEventListener("mousedown", onClick);
    window.addEventListener("keydown", onKey);
    return () => {
      window.removeEventListener("mousedown", onClick);
      window.removeEventListener("keydown", onKey);
    };
  }, [open]);

  const active = projects.find((p) => p.slug === activeSlug);
  const label = active?.name || active?.slug || "Project";

  async function selectProject(slug) {
    if (slug === activeSlug) { setOpen(false); return; }
    setSwitching(true);
    try {
      await fetch("/api/projects/active", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ slug }),
      });
      window.location.reload();
    } catch {
      setSwitching(false);
    }
  }

  return (
    <div className={styles.root} ref={rootRef}>
      <button
        type="button"
        className={styles.chip}
        onClick={() => setOpen((v) => !v)}
        aria-haspopup="listbox"
        aria-expanded={open}
        disabled={switching}
      >
        <span className={styles.chipLabel}>{label}</span>
        <span className={styles.chipCaret} aria-hidden="true">▾</span>
      </button>
      {open && (
        <div className={styles.menu} role="listbox">
          {projects.length === 0 ? (
            <p className={styles.empty}>No projects yet.</p>
          ) : (
            projects.map((p) => (
              <button
                key={p.slug}
                type="button"
                role="option"
                aria-selected={p.slug === activeSlug}
                className={`${styles.item} ${p.slug === activeSlug ? styles.itemActive : ""}`}
                onClick={() => selectProject(p.slug)}
              >
                <span className={styles.itemName}>{p.name || p.slug}</span>
                {p.slug === activeSlug && <span className={styles.itemMark}>●</span>}
              </button>
            ))
          )}
          <div className={styles.divider} />
          <Link href="/" className={styles.manageLink} onClick={() => setOpen(false)}>
            Manage projects →
          </Link>
        </div>
      )}
    </div>
  );
}
