import { NextResponse } from "next/server";
import { readLibrary, seedStarredIfEmpty } from "../../../../lib/moodboardStore";
import staticPalette from "../../../../data/palette.json";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * Flattens every pin's extracted palette into a deduped pool of hexes that
 * Palette Lab's Brand page can shuffle from. Each pin's first 4 colors are
 * weighted in (the most prevalent) — beyond that we'd over-represent a few
 * pins with seven colors each.
 */
export async function GET() {
  // First-run seed: starred is initialized with the 30 Figma inspiration
  // hexes (sourcePool). Future toggles overlay on this baseline.
  const sourcePool = staticPalette?.inspiration?.source ?? [];
  await seedStarredIfEmpty(sourcePool);

  const lib = await readLibrary();
  const seen = new Set();
  const pool = [];
  const sourceMap = {};

  for (const pin of Object.values(lib.pins)) {
    if (!pin.palette || !Array.isArray(pin.palette)) continue;
    const top = pin.palette.slice(0, 4);
    for (const hex of top) {
      const h = hex.toLowerCase();
      if (seen.has(h)) {
        sourceMap[h].push(pin.pinId);
        continue;
      }
      seen.add(h);
      pool.push(h);
      sourceMap[h] = [pin.pinId];
    }
  }

  return NextResponse.json({
    count: pool.length,
    palette: pool,
    sourceMap,
    starred: lib.starred || [],
  });
}
