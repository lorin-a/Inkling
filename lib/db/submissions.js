import { sql } from "../db";
import { nanoid } from "nanoid";

/**
 * Community submissions store: resource suggestions + feedback. Anyone can
 * create; an admin lists/reviews. Approved resources are read by /resources.
 */

export async function createSubmission({ kind, payload, submitterEmail = null }) {
  const id = nanoid(16);
  await sql`
    INSERT INTO submissions (id, kind, payload, submitter_email)
    VALUES (${id}, ${kind}, ${JSON.stringify(payload)}, ${submitterEmail})
  `;
  return { id };
}

/** Review queue. Optionally filter by status; pending-first, newest-first. */
export async function listSubmissions({ status } = {}) {
  const rows = status
    ? await sql`SELECT * FROM submissions WHERE status = ${status} ORDER BY created_at DESC`
    : await sql`
        SELECT * FROM submissions
        ORDER BY (status = 'pending') DESC, created_at DESC
      `;
  return rows;
}

export async function setSubmissionStatus({ id, status }) {
  const rows = await sql`
    UPDATE submissions
    SET status = ${status}, reviewed_at = now()
    WHERE id = ${id}
    RETURNING id, kind, status
  `;
  return rows[0] || null;
}

/** Approved resource submissions, shaped like the static resources items. */
export async function listApprovedResources() {
  const rows = await sql`
    SELECT payload FROM submissions
    WHERE kind = 'resource' AND status = 'approved'
    ORDER BY reviewed_at DESC
  `;
  return rows.map((r) => r.payload);
}

/** How many submissions are waiting — for the review-page badge. */
export async function countPending() {
  const rows = await sql`SELECT count(*)::int AS n FROM submissions WHERE status = 'pending'`;
  return rows[0]?.n ?? 0;
}
