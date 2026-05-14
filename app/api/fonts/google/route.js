import { NextResponse } from "next/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// Cache the full catalog in memory for the lifetime of the server process.
// The list rarely changes; refetching on every search wastes time.
let cache = null;
let cachedAt = 0;
const TTL = 24 * 60 * 60 * 1000;

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
  const families = (data.familyMetadataList || data.familyList || []).map((f) => ({
    family: f.family,
    category: f.category || null,
    weights: f.weights || [],
    subsets: f.subsets || [],
  }));
  cache = families;
  cachedAt = now;
  return families;
}

export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url);
    const q = (searchParams.get("q") || "").trim().toLowerCase();
    const limit = Math.min(parseInt(searchParams.get("limit") || "30", 10), 100);
    const families = await fetchCatalog();
    const matches = q
      ? families.filter((f) => f.family.toLowerCase().includes(q))
      : families;
    return NextResponse.json({ families: matches.slice(0, limit), total: matches.length });
  } catch (e) {
    return NextResponse.json({ error: e.message, families: [] }, { status: 500 });
  }
}
