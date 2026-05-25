"use client";

import { useEffect, useState } from "react";
import { isAuthed } from "./client";

/**
 * Resolves the current sign-in state for gating UI. Returns:
 *   null  — still resolving (render neither gate nor control yet)
 *   true  — signed in (DB-backed; uploads + sync available)
 *   false — signed out (playground; uploads gated, edits local-only)
 */
export function useAuthed() {
  const [authed, setAuthed] = useState(null);
  useEffect(() => {
    let alive = true;
    isAuthed().then((v) => alive && setAuthed(v));
    return () => { alive = false; };
  }, []);
  return authed;
}
