/**
 * The dimensions a reference can be *about* — the spine of the tagging model
 * (VISION §15/§16). One reference is a bundle of dimensions; the pull gesture
 * asks "this part, and it's about ___" and the answer is one of these.
 *
 * Fixed slugs (the DB column is free TEXT, so a future user-defined / renameable
 * layer never blocks). One import for the pull picker, the well filter, and any
 * future spoke. Full 7-dimension set (Lorin, 2026-06-03).
 */
export const DIMENSIONS = [
  { slug: "type", label: "Type" },
  { slug: "color", label: "Color" },
  { slug: "imagery", label: "Imagery" },
  { slug: "illustration", label: "Illustration" },
  { slug: "texture", label: "Texture" },
  { slug: "vibe", label: "Vibe" },
  { slug: "layout", label: "Layout" },
];

const BY_SLUG = Object.fromEntries(DIMENSIONS.map((d) => [d.slug, d]));

export const isDimension = (slug) => Boolean(BY_SLUG[slug]);

/** Display label for a slug; falls back to the raw slug so unknown values still show. */
export function dimensionLabel(slug) {
  return BY_SLUG[slug]?.label || slug || "";
}
