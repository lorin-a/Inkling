import { NextResponse } from "next/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// Cache the full catalog in memory for the lifetime of the server process.
// The list rarely changes; refetching on every search wastes time.
let cache = null;
let cachedAt = 0;
const TTL = 24 * 60 * 60 * 1000;

// Map Google’s category + stroke into the style facets a designer browses by.
// `stroke` separates slab serifs from the broad "Serif" bucket; everything
// else falls back to category.
function styleOf(f) {
  if (f.stroke === "Slab Serif") return "slab";
  switch (f.category) {
    case "Sans Serif": return "sans";
    case "Serif": return "serif";
    case "Display": return "display";
    case "Handwriting": return "handwriting";
    case "Monospace": return "mono";
    default: return "other";
  }
}

// Google ships a measured width (1–10) per weight. The default/menu weight is
// representative enough for a Condensed / Normal / Wide bucket.
function widthBucketOf(f) {
  const first = Object.values(f.fonts || {})[0];
  const w = first?.width;
  if (w == null) return null;
  if (w <= 4) return "condensed";
  if (w >= 8) return "wide";
  return "normal";
}

// Numeric weights available, parsed from the `fonts` keys ("400", "700i", …).
function weightsOf(f) {
  const out = new Set();
  for (const k of Object.keys(f.fonts || {})) {
    const n = parseInt(k, 10);
    if (!Number.isNaN(n)) out.add(n);
  }
  return out;
}

function normalize(f) {
  const weights = weightsOf(f);
  const wm = weights.size ? [...weights] : [400];
  return {
    family: f.family,
    category: f.category || null,
    style: styleOf(f),
    stroke: f.stroke || null,
    widthBucket: widthBucketOf(f),
    weightMin: Math.min(...wm),
    weightMax: Math.max(...wm),
    isVariable: Array.isArray(f.axes) && f.axes.length > 0,
    popularity: f.popularity ?? 99999,
    trending: f.trending ?? 99999,
    dateAdded: f.dateAdded || "",
    designers: Array.isArray(f.designers) ? f.designers : [],
    subsets: f.subsets || [],
  };
}

async function fetchCatalog() {
  const now = Date.now();
  if (cache && now - cachedAt < TTL) return cache;
  // Public metadata endpoint — no API key required.
  const res = await fetch("https://fonts.google.com/metadata/fonts", {
    headers: { Accept: "application/json" },
    cache: "no-store",
  });
  if (!res.ok) throw new Error(`Google Fonts metadata: ${res.status}`);
  const text = await res.text();
  // The endpoint sometimes prefixes the JSON with `)]}'` as an anti-XSSI guard.
  const cleaned = text.replace(/^\)\]\}'\s*/, "");
  const data = JSON.parse(cleaned);
  const raw = data.familyMetadataList || data.familyList || [];
  cache = raw.map(normalize);
  cachedAt = now;
  return cache;
}

const SORTS = {
  popular: (a, b) => a.popularity - b.popularity,
  trending: (a, b) => a.trending - b.trending,
  newest: (a, b) => (a.dateAdded < b.dateAdded ? 1 : a.dateAdded > b.dateAdded ? -1 : 0),
  name: (a, b) => a.family.localeCompare(b.family),
};

export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url);
    const q = (searchParams.get("q") || "").trim().toLowerCase();
    const style = searchParams.get("style"); // sans|serif|slab|display|handwriting|mono
    const width = searchParams.get("width"); // condensed|normal|wide
    const weight = searchParams.get("weight"); // light|black
    const variable = searchParams.get("variable"); // "1" → variable only
    const sort = SORTS[searchParams.get("sort")] ? searchParams.get("sort") : "popular";
    const limit = Math.min(parseInt(searchParams.get("limit") || "30", 10), 100);
    const page = Math.max(parseInt(searchParams.get("page") || "0", 10), 0);

    const families = await fetchCatalog();
    let matches = families;
    if (q) matches = matches.filter((f) => f.family.toLowerCase().includes(q));
    if (style) matches = matches.filter((f) => f.style === style);
    if (width) matches = matches.filter((f) => f.widthBucket === width);
    if (weight === "light") matches = matches.filter((f) => f.weightMin <= 300);
    if (weight === "black") matches = matches.filter((f) => f.weightMax >= 800);
    if (variable === "1") matches = matches.filter((f) => f.isVariable);

    const total = matches.length;
    const sorted = [...matches].sort(SORTS[sort]);
    const start = page * limit;
    return NextResponse.json({
      families: sorted.slice(start, start + limit),
      total,
      page,
      limit,
      hasMore: start + limit < total,
    });
  } catch (e) {
    return NextResponse.json({ error: e.message, families: [] }, { status: 500 });
  }
}
