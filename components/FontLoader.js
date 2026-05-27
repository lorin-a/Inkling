"use client";

import { useEffect, useMemo } from "react";

/**
 * Injects the right <link> / <style> tags so the project’s chosen fonts
 * are available on the page. Renders nothing visible.
 *
 * fonts shape:
 *   { title?, subhead?, body? }
 * Each slot:
 *   { family: string, source: "google" | "upload" | "url", url?: string }
 *   - google: family name only; we build the CSS link
 *   - upload: family + url (path to the uploaded file in /projects/{slug}/fonts/)
 *   - url:    family + url (a CSS stylesheet URL — Fontshare, Adobe, etc.)
 */
export default function FontLoader({ fonts }) {
  const slots = useMemo(() => {
    if (!fonts) return [];
    return ["title", "subhead", "body"]
      .map((slot) => fonts[slot])
      .filter((s) => s && s.family);
  }, [fonts]);

  // Build the set of resources to load. Dedupe so swapping the same family
  // across slots only fetches once.
  const resources = useMemo(() => {
    const out = new Map();
    for (const s of slots) {
      if (s.source === "google") {
        const key = `google:${s.family}`;
        if (!out.has(key)) {
          const href = `https://fonts.googleapis.com/css2?family=${encodeURIComponent(s.family).replace(/%20/g, "+")}:ital,wght@0,400;0,700;1,400&display=swap`;
          out.set(key, { kind: "link", id: key, href });
        }
      } else if (s.source === "url" && s.url) {
        const key = `url:${s.url}`;
        if (!out.has(key)) out.set(key, { kind: "link", id: key, href: s.url });
      } else if (s.source === "upload" && s.url) {
        const key = `upload:${s.family}:${s.url}`;
        if (!out.has(key)) {
          out.set(key, {
            kind: "face",
            id: key,
            css: `@font-face { font-family: ${JSON.stringify(s.family)}; src: url(${JSON.stringify(s.url)}); font-display: swap; }`,
          });
        }
      }
    }
    return Array.from(out.values());
  }, [slots]);

  useEffect(() => {
    if (typeof document === "undefined") return;
    const attached = [];
    for (const r of resources) {
      const idAttr = `data-font-id="${r.id}"`;
      if (document.querySelector(`[${idAttr}]`)) continue;
      let el;
      if (r.kind === "link") {
        el = document.createElement("link");
        el.rel = "stylesheet";
        el.href = r.href;
      } else {
        el = document.createElement("style");
        el.textContent = r.css;
      }
      el.setAttribute("data-font-id", r.id);
      document.head.appendChild(el);
      attached.push(el);
    }
    return () => {
      // Leave loaded fonts in place across renders to avoid FOIT churn.
      // We only clean up on full unmount of FontLoader.
    };
  }, [resources]);

  return null;
}

/**
 * Returns a CSS font-family stack for a slot, with sensible system fallbacks.
 * Use to set --font-title / --font-subhead / --font-body.
 */
export function fontStack(slot, fallback = "serif") {
  if (!slot || !slot.family) return fallback;
  const fam = slot.family.includes(" ") ? `"${slot.family}"` : slot.family;
  if (fallback === "sans") return `${fam}, system-ui, sans-serif`;
  return `${fam}, Georgia, serif`;
}
