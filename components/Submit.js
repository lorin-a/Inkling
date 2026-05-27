"use client";

import { useEffect, useRef, useState } from "react";
import styles from "./Submit.module.css";

const RESOURCE_CATEGORIES = [
  { value: "foundries", label: "Type foundry" },
  { value: "color", label: "Color tool" },
  { value: "inspiration", label: "Inspiration" },
  { value: "accessibility", label: "Accessibility" },
  { value: "other", label: "Other" },
];
const FEEDBACK_TOPICS = [
  { value: "feature", label: "Feature request" },
  { value: "bug", label: "Something’s broken" },
  { value: "other", label: "Other" },
];

/**
 * One submit surface for both community inputs: a resource suggestion (goes
 * to the review queue, publishes to /resources on approval) and feedback /
 * feature requests (read-only for the admin). Self-contained trigger +
 * dialog; drop it anywhere. Honeypot + length caps live server-side too.
 */
export default function Submit({ kind, trigger, className, defaultCategory = "foundries" }) {
  const [open, setOpen] = useState(false);
  const [state, setState] = useState({ status: "idle", error: null }); // idle | sending | done | error
  const firstFieldRef = useRef(null);
  const isResource = kind === "resource";

  useEffect(() => {
    if (!open) return;
    function onKey(e) { if (e.key === "Escape") close(); }
    window.addEventListener("keydown", onKey);
    firstFieldRef.current?.focus();
    return () => window.removeEventListener("keydown", onKey);
  }, [open]);

  function close() {
    setOpen(false);
    // Reset after the close transition so the form is fresh next time.
    setTimeout(() => setState({ status: "idle", error: null }), 200);
  }

  async function onSubmit(e) {
    e.preventDefault();
    const form = e.currentTarget;
    const fd = new FormData(form);
    if (fd.get("_hp")) return; // honeypot tripped
    const body = isResource
      ? {
          kind, _hp: "",
          name: fd.get("name"),
          url: fd.get("url"),
          category: fd.get("category"),
          note: fd.get("note"),
          email: fd.get("email"),
        }
      : {
          kind, _hp: "",
          topic: fd.get("topic"),
          message: fd.get("message"),
          email: fd.get("email"),
        };
    setState({ status: "sending", error: null });
    try {
      const res = await fetch("/api/submissions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Something went wrong.");
      setState({ status: "done", error: null });
    } catch (err) {
      setState({ status: "error", error: err.message });
    }
  }

  return (
    <>
      <button type="button" className={className} onClick={() => setOpen(true)}>
        {trigger}
      </button>

      {open && (
        <div className={styles.overlay} onMouseDown={close}>
          <div
            className={styles.dialog}
            role="dialog"
            aria-modal="true"
            aria-label={isResource ? "Suggest a resource" : "Send feedback"}
            onMouseDown={(e) => e.stopPropagation()}
          >
            <button type="button" className={styles.close} onClick={close} aria-label="Close">×</button>

            {state.status === "done" ? (
              <div className={styles.done}>
                <h2 className={styles.title}>Thank you</h2>
                <p className={styles.doneText}>
                  {isResource
                    ? "Your suggestion is in the queue. If it’s a fit, it’ll show up on Resources."
                    : "Your note is in. It genuinely helps shape what gets built next."}
                </p>
                <button type="button" className={styles.primary} onClick={close}>Done</button>
              </div>
            ) : (
              <form onSubmit={onSubmit} className={styles.form}>
                <h2 className={styles.title}>{isResource ? "Suggest a resource" : "Send feedback"}</h2>
                <p className={styles.sub}>
                  {isResource
                    ? "A foundry, tool, or reference worth sharing. Reviewed before it appears."
                    : "A feature you want, something that broke, or anything on your mind."}
                </p>

                {/* Honeypot — visually hidden, off the tab order. */}
                <input type="text" name="_hp" tabIndex={-1} autoComplete="off" className={styles.hp} aria-hidden="true" />

                {isResource ? (
                  <>
                    <label className={styles.field}>
                      <span className={styles.label}>Name</span>
                      <input ref={firstFieldRef} name="name" required maxLength={80} className={styles.input} placeholder="e.g. Velvetyne" />
                    </label>
                    <label className={styles.field}>
                      <span className={styles.label}>Link</span>
                      <input name="url" type="url" required maxLength={300} className={styles.input} placeholder="https://" />
                    </label>
                    <label className={styles.field}>
                      <span className={styles.label}>Category</span>
                      <select name="category" defaultValue={defaultCategory} className={styles.input}>
                        {RESOURCE_CATEGORIES.map((c) => <option key={c.value} value={c.value}>{c.label}</option>)}
                      </select>
                    </label>
                    <label className={styles.field}>
                      <span className={styles.label}>Note <span className={styles.opt}>(optional)</span></span>
                      <input name="note" maxLength={200} className={styles.input} placeholder="One line on what it’s good for" />
                    </label>
                  </>
                ) : (
                  <>
                    <label className={styles.field}>
                      <span className={styles.label}>Topic</span>
                      <select ref={firstFieldRef} name="topic" defaultValue="feature" className={styles.input}>
                        {FEEDBACK_TOPICS.map((t) => <option key={t.value} value={t.value}>{t.label}</option>)}
                      </select>
                    </label>
                    <label className={styles.field}>
                      <span className={styles.label}>Message</span>
                      <textarea name="message" required maxLength={2000} rows={5} className={styles.textarea} placeholder="Tell me what you’re thinking…" />
                    </label>
                  </>
                )}

                <label className={styles.field}>
                  <span className={styles.label}>Email <span className={styles.opt}>(optional, if you want a reply)</span></span>
                  <input name="email" type="email" maxLength={200} className={styles.input} placeholder="you@example.com" />
                </label>

                {state.status === "error" && <p className={styles.error}>{state.error}</p>}

                <div className={styles.actions}>
                  <button type="button" className={styles.ghost} onClick={close}>Cancel</button>
                  <button type="submit" className={styles.primary} disabled={state.status === "sending"}>
                    {state.status === "sending" ? "Sending…" : isResource ? "Submit for review" : "Send"}
                  </button>
                </div>
              </form>
            )}
          </div>
        </div>
      )}
    </>
  );
}
