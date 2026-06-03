"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import styles from "./SpokeNav.module.css";

/**
 * The dimension spokes + the canvas, as one persistent nav — so wherever you
 * are (gathering color, exploring type, arranging the board) you can always get
 * back to where you were in the process. Lorin's review: "when I'm in the board
 * it's not clear how to get back to type or color importing."
 *
 * Color = /recognize (gather a palette from your inspiration); Type = /type;
 * Board = /moodboard (where every dimension lands). The active spoke is marked.
 */
const SPOKES = [
  { href: "/recognize", label: "Color" },
  { href: "/type", label: "Type" },
  { href: "/moodboard", label: "Board" },
];

export default function SpokeNav() {
  const pathname = usePathname();
  return (
    <nav className={styles.nav} aria-label="Your studio">
      {SPOKES.map((s) => {
        const active = pathname === s.href;
        return (
          <Link
            key={s.href}
            href={s.href}
            className={styles.link}
            data-active={active ? "true" : undefined}
            aria-current={active ? "page" : undefined}
          >
            {s.label}
          </Link>
        );
      })}
    </nav>
  );
}
