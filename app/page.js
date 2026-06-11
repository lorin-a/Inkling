"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { signOut } from "next-auth/react";
import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import { apiFetch } from "../lib/api/client";
import { resetToSample, hasChosenStart, getStartMode, startOwn, seedSample } from "../lib/storage/localStore";
import Submit from "../components/Submit";
import BrandShuffle from "../components/BrandShuffle";
import styles from "./page.module.css";

// [LORIN] Buy Me a Coffee URL once it exists; empty hides the link.
const COFFEE_URL = "";

// The three moves — the spine, in the brand's language.
const MOVES = [
  { no: "01", label: "Gather", href: "/recognize", blurb: "React to everything you’ve saved. Pull the colours, type, and images that ring true — your taste, gathered." },
  { no: "02", label: "Play", href: "/moodboard", blurb: "Arrange it on your board. Play, annotate, and carve a few clear directions out of the overwhelm." },
  { no: "03", label: "Build", href: "/brand", blurb: "Shuffle a direction into a brand — a palette, a wordmark, a book, an export. Yours to ship." },
];

export default function Home() {
  const [projects, setProjects] = useState(null);
  const [activeSlug, setActiveSlug] = useState(null);
  const [creating, setCreating] = useState(false);
  const [error, setError] = useState(null);
  const [session, setSession] = useState(null);

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

  // First-run: signed-out visitors who haven't walked through the door yet.
  // `chosen` starts null (unknown) to avoid flashing the wrong UI.
  const [chosen, setChosen] = useState(null);
  const [startMode, setStartMode] = useState(null);
  useEffect(() => { setChosen(hasChosenStart()); setStartMode(getStartMode()); }, []);

  // The two doors. Both start a CLEAN state, then send you where the work is.
  function beginOwn() { startOwn(); window.location.href = "/import"; }            // your own → bring inspiration in
  function beginSample() { seedSample(); window.location.href = "/recognize"; }   // sample → into the (soon: guided) arc

  // Hero entrance — the words rise in, then the brand card composes itself (its own
  // GSAP). The page should feel like it's being made, not loaded.
  const heroLeftRef = useRef(null);
  useEffect(() => {
    if (!heroLeftRef.current) return;
    const ctx = gsap.context(() => {
      gsap.from(heroLeftRef.current.children, { y: 22, opacity: 0, duration: 0.7, stagger: 0.09, ease: "power3.out" });
    }, heroLeftRef);
    return () => ctx.revert();
  }, []);

  // Sections reveal as you scroll — the page keeps composing itself as you move.
  const pageRef = useRef(null);
  useEffect(() => {
    if (!pageRef.current) return;
    gsap.registerPlugin(ScrollTrigger);
    const ctx = gsap.context(() => {
      gsap.utils.toArray("[data-reveal]").forEach((el) => {
        gsap.from(el, { y: 26, opacity: 0, duration: 0.7, ease: "power3.out", scrollTrigger: { trigger: el, start: "top 88%" } });
      });
      gsap.utils.toArray("[data-stagger]").forEach((el) => {
        gsap.from(el.children, { y: 22, opacity: 0, duration: 0.6, stagger: 0.08, ease: "power3.out", scrollTrigger: { trigger: el, start: "top 86%" } });
      });
    }, pageRef);
    return () => ctx.revert();
  }, [projects]);

  async function selectProject(slug) {
    if (slug === activeSlug) return;
    try {
      await apiFetch("/api/projects/active", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ slug }),
      });
      setActiveSlug(slug);
    } catch (e) { setError(e.message); }
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
    } catch (e) { setError(e.message); }
  }

  const activeProject = projects?.find((p) => p.slug === activeSlug);
  const signedIn = !!session?.user;
  const isEmptyAuthedAccount = signedIn && projects !== null && projects.length === 0;
  const firstRun = !signedIn && chosen === false; // hasn't walked the door yet

  return (
    <main className={styles.page} ref={pageRef}>
      <span className={styles.grain} aria-hidden="true" />

      {/* ── masthead ───────────────────────────────────────────── */}
      <header className={styles.mast}>
        <div className={styles.mastL}>
          <span className={styles.wm}>inkling<span className={styles.dot}>.</span></span>
          <span className={styles.ed}>No.&nbsp;01 · Est.&nbsp;2026</span>
        </div>
        <nav className={styles.mastNav} aria-label="Primary">
          <a href="#how">How it works</a>
          <Link href="/resources">Resources</Link>
          {signedIn ? (
            <button type="button" className={styles.mastAuth} onClick={() => signOut({ callbackUrl: "/login" })}>Sign out</button>
          ) : (
            <Link href="/login" className={styles.mastAuth}>Sign in →</Link>
          )}
        </nav>
      </header>

      {!signedIn && chosen && (
        <div className={styles.banner} role="status">
          <span className={styles.bannerK}>{startMode === "sample" ? "Sample studio" : "Your studio"}</span>
          <span className={styles.bannerT}>Everything you change saves to this browser only.</span>
          <button
            type="button"
            className={styles.bannerReset}
            onClick={() => {
              if (confirm("Reset this studio? This clears every change you’ve made in this browser.")) {
                resetToSample();
                window.location.reload();
              }
            }}
          >
            Reset
          </button>
          <Link href="/login" className={styles.bannerCta}>Sign in to keep it →</Link>
        </div>
      )}

      {/* ── first-run onboarding (the door) OR the marketing hero ─ */}
      {firstRun ? (
        <section className={styles.onboard}>
          <p className={styles.eyebrow}><span className={styles.sq} aria-hidden="true" />Welcome · first visit</p>
          <h1 className={styles.onboardH}>You know it when you <span className={styles.it}>see it.</span></h1>
          <p className={styles.onboardLede}>
            Inkling turns everything you’ve saved — your colours, your type, your taste — into a brand
            you can ship. Two ways to begin:
          </p>
          <div className={styles.doors2}>
            <button type="button" className={`${styles.door2} ${styles.door2own}`} onClick={beginOwn}>
              <span className={styles.door2tag}>Do it for real</span>
              <span className={styles.door2title}>Bring your inspiration in <span className={styles.door2arr} aria-hidden="true">→</span></span>
              <span className={styles.door2desc}>Import your Pinterest, screenshots, or links into a clean project that’s yours.</span>
            </button>
            <button type="button" className={styles.door2} onClick={beginSample}>
              <span className={styles.door2tag}>Learn the arc</span>
              <span className={styles.door2title}>Explore a sample <span className={styles.door2arr} aria-hidden="true">→</span></span>
              <span className={styles.door2desc}>Walk Gather → Play → Build on a ready-made board, then start your own.</span>
            </button>
          </div>
        </section>
      ) : (
      <section className={styles.hero}>
        <div className={styles.heroL} ref={heroLeftRef}>
          <p className={styles.eyebrow}><span className={styles.sq} aria-hidden="true" />A studio for trusting your eye<span className={styles.tag}>New</span></p>
          <h1 className={styles.h1}>You know it<br />when you <span className={styles.it}>see it.</span></h1>
          <p className={styles.lede}>
            Inkling turns everything you’ve saved — your colours, your type, your taste — into a brand
            you can ship. You stay the author, start to finish.
          </p>
          <HeroActions
            signedIn={signedIn}
            firstRun={firstRun}
            isEmptyAuthedAccount={isEmptyAuthedAccount}
            activeProject={activeProject}
            onNewProject={() => setCreating(true)}
            onBeginOwn={beginOwn}
            onBeginSample={beginSample}
          />
        </div>

        <div className={styles.heroR}>
          <BrandShuffle name="Coastline" tagline="where the tide turns" />
        </div>
      </section>
      )}

      {/* ── how it works — the spine ───────────────────────────── */}
      <section className={styles.how} id="how">
        <div className={styles.sectionHead} data-reveal>
          <h2 className={styles.sectionH}>Three moves, one studio.</h2>
        </div>
        <ol className={styles.index} data-stagger>
          {MOVES.map((m) => (
            <li key={m.no}>
              <Link href={m.href} className={styles.ix}>
                <span className={styles.ixNo}>{m.no}</span>
                <span className={styles.ixLb}>{m.label}</span>
                <span className={styles.ixDs}>{m.blurb}</span>
                <span className={styles.ixArr} aria-hidden="true">→</span>
              </Link>
            </li>
          ))}
        </ol>
      </section>

      {/* ── your project (hidden during first-run — no project yet) ── */}
      {!firstRun && (
      <section className={styles.projects}>
        <div className={styles.sectionHead} data-reveal>
          <h2 className={styles.sectionH}>
            {!signedIn
              ? (startMode === "sample" ? "A sample to play with." : "Your studio.")
              : isEmptyAuthedAccount
                ? "Start your first direction."
                : "Pick a direction to work in."}
          </h2>
        </div>

        <div className={styles.projGrid} data-stagger>
          {projects === null ? (
            <p className={styles.loading}>Loading…</p>
          ) : (
            <>
              {projects.map((p) => {
                const isActive = p.slug === activeSlug;
                return (
                  <button
                    key={p.slug}
                    type="button"
                    className={`${styles.projCard} ${isActive ? styles.projCardOn : ""}`}
                    onClick={() => selectProject(p.slug)}
                    aria-pressed={isActive}
                  >
                    {p.swatches?.length > 0 && (
                      <span className={styles.projSwatches} aria-hidden="true">
                        {p.swatches.slice(0, 6).map((hex, i) => <span key={`${hex}-${i}`} style={{ background: hex }} />)}
                      </span>
                    )}
                    <span className={styles.projName}>
                      {p.wordmark || p.name || p.slug}
                      {!signedIn && startMode === "sample" && <span className={styles.projTag}>Sample</span>}
                    </span>
                    <span className={styles.projFoot}>
                      <span className={styles.projMeta}>{p.pins != null ? `${p.pins} pins` : "—"}</span>
                      <span className={styles.projSel}>{isActive ? "● Selected" : "Select →"}</span>
                    </span>
                  </button>
                );
              })}
              {signedIn ? (
                <button type="button" className={styles.projNew} onClick={() => setCreating(true)}>
                  <span className={styles.projNewPlus}>+</span>
                  <span>Start a new direction</span>
                </button>
              ) : (
                <Link href="/login" className={styles.projNew}>
                  <span className={styles.projNewPlus}>+</span>
                  <span>Sign in to start more</span>
                </Link>
              )}
            </>
          )}
        </div>
        {error && <p className={styles.error}>{error}</p>}
      </section>
      )}

      {/* ── colophon ───────────────────────────────────────────── */}
      <footer className={styles.colophon}>
        <div className={styles.colTop}>
          <span className={styles.wm}>inkling<span className={styles.dot}>.</span></span>
          {/* [LORIN TO WRITE] one line in your voice: who you are, why this exists. */}
          <p className={styles.colLead}>[LORIN TO WRITE: one line, your voice — who you are, why Inkling exists.]</p>
        </div>
        <div className={styles.colMeta}>
          <span>A project by Lorin Anderberg · Free for now · © 2026, all rights reserved.</span>
          <span className={styles.colLinks}>
            <Link href="/resources" className={styles.colLink}>Resources</Link>
            <span aria-hidden="true">·</span>
            <Submit kind="feedback" className={styles.colLink} trigger="Send feedback" />
            {COFFEE_URL && (<><span aria-hidden="true">·</span><a className={styles.colLink} href={COFFEE_URL} target="_blank" rel="noopener noreferrer">Buy me a coffee</a></>)}
          </span>
        </div>
      </footer>

      {creating && <NewProjectModal onClose={() => setCreating(false)} onCreate={createProject} error={error} />}
    </main>
  );
}

