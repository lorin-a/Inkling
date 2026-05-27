import Link from "next/link";
import { getAdminSession } from "../../lib/admin";
import { listSubmissions } from "../../lib/db/submissions";
import ReviewList from "../../components/ReviewList";
import styles from "./page.module.css";

export const metadata = { title: "Review — Moodbuilder" };
export const dynamic = "force-dynamic";

/**
 * Admin-only review queue for community submissions. Approving a resource
 * publishes it to /resources; feedback is read-and-archive. Gated by the
 * session email against the admin allowlist (lib/admin).
 */
export default async function ReviewPage() {
  const { isAdmin, email } = await getAdminSession();

  return (
    <div className={styles.page}>
      <header className={styles.bar}>
        <Link href="/" className={styles.back}>← Moodbuilder</Link>
        <div className={styles.barTitle}>Review</div>
      </header>
      <main className={styles.main}>
        {!isAdmin ? (
          <div className={styles.gate}>
            <h1 className={styles.gateTitle}>Reviewers only</h1>
            <p className={styles.gateText}>
              {email
                ? "This account isn’t on the reviewer list."
                : "Sign in with a reviewer account to see the submission queue."}
            </p>
            {!email && <Link href="/login" className={styles.gateLink}>Sign in →</Link>}
          </div>
        ) : (
          <ReviewList initial={await listSubmissions({})} />
        )}
      </main>
    </div>
  );
}
