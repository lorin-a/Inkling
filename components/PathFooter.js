"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { adjacentSteps } from "../lib/steps";
import styles from "./PathFooter.module.css";

/**
 * The "what’s next?" cue at the foot of every step page. Answers the question
 * where it’s actually asked — at the bottom, once you’ve finished the step —
 * instead of forcing a trip back home to find the next tool. Reads the path
 * order from lib/steps, so prev/next can never drift from the home path.
 *
 * Renders nothing on routes outside the path (e.g. /login, /probe).
 */
export default function PathFooter() {
  const pathname = usePathname();
  const { prev, next } = adjacentSteps(pathname);
  if (!prev && !next) return null;

  return (
    <nav className={styles.footer} aria-label="Move through the path">
      {prev ? (
        <Link href={prev.href} className={`${styles.cue} ${styles.prev}`}>
          <span className={styles.dir} aria-hidden="true">←</span>
          <span className={styles.text}>
            <span className={styles.verb}>{prev.verb}</span>
            <span className={styles.title}>{prev.title}</span>
          </span>
        </Link>
      ) : (
        <span aria-hidden="true" />
      )}

      {next ? (
        <Link href={next.href} className={`${styles.cue} ${styles.next}`}>
          <span className={styles.text}>
            <span className={styles.verb}>{next.verb}</span>
            <span className={styles.title}>{next.title}</span>
          </span>
          <span className={styles.dir} aria-hidden="true">→</span>
        </Link>
      ) : (
        // Last step — point back to the project instead of a dead end.
        <Link href="/" className={`${styles.cue} ${styles.next}`}>
          <span className={styles.text}>
            <span className={styles.verb}>Back to</span>
            <span className={styles.title}>your project</span>
          </span>
          <span className={styles.dir} aria-hidden="true">→</span>
        </Link>
      )}
    </nav>
  );
}
