"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import styles from "./page.module.css";

const TOOLS = [
  { href: "/colors",    eyebrow: "01 — Inspiration", title: "Colors",          body: "Starred set, curated rows, and every color pulled from your pins — one place to browse the project's full vocabulary." },
  { href: "/brand",     eyebrow: "02 — Application", title: "Brand",           body: "Live brand mock. Shuffle palettes, override roles per variant, click-to-recolor any element. Marks repaint with the palette." },
  { href: "/gradients", eyebrow: "03 — Composition", title: "Gradients",       body: "Build linear / radial / conic gradients from any colors. Drag angle, drag stops, copy CSS." },
  { href: "/import",    eyebrow: "04 — Capture",     title: "Pinterest import", body: "Bookmarklet captures an entire board with source credit. Drop the JSON to commit." },
  { href: "/library",   eyebrow: "05 — Library",     title: "Pin library",      body: "All your imported and uploaded images, with extracted palettes. Click any to recolor, star, or open the source." },
];

export default function Home() {
  const [projects, setProjects] = useState(null);
  const [activeSlug, setActiveSlug] = useState(null);
  const [creating, setCreating] = useState(false);
  const [error, setError] = useState(null);

  async function refresh() {
    try {
      const [pres, ares] = await Promise.all([
        fetch("/api/projects", { cache: "no-store" }).then((r) => r.json()),
        fetch("/api/projects/active", { cache: "no-store" }).then((r) => r.json()),
      ]);
      setProjects(pres.projects || []);
      setActiveSlug(ares.slug || null);
    } catch (e) {
      setError(e.message);
    }
  }

  useEffect(() => { refresh(); }, []);

  async function selectProject(slug) {
    if (slug === activeSlug) return;
    await fetch("/api/projects/active", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ slug }),
    });
    setActiveSlug(slug);
  }

  async function createProject(name) {
    setError(null);
    try {
      const res = await fetch("/api/projects", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || `HTTP ${res.status}`);
      await refresh();
      setCreating(false);
    } catch (e) {
      setError(e.message);
    }
  }

  const activeProject = projects?.find((p) => p.slug === activeSlug);

  return (
    <main className={styles.main}>
      <header className={styles.header}>
        <p className={styles.eyebrow}>Moodbuilder</p>
        <h1 className={styles.title}>A studio for assembling brand moods.</h1>
      </header>

      <section className={styles.projectSection}>
        <header className={styles.sectionHeader}>
          <h2 className={styles.sectionTitle}>Projects</h2>
          <p className={styles.sectionHint}>
            Each project keeps its own palette, pins, uploads, brand text, and starred set.
            {activeProject && (
              <>
                {" "}Active: <strong>{activeProject.name}</strong>.
              </>
            )}
          </p>
        </header>

        <div className={styles.projectGrid}>
          {projects === null ? (
            <p className={styles.loadingText}>Loading projects…</p>
          ) : (
            <>
              {projects.map((p) => (
                <button
                  key={p.slug}
                  type="button"
                  className={`${styles.projectCard} ${p.slug === activeSlug ? styles.projectCardActive : ""}`}
                  onClick={() => selectProject(p.slug)}
                >
                  <span className={styles.projectName}>{p.name || p.slug}</span>
                  <span className={styles.projectMeta}>
                    {p.pins != null ? `${p.pins} pins` : "—"}
                    {p.slug === activeSlug && <span className={styles.activeChip}>● active</span>}
                  </span>
                </button>
              ))}
              <button
                type="button"
                className={styles.newProjectCard}
                onClick={() => setCreating(true)}
              >
                <span className={styles.plus}>+</span>
                <span>New project</span>
              </button>
            </>
          )}
        </div>
        {error && <p className={styles.error}>{error}</p>}
      </section>

      <nav className={styles.nav}>
        {TOOLS.map((tool) => (
          <Link key={tool.href} href={tool.href} className={styles.card}>
            <span className={styles.cardEyebrow}>{tool.eyebrow}</span>
            <span className={styles.cardTitle}>{tool.title}</span>
            <span className={styles.cardBody}>{tool.body}</span>
          </Link>
        ))}
      </nav>

      {creating && (
        <NewProjectModal
          onClose={() => setCreating(false)}
          onCreate={createProject}
          error={error}
        />
      )}
    </main>
  );
}

function NewProjectModal({ onClose, onCreate, error }) {
  const [name, setName] = useState("");
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    const onKey = (e) => { if (e.key === "Escape") onClose(); };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  async function submit(e) {
    e.preventDefault();
    if (!name.trim()) return;
    setSubmitting(true);
    try {
      await onCreate(name.trim());
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className={styles.modalBackdrop} onClick={onClose}>
      <form className={styles.modal} onClick={(e) => e.stopPropagation()} onSubmit={submit}>
        <button type="button" className={styles.modalClose} onClick={onClose} aria-label="Close">×</button>
        <h2 className={styles.modalTitle}>New project</h2>
        <p className={styles.modalHint}>Empty workspace. Add Pinterest pins, upload images, extract palettes, and the project's own brand world starts to take shape.</p>
        <label className={styles.field}>
          <span className={styles.fieldLabel}>Project name</span>
          <input
            className={styles.input}
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Sage Lab, March mood, etc."
            autoFocus
            maxLength={80}
          />
          <span className={styles.fieldHint}>Slug will be auto-derived: <code>{slugify(name) || "—"}</code></span>
        </label>
        {error && <p className={styles.error}>{error}</p>}
        <div className={styles.modalActions}>
          <button type="button" className={styles.linkBtn} onClick={onClose}>Cancel</button>
          <button type="submit" className={styles.primaryBtn} disabled={!name.trim() || submitting}>
            {submitting ? "Creating…" : "Create project"}
          </button>
        </div>
      </form>
    </div>
  );
}

function slugify(s) {
  return String(s || "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 48);
}
