"use client";

import { useState } from "react";
import styles from "./ReviewList.module.css";

/**
 * Admin review queue. Pending first. Resources get Approve / Reject (approve
 * publishes to /resources); feedback gets Archive. Actions PATCH the
 * submission and update the row in place.
 */
export default function ReviewList({ initial }) {
  const [items, setItems] = useState(initial);
  const [busy, setBusy] = useState(null);

  async function act(id, status) {
    setBusy(id);
    try {
      const res = await fetch(`/api/submissions/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status }),
      });
      if (res.ok) {
        setItems((prev) => prev.map((it) => (it.id === id ? { ...it, status } : it)));
      }
    } finally {
      setBusy(null);
    }
  }

  const pending = items.filter((i) => i.status === "pending");
  const handled = items.filter((i) => i.status !== "pending");

  if (items.length === 0) {
    return <p className={styles.empty}>Nothing submitted yet.</p>;
  }

  return (
    <div className={styles.wrap}>
      <section>
        <h2 className={styles.sectionTitle}>Pending <span className={styles.count}>{pending.length}</span></h2>
        {pending.length === 0 ? (
          <p className={styles.empty}>Queue’s clear.</p>
        ) : (
          <ul className={styles.list}>
            {pending.map((it) => <Row key={it.id} it={it} busy={busy === it.id} act={act} />)}
          </ul>
        )}
      </section>

      {handled.length > 0 && (
        <section>
          <h2 className={styles.sectionTitle}>Reviewed <span className={styles.count}>{handled.length}</span></h2>
          <ul className={styles.list}>
            {handled.map((it) => <Row key={it.id} it={it} busy={busy === it.id} act={act} reviewed />)}
          </ul>
        </section>
      )}
    </div>
  );
}

function Row({ it, busy, act, reviewed }) {
  const p = it.payload || {};
  const isResource = it.kind === "resource";
  const when = new Date(it.created_at).toLocaleDateString(undefined, { month: "short", day: "numeric" });

  return (
    <li className={`${styles.row} ${reviewed ? styles.rowReviewed : ""}`}>
      <div className={styles.meta}>
        <span className={`${styles.kind} ${isResource ? styles.kindResource : styles.kindFeedback}`}>
          {isResource ? "Resource" : "Feedback"}
        </span>
        {reviewed && <span className={`${styles.status} ${styles["s_" + it.status]}`}>{it.status}</span>}
        <span className={styles.when}>{when}</span>
      </div>

      <div className={styles.body}>
        {isResource ? (
          <>
            <a href={p.url} target="_blank" rel="noopener noreferrer" className={styles.resName}>
              {p.name} <span className={styles.resArrow}>↗</span>
            </a>
            <span className={styles.resMeta}>{p.category}{p.note ? ` · ${p.note}` : ""}</span>
            <span className={styles.resUrl}>{p.url}</span>
          </>
        ) : (
          <>
            <span className={styles.fbTopic}>{p.topic}</span>
            <p className={styles.fbMsg}>{p.message}</p>
          </>
        )}
        {it.submitter_email && <span className={styles.from}>from {it.submitter_email}</span>}
      </div>

      <div className={styles.actions}>
        {!reviewed && isResource && (
          <>
            <button type="button" className={styles.approve} disabled={busy} onClick={() => act(it.id, "approved")}>Approve</button>
            <button type="button" className={styles.reject} disabled={busy} onClick={() => act(it.id, "rejected")}>Reject</button>
          </>
        )}
        {!reviewed && !isResource && (
          <button type="button" className={styles.archive} disabled={busy} onClick={() => act(it.id, "archived")}>Archive</button>
        )}
        {reviewed && (
          <button type="button" className={styles.restore} disabled={busy} onClick={() => act(it.id, "pending")}>Restore</button>
        )}
      </div>
    </li>
  );
}
