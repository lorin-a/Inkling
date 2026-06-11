"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import styles from "./StageNav.module.css";

/**
 * The process made visible: Gather → Play → Build (the locked three moments).
 * Wherever you are, you can see the whole arc, which moment you're in, and what
 * it's for — so the next move is never a mystery (Lorin: "not enough hierarchy to
 * understand what to do next").
 *
 * Play (the board) absorbs the old Organize + Narrow: you arrange, then *carve* a
 * direction out of the everything board. The carve action lives as a Play sub-step
 * (mirroring Gather's Color / Type), triggered via `onNarrow`. Build is Compose.
 */
// The one source of truth for the in-app process, matching the home page's three
// moves — so there is exactly one definition of the flow and no nav can drift.
export const STAGES = [
  { key: "gather", label: "Gather", sub: "react & pull", href: "/recognize", match: ["/recognize", "/type"], blurb: "React to your inspiration and pull what resonates." },
  { key: "play", label: "Play", sub: "arrange & carve", href: "/moodboard", match: ["/moodboard"], blurb: "Arrange it on your board, then carve a few directions out of the overwhelm." },
  { key: "build", label: "Build", sub: "make the brand", href: "/brand", match: ["/brand"], blurb: "Shuffle a direction into a brand you can ship." },
];

export default function StageNav({ onNarrow, carving }) {
  const pathname = usePathname();

  // Carving happens on the board, so the thread stays on Play throughout it.
  const activeKey = carving
    ? "play"
    : STAGES.find((s) => s.match?.some((m) => pathname === m))?.key || null;
  const activeIndex = STAGES.findIndex((s) => s.key === activeKey);

  return (
    <nav className={styles.nav} aria-label="Your process">
      {STAGES.map((s, i) => {
        const active = s.key === activeKey;
        const upcoming = activeIndex >= 0 && i > activeIndex;
        const cls = `${styles.stage} ${active ? styles.active : ""} ${upcoming ? styles.upcoming : ""}`;
        return (
          <span className={styles.item} key={s.key}>
            {i > 0 && <span className={styles.sep} aria-hidden="true">›</span>}
            <Link href={s.href} className={cls} aria-current={active ? "step" : undefined}>
              <span className={styles.label}>{s.label}</span>
              {active && s.sub && <span className={styles.sub}>{s.sub}</span>}
            </Link>
          </span>
        );
      })}

      {activeKey === "gather" && (
        <span className={styles.subnav}>
          <Link href="/recognize" className={styles.subLink} aria-current={pathname === "/recognize" ? "page" : undefined}>Color</Link>
          <Link href="/type" className={styles.subLink} aria-current={pathname === "/type" ? "page" : undefined}>Type</Link>
        </span>
      )}
      {activeKey === "play" && onNarrow && !carving && (
        <span className={styles.subnav}>
          <button type="button" className={styles.subLink} onClick={onNarrow}>Carve a direction →</button>
        </span>
      )}
    </nav>
  );
}
