import { NextResponse } from "next/server";
import { readLibrary, seedStarredIfEmpty } from "../../../../lib/moodboardStore";
import { readProjectPalette } from "../../../../lib/paletteStore";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * Returns every per-project palette pool the UI shuffles or browses:
 *   - brand:        ordered hex array (from this project's palette.json)
 *   - curated:      object of row-id → hex array
 *   - sourcePool:   the original Figma-style inspiration array
 *   - pool:         deduped hexes extracted from this project's pinned images
 *   - sourceMap:    hex → array of pinIds (where each moodboard color came from)
 *   - starred:      array of hexes the user has starred for this project
 *
 * Everything is scoped to the active project. New projects start empty;
 * pools fill in as the user imports pins, extracts palettes, and stars.
 */
export async function GET() {
  const projectPalette = await readProjectPalette();
  const sourcePool = projectPalette.inspiration?.source || [];
  if (sourcePool.length > 0) {
    await seedStarredIfEmpty(sourcePool);
  }

  const lib = await readLibrary();
  const seen = new Set();
  const pool = [];
  const sourceMap = {};
  const starredPaletteSet = new Set(lib.starredPalettes || []);

  // Pin palettes as units — the training data for the engine. Each entry
  // preserves the grouping of colors that originally came from one pin.
  const pinPalettes = [];

  for (const pin of Object.values(lib.pins)) {
    if (!pin.palette || !Array.isArray(pin.palette) || pin.palette.length === 0) continue;

    pinPalettes.push({
      pinId: pin.pinId,
      palette: pin.palette,
      thumbnail: pin.thumbnail236 || pin.imageDisplay || pin.imageOriginal,
      pinUrl: pin.pinUrl,
      sourceUrl: pin.sourceUrl,
      sourceDomain: pin.sourceDomain,
      title: pin.title,
      addedAt: pin.addedAt,
      starred: starredPaletteSet.has(pin.pinId),
    });

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

  // Stable order: starred first, then by recency.
  pinPalettes.sort((a, b) => {
    if (a.starred !== b.starred) return a.starred ? -1 : 1;
    return (b.addedAt || "").localeCompare(a.addedAt || "");
  });

  return NextResponse.json({
    count: pool.length,
    palette: pool,
    sourceMap,
    starred: lib.starred || [],
    brand: Object.values(projectPalette.brand || {}),
    brandEntries: Object.entries(projectPalette.brand || {}),
    curated: projectPalette.inspiration?.curated || {},
    sourcePool,
    pinPalettes,
    starredPalettes: lib.starredPalettes || [],
  });
}
