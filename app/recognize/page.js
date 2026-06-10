"use client";

import { useCallback, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import ProjectSwitcher from "../../components/ProjectSwitcher";
import StageNav from "../../components/StageNav";
import ColorGather from "../../components/ColorGather";
import { createDirection } from "../../lib/makeDirection";
import styles from "./page.module.css";

/**
 * Gather (the page). Thin now: the header + the sophisticated color gather, which
 * lives in <ColorGather> so the very same experience can be summoned as a focused
 * tool from the canvas ("+ add color"). Here, finishing makes a direction and opens
 * the board.
 */
export default function RecognizePage() {
  const router = useRouter();
  const [creating, setCreating] = useState(false);
  const [error, setError] = useState(null);

  const makeDirection = useCallback(
    async ({ colors, likedPins, why }) => {
      if (!likedPins?.length || creating) return;
      setCreating(true);
      setError(null);
      try {
        await createDirection({ pins: likedPins, colours: colors, reflectionYes: why, reflectionNo: "" });
        router.push("/moodboard");
      } catch (e) {
        setError(e?.message || "Could not save the direction.");
      } finally {
        setCreating(false);
      }
    },
    [creating, router],
  );

  return (
    <div className={styles.page}>
      <header className={styles.bar}>
        <div className={styles.barLeft}>
          <Link href="/" className={styles.back}>← Moodbuilder</Link>
          <StageNav />
        </div>
        <div className={styles.barRight}>
          <ProjectSwitcher />
        </div>
      </header>

      <ColorGather
        enableTour
        ctaLabel="Make a moodboard"
        ctaHint="Turns what you kept into a moodboard to shape and compose into a brand."
        onComplete={makeDirection}
        busy={creating}
      />

      {error && <p className={styles.directionError} style={{ padding: "0 28px 24px" }}>{error}</p>}
    </div>
  );
}
