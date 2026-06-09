"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import styles from "./StageNav.module.css";

/**
 * The process made visible: Gather → Organize → Narrow → Compose. Wherever you are,
 * you can see the whole arc, which stage you're in, and what each one is for — so the
 * next move is never a mystery (Lorin: "not enough hierarchy to understand what to do
 * next"). Replaces the old flat Color/Type/Board nav.
 *
 * Most stages are routes; Narrow is the act of pulling directions out of the everything
 * board, so on the board it runs `onNarrow` (start carve), and from elsewhere it routes
 * to the board first. Gather holds the two ways to gather (Color, Type) as sub-steps.
 */
// The one source of truth for the process. StageNav renders it as the in-app
// stepper; the home page renders it as the entry grid — so there is exactly one
// definition of the flow, and no second navigation can drift from it.
export const STAGES = [
  { key: "gather", label: "Gather", sub: "react & pull", href: "/recognize", match: ["/recognize", "/type"], blurb: "React to your inspiration and pull what resonates." },
  { key: "organize", label: "Organize", sub: "sort & play", href: "/moodboard", match: ["/moodboard"], blurb: "Arrange it on your board; the mess resolves into order." },
  { key: "narrow", label: "Narrow", sub: "pull directions", narrow: true, href: "/moodboard", blurb: "Pull a few directions out of everything." },
  { key: "compose", label: "Compose", sub: "make the brand", href: "/brand", match: ["/brand"], blurb: "Shuffle a direction into a brand you can see and share." },
];

export default function StageNav({ onNarrow, carving }) {
  const pathname = usePathname();
  const router = useRouter();

  const activeKey = carving
    ? "narrow"
    : STAGES.find((s) => s.match?.some((m) => pathname === m))?.key || null;
  const activeIndex = STAGES.findIndex((s) => s.key === activeKey);

  const handleNarrow = () => (onNarrow ? onNarrow() : router.push("/moodboard"));

  return (
    <nav className={styles.nav} aria-label="Your process">
      {STAGES.map((s, i) => {
        const active = s.key === activeKey;
        const upcoming = activeIndex >= 0 && i > activeIndex;
        const cls = `${styles.stage} ${active ? styles.active : ""} ${upcoming ? styles.upcoming : ""}`;
        // Only the active stage shows its purpose; the others reserve the line so the
        // row stays aligned but reads calm (one subtitle, not four).
        const inner = (
          <>
            <span className={styles.label}>{s.label}</span>
            {active && s.sub && <span className={styles.sub}>{s.sub}</span>}
          </>
        );
        return (
          <span className={styles.item} key={s.key}>
            {i > 0 && <span className={styles.sep} aria-hidden="true">›</span>}
            {s.narrow ? (
              <button type="button" className={cls} onClick={handleNarrow} aria-current={active ? "step" : undefined}>
                {inner}
              </button>
            ) : (
              <Link href={s.href} className={cls} aria-current={active ? "step" : undefined}>
                {inner}
              </Link>
            )}
          </span>
        );
      })}

      {activeKey === "gather" && (
        <span className={styles.subnav}>
          <Link href="/recognize" className={styles.subLink} aria-current={pathname === "/recognize" ? "page" : undefined}>Color</Link>
          <Link href="/type" className={styles.subLink} aria-current={pathname === "/type" ? "page" : undefined}>Type</Link>
        </span>
      )}
    </nav>
  );
}
