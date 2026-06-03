import { NextResponse } from "next/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// Cache the catalog for the process lifetime — like the Google route. Fontshare
// is small (~100 families) and changes rarely.
let cache = null;
let cachedAt = 0;
const TTL = 24 * 60 * 60 * 1000;

// Fontshare's own categories ("Sans", "Serif", "Slab", "Display", "Script",
// "Handwritten", and combos like "Serif, Display") mapped onto the same style
// facets a designer browses by on /type. Slab and Script win over their parents
// so a slab serif doesn't land in the broad "Serif" bucket.
function styleOf(category = "") {
  const c = category.toLowerCase();
  if (c.includes("slab")) return "slab";
  if (c.includes("script") || c.includes("handwritten")) return "handwriting";
  if (c.includes("serif")) return "serif";
  if (c.includes("sans")) return "sans";
  if (c.includes("display")) return "display";
  return "other";
}

// Top / hot / new come first, then the rest A–Z — a stable, sensible default
// order (Fontshare exposes no popularity rank like Google does).
function rank(f) {
  return (f.is_top ? 0 : 4) + (f.is_hot ? 0 : 2) + (f.is_new ? 0 : 1);
}

async function fetchCatalog() {
  const now = Date.now();
  if (cache && now - cachedAt < TTL) return cache;
  // Public catalog endpoint — no key. Caps at 100 families per response.
  const res = await fetch("https://api.fontshare.com/v2/fonts?limit=100&offset=0", {
    headers: { Accept: "application/json" },
    cache: "no-store",
  });
  if (!res.ok) throw new Error(`Fontshare catalog: ${res.status}`);
  const data = await res.json();
  const raw = Array.isArray(data.fonts) ? data.fonts : [];
  cache = raw
    .filter((f) => f.slug && f.name)
    .map((f) => ({
      family: f.name,
      slug: f.slug,
      source: "fontshare",
      style: styleOf(f.category),
      isVariable: Array.isArray(f.axes) && f.axes.length > 0,
      license: f.license_type || null, // itf_ffl (free, incl. commercial) | sil_ofl (open)
      _rank: rank(f),
    }))
    .sort((a, b) => (a._rank - b._rank) || a.family.localeCompare(b.family))
    .map(({ _rank, ...rest }) => rest);
  cachedAt = now;
  return cache;
}

export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url);
    const q = (searchParams.get("q") || "").trim().toLowerCase();
    const style = searchParams.get("style");

    let families = await fetchCatalog();
    if (style) families = families.filter((f) => f.style === style);
    if (q) families = families.filter((f) => f.family.toLowerCase().includes(q));
    return NextResponse.json({ families, total: families.length });
  } catch (e) {
    return NextResponse.json({ error: e.message, families: [] }, { status: 500 });
  }
}
