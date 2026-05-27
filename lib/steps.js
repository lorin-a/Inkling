// The path, in order. Bodies are the existing (approved) tool copy,
// unchanged; the verbs are lifted from the eyebrows so the tools read as
// one journey instead of a flat menu of pages.
//
// "Blend" (gradients) is part of the build, not a side utility — it's a
// material dimension of the identity. It will grow into a texture/gradient
// combo (grain, image-texture overlay) per NEXT.md #5; the body stays
// gradient-only until that ships so the copy doesn't overclaim.
//
// Single source of truth: the home "path" section and every step page's
// prev/next footer (PathFooter) both read from here, so the order and copy
// can never drift between them.
export const STEPS = [
  { href: "/import",    n: "01", verb: "Pull in",  title: "Import",           body: "Pull in the images you’re drawn to: a Pinterest board (via a one-click bookmark) or an Are.na channel (paste its link). Every image keeps its source credit, and palettes extract automatically." },
  { href: "/library",   n: "02", verb: "Browse",   title: "Pin library",      body: "Every pin and upload for this project, with extracted palettes. Click any pin to open the source." },
  { href: "/colors",    n: "03", verb: "Curate",   title: "Colors",           body: "Starred set, brand swatches, curated pairings, and every color pulled from your pins. Star here, shuffle on Brand." },
  { href: "/brand",     n: "04", verb: "Compose",  title: "Brand",            body: "The live brand. Shuffle palettes, pick fonts, override roles per variant, click any element to recolor. Marks repaint with the palette." },
  { href: "/decide",    n: "05", verb: "Compare",  title: "Decide",           body: "Your saved presets side by side at full size — same wordmark, every palette and type pairing — so you can compare candidates and commit to one." },
  { href: "/gradients", n: "06", verb: "Blend",    title: "Gradients",        body: "Sketch linear / radial / conic gradients from any project color. Drag the angle, drag the stops, copy the CSS." },
  { href: "/print",     n: "07", verb: "Deliver",  title: "Brand book",       body: "Five-page printable: cover, palette, type, marks, gradients. The finished artifact. Open from Brand, or here for a quick look." },
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