function HeroActions({ signedIn, firstRun, isEmptyAuthedAccount, activeProject, onNewProject, onBeginOwn, onBeginSample }) {
  let primary, doors;
  if (firstRun) {
    // The door, led by the sell: bring your OWN inspiration in is the hero move.
    primary = { label: "Bring your inspiration in", onClick: onBeginOwn };
    doors = [{ label: "Explore a sample first", onClick: onBeginSample }];
  } else if (isEmptyAuthedAccount) {
    primary = { label: "Start a direction", onClick: onNewProject };
    doors = [{ label: "Import a Pinterest board", href: "/import" }];
  } else if (signedIn) {
    primary = { label: activeProject ? `Open ${activeProject.name}` : "Open the studio", href: "/brand" };
    doors = [{ label: "Your library", href: "/library" }, { label: "Import a board", href: "/import" }];
  } else {
    primary = { label: "Open the studio", href: "/brand" };
    doors = [{ label: "Import inspiration", href: "/import" }, { label: "Start from colours", href: "/colors" }];
  }
  return (
    <div className={styles.cta}>
      {primary.href ? (
        <Link href={primary.href} className={styles.go}>{primary.label} <span className={styles.goArr} aria-hidden="true">→</span></Link>
      ) : (
        <button type="button" className={styles.go} onClick={primary.onClick}>{primary.label} <span className={styles.goArr} aria-hidden="true">→</span></button>
      )}
      <ul className={styles.doors}>
        {doors.map((d) => (
          <li key={d.label}>
            {d.href
              ? <Link href={d.href} className={styles.door}>{d.label}</Link>
              : <button type="button" className={styles.door} onClick={d.onClick}>{d.label}</button>}
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
    try { await onCreate(name.trim()); } finally { setSubmitting(false); }
  }

  return (
    <div className={styles.modalBack} onClick={onClose}>
      <form className={styles.modal} onClick={(e) => e.stopPropagation()} onSubmit={submit}>
        <button type="button" className={styles.modalX} onClick={onClose} aria-label="Close">×</button>
        <span className={styles.sectionK}>New direction</span>
        <h2 className={styles.modalH}>Name it.</h2>
        <p className={styles.modalHint}>An empty studio. Add a board or upload images and its world starts to take shape; palettes pull on their own.</p>
        <label className={styles.field}>
          <span className={styles.fieldLabel}>Project name</span>
          <input className={styles.input} value={name} onChange={(e) => setName(e.target.value)} placeholder="Sage Lab, March mood…" autoFocus maxLength={80} />
          <span className={styles.fieldHint}>Slug: <code>{slugify(name) || "—"}</code></span>
        </label>
        {error && <p className={styles.error}>{error}</p>}
        <div className={styles.modalActions}>
          <button type="button" className={styles.modalCancel} onClick={onClose}>Cancel</button>
          <button type="submit" className={styles.go} disabled={!name.trim() || submitting}>{submitting ? "Creating…" : "Create →"}</button>
        </div>
      </form>
    </div>
  );
}

function slugify(s) {
  return String(s || "").toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "").slice(0, 48);
}
