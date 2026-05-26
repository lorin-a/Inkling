"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { signOut } from "next-auth/react";
import { apiFetch } from "../lib/api/client";
import { resetToSample } from "../lib/storage/localStore";
import LiveBrandHero from "../components/LiveBrandHero";
import styles from "./page.module.css";

// The path, in order. Bodies are the existing (approved) tool copy,
// unchanged; the verbs are lifted from the eyebrows so the tools read as
// one journey instead of a flat menu of pages.
//
// "Surface" (gradients) is part of the build, not a side utility — it's a
// material dimension of the identity. It will grow into a texture/gradient
// combo (grain, image-texture overlay) per NEXT.md #5; the body stays
// gradient-only until that ships so the copy doesn't overclaim.
const STEPS = [
  { href: "/import",    n: "01", verb: "Pull in",  title: "Pinterest import", body: "Save a one-click button to your bookmarks bar, click it on any board, and it captures every pin with source credit. Palettes extract automatically." },
  { href: "/library",   n: "02", verb: "Browse",   title: "Pin library",      body: "Every pin and upload for this project, with extracted palettes. Click any pin to open the source." },
  { href: "/colors",    n: "03", verb: "Curate",   title: "Colors",           body: "Starred set, brand swatches, curated pairings, and every color pulled from your pins. Star here, shuffle on Brand." },
  { href: "/brand",     n: "04", verb: "Compose",  title: "Brand",            body: "The live brand. Shuffle palettes, pick fonts, override roles per variant, click any element to recolor. Marks repaint with the palette." },
  { href: "/gradients", n: "05", verb: "Surface",  title: "Gradients",        body: "Sketch linear / radial / conic gradients from any project color. Drag the angle, drag the stops, copy the CSS." },
  { href: "/print",     n: "06", verb: "Deliver",  title: "Brand book",       body: "Five-page printable: cover, palette, type, marks, gradients. The finished artifact. Open from Brand, or here for a quick look." },
];

