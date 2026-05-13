import Link from "next/link";
import styles from "./page.module.css";

export default function Home() {
  return (
    <main className={styles.main}>
      <header className={styles.header}>
        <p className={styles.eyebrow}>Moodbuilder</p>
        <h1 className={styles.title}>A studio for assembling brand moods. Color, type, marks, gradients, image.</h1>
      </header>
      <nav className={styles.nav}>
        <Link href="/colors" className={styles.card}>
          <span className={styles.cardEyebrow}>01 — Inspiration</span>
          <span className={styles.cardTitle}>Colors</span>
          <span className={styles.cardBody}>
            The wall of swatches pulled from inspiration, plus curated row palettes.
          </span>
        </Link>
        <Link href="/brand" className={styles.card}>
          <span className={styles.cardEyebrow}>02 — Application</span>
          <span className={styles.cardTitle}>Brand</span>
          <span className={styles.cardBody}>
            Whelm brand style page, light and dark variants. Live preview surface for palette shuffles.
          </span>
        </Link>
        <Link href="/gradients" className={styles.card}>
          <span className={styles.cardEyebrow}>03 — Composition</span>
          <span className={styles.cardTitle}>Gradients</span>
          <span className={styles.cardBody}>
            Build gradients from any colors in the pool. Drag angle, drag stops, copy CSS.
          </span>
        </Link>
        <Link href="/import" className={styles.card}>
          <span className={styles.cardEyebrow}>04 — Inspiration</span>
          <span className={styles.cardTitle}>Pinterest import</span>
          <span className={styles.cardBody}>
            Capture an entire Pinterest board with source credit preserved. Drag, click, drop.
          </span>
        </Link>
        <Link href="/library" className={styles.card}>
          <span className={styles.cardEyebrow}>05 — Library</span>
          <span className={styles.cardTitle}>Pin library</span>
          <span className={styles.cardBody}>
            Every pin you've imported, in a masonry grid. Source credit always visible. Filter by domain, title, pinner.
          </span>
        </Link>
      </nav>
    </main>
  );
}
