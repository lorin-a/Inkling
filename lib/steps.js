// The path, in order. Bodies are the existing (approved) tool copy,
// unchanged; the verbs are lifted from the eyebrows so the tools read as
// one journey instead of a flat menu of pages.
//
// "Surface" (gradients) is part of the build, not a side utility — it's a
// material dimension of the identity. It will grow into a texture/gradient
// combo (grain, image-texture overlay) per NEXT.md #5; the body stays
// gradient-only until that ships so the copy doesn't overclaim.
//
// Single source of truth: the home "path" section and every step page's
// prev/next footer (PathFooter) both read from here, so the order and copy
// can never drift between them.
export const STEPS = [
  { href: "/import",    n: "01", verb: "Pull in",  title: "Pinterest import", body: "Save a one-click button to your bookmarks bar, click it on any board, and it captures every pin with source credit. Palettes extract automatically." },
  { href: "/library",   n: "02", verb: "Browse",   title: "Pin library",      body: "Every pin and upload for this project, with extracted palettes. Click any pin to open the source." },
  { href: "/colors",    n: "03", verb: "Curate",   title: "Colors",           body: "Starred set, brand swatches, curated pairings, and every color pulled from your pins. Star here, shuffle on Brand." },
  { href: "/brand",     n: "04", verb: "Compose",  title: "Brand",            body: "The live brand. Shuffle palettes, pick fonts, override roles per variant, click any element to recolor. Marks repaint with the palette." },
  { href: "/gradients", n: "05", verb: "Surface",  title: "Gradients",        body: "Sketch linear / radial / conic gradients from any project color. Drag the angle, drag the stops, copy the CSS." },
  { href: "/print",     n: "06", verb: "Deliver",  title: "Brand book",       body: "Five-page printable: cover, palette, type, marks, gradients. The finished artifact. Open from Brand, or here for a quick look." },
];

/**
 * The step before and after a given route, for the prev/next footer cue.
 * Returns { prev, next } where each is a STEPS entry or null at the ends.
 * Unknown routes return both null (the footer renders nothing).
 */
export function adjacentSteps(pathname) {
  const i = STEPS.findIndex((s) => s.href === pathname);
  if (i === -1) return { prev: null, next: null };
  return {
    prev: i > 0 ? STEPS[i - 1] : null,
    next: i < STEPS.length - 1 ? STEPS[i + 1] : null,
  };
}