export default function Home() {
  const [projects, setProjects] = useState(null);
  const [activeSlug, setActiveSlug] = useState(null);
  const [creating, setCreating] = useState(false);
  const [error, setError] = useState(null);
  const [session, setSession] = useState(null); // { user: { email, name, image } } | null

  async function refresh() {
    try {
      const [pres, ares, ses] = await Promise.all([
        apiFetch("/api/projects", { cache: "no-store" }).then((r) => r.json()),
        apiFetch("/api/projects/active", { cache: "no-store" }).then((r) => r.json()),
        fetch("/api/auth/session", { cache: "no-store" }).then((r) => r.json()),
      ]);
      setProjects(pres.projects || []);
      setActiveSlug(ares.slug || null);
      setSession(ses && ses.user ? ses : null);
    } catch (e) {
      setError(e.message);
    }
  }

  useEffect(() => { refresh(); }, []);

  // Selecting a project sets the context the path below acts on — it does
  // NOT navigate. You choose which project you're inside here, then walk its
  // steps in the path. (The hero's "Open the studio" button is the express
  // way straight in.)
  async function selectProject(slug) {
    if (slug === activeSlug) return;
    try {
      await apiFetch("/api/projects/active", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ slug }),
      });
      setActiveSlug(slug);
    } catch (e) {
      setError(e.message);
    }
  }

  async function createProject(name) {
    setError(null);
    try {
      const res = await apiFetch("/api/projects", {
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

  const signedIn = !!session?.user;
  const isEmptyAuthedAccount = signedIn && projects !== null && projects.length === 0;

  return (
    <main className={styles.main}>
      {signedIn && (
        <div className={styles.authBar}>
          <span className={styles.authBarLabel}>
            Signed in as <strong>{session.user.email || session.user.name}</strong>
          </span>
          <button
            type="button"
            className={styles.signOutBtn}
            onClick={() => signOut({ callbackUrl: "/login" })}
          >
            Sign out
          </button>
        </div>
      )}

      {!signedIn && (
        <div className={styles.playgroundBanner} role="status">
          <span className={styles.bannerIcon} aria-hidden="true">✦</span>
          <span className={styles.bannerText}>
            <strong className={styles.bannerLead}>You&rsquo;re in a sample studio.</strong>{" "}
            <span className={styles.bannerSub}>Everything you change saves to this browser only.</span>
          </span>
          <span className={styles.playgroundActions}>
            <button
              type="button"
              className={styles.bannerReset}
              onClick={() => {
                if (confirm("Reset the sample studio? This clears every change you’ve made in this browser.")) {
                  resetToSample();
                  window.location.reload();
                }
              }}
            >
              Reset sample
            </button>
            <Link href="/login" className={styles.bannerPrimary}>
              Sign in to save across devices
            </Link>
          </span>
        </div>
      )}

      <section className={styles.hero}>
        <div className={styles.heroText}>
          <p className={styles.eyebrow}>Moodbuilder</p>
          <h1 className={styles.title}>A studio for assembling brand moods.</h1>
          {/* [LORIN TO OWN] — functional placeholder subhead, plain on purpose so it's easy to replace in your voice. */}
          <p className={styles.heroSub}>
            Import the images you&rsquo;re drawn to, and it composes a color-and-type
            identity from them. Shuffle, refine, then export a brand book.
          </p>
          <HeroActions
            signedIn={signedIn}
            isEmptyAuthedAccount={isEmptyAuthedAccount}
            activeProject={activeProject}
            onNewProject={() => setCreating(true)}
          />
        </div>
        <LiveBrandHero />
      </section>

      <section className={styles.projectSection}>
        <header className={styles.sectionHeader}>
          <h2 className={styles.sectionTitle}>
            {signedIn && !isEmptyAuthedAccount ? "Choose a project" : "Your project"}
          </h2>
          <p className={styles.sectionHint}>
            {!signedIn ? (
              <>This is a sample to play with. Rename it, paste your own colors, or import a Pinterest board. It all saves to this browser. Sign in when you want to keep your work and start more projects.</>
            ) : isEmptyAuthedAccount ? (
              <>Welcome. Start a new brand project below to begin &mdash; every project keeps its own palette, pins, uploads, brand text, and starred set.</>
            ) : (
              <>Pick the project you want to work in. Each one keeps its own palette, pins, uploads, brand text, and starred set; the steps below act on whichever you select.</>
            )}
          </p>
        </header>

        <div className={styles.projectGrid}>
          {projects === null ? (
            <p className={styles.loadingText}>Loading projects…</p>
          ) : (
            <>
              {projects.map((p) => {
                const isActive = p.slug === activeSlug;
                return (
                  <button
                    key={p.slug}
                    type="button"
                    className={`${styles.projectCard} ${isActive ? styles.projectCardActive : ""}`}
                    onClick={() => selectProject(p.slug)}
                    aria-pressed={isActive}
                  >
                    {p.swatches?.length > 0 && (
                      <span className={styles.projectSwatches} aria-hidden="true">
                        {p.swatches.slice(0, 5).map((hex, i) => (
                          <span key={`${hex}-${i}`} style={{ background: hex }} />
                        ))}
                      </span>
                    )}
                    <span className={styles.projectName}>
                      {p.wordmark || p.name || p.slug}
                      {!signedIn && <span className={styles.sampleTag}>Sample</span>}
                    </span>
                    <span className={styles.projectFoot}>
                      <span className={styles.projectMeta}>
                        {p.pins != null ? `${p.pins} pins` : "—"}
                      </span>
                      {isActive ? (
                        <span className={styles.projectSelected}>● Selected</span>
                      ) : (
                        <span className={styles.projectSelect} aria-hidden="true">Select →</span>
                      )}
                    </span>
                  </button>
                );
              })}
              {signedIn ? (
                <button
                  type="button"
                  className={styles.newProjectCard}
                  onClick={() => setCreating(true)}
                >
                  <span className={styles.plus}>+</span>
                  <span>Start a new brand project</span>
                </button>
              ) : (
                <Link href="/login" className={styles.newProjectCard}>
                  <span className={styles.plus}>+</span>
                  <span>Sign in to start more projects</span>
                </Link>
              )}
            </>
          )}
        </div>
        {error && <p className={styles.error}>{error}</p>}
      </section>

      <section className={styles.pathSection}>
        <header className={styles.pathHeader}>
          <h2 className={styles.sectionTitle}>The path</h2>
          <p className={styles.sectionHint}>
            {activeProject ? (
              <>Each step works on the project you selected above, <strong>{activeProject.name}</strong>. Jump in anywhere; the order is a guide, not a gate.</>
            ) : (
              <>Each step works on the project you selected above. Jump in anywhere; the order is a guide, not a gate.</>
            )}
          </p>
        </header>
        <ol className={styles.pathGrid}>
          {STEPS.map((step) => (
            <li key={step.href}>
              <Link href={step.href} className={styles.stepCard}>
                <span className={styles.stepHead}>
                  <span className={styles.stepEyebrow}>
                    <span className={styles.stepNum}>{step.n}</span>
                    <span className={styles.stepVerb}>{step.verb}</span>
                  </span>
                  <span className={styles.stepTitle}>{step.title}</span>
                </span>
                <span className={styles.cardBody}>{step.body}</span>
                <span className={styles.stepArrow} aria-hidden="true">→</span>
              </Link>
            </li>
          ))}
        </ol>
      </section>

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

/**
 * The single "Start here" action plus quiet side-doors for people who
 * arrive mid-stream (already have colors, already have a board). One
 * dominant button; the rest are text links so the hierarchy is obvious.
 */
function HeroActions({ signedIn, isEmptyAuthedAccount, activeProject, onNewProject }) {
  let primary;
  let sideDoors;

  if (isEmptyAuthedAccount) {
    primary = { label: "Start a project", onClick: onNewProject };
    sideDoors = [{ label: "Or import a Pinterest board", href: "/import" }];
  } else if (signedIn) {
    primary = {
      label: activeProject ? `Open ${activeProject.name}` : "Open the studio",
      href: "/brand",
    };
    sideDoors = [
      { label: "Browse your library", href: "/library" },
      { label: "Import a board", href: "/import" },
    ];
  } else {
    primary = { label: "Open the sample studio", href: "/brand" };
    sideDoors = [
      { label: "Have a Pinterest board? Import it", href: "/import" },
      { label: "Already have colors? Start there", href: "/colors" },
    ];
  }

  return (
    <div className={styles.heroCtas}>
      {primary.href ? (
        <Link href={primary.href} className={styles.heroPrimary}>
          {primary.label}
          <span className={styles.heroArrow} aria-hidden="true">→</span>
        </Link>
      ) : (
        <button type="button" className={styles.heroPrimary} onClick={primary.onClick}>
          {primary.label}
          <span className={styles.heroArrow} aria-hidden="true">→</span>
        </button>
      )}
      <ul className={styles.sideDoors}>
        {sideDoors.map((d) => (
          <li key={d.href}>
            <Link href={d.href} className={styles.sideDoor}>{d.label}</Link>
          </li>
        ))}
      </ul>
    </div>
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
        <p className={styles.modalHint}>Empty workspace. Add a Pinterest board or upload images and the project's own brand world starts to take shape. Palettes extract on their own as pins land.</p>
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
