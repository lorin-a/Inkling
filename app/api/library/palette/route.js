import { NextResponse } from "next/server";
import { readLibrary, seedStarredIfEmpty } from "../../../../lib/moodboardStore";
import { readProjectPalette } from "../../../../lib/paletteStore";
import * as dbLibrary from "../../../../lib/db/library";
import * as dbPalette from "../../../../lib/db/palette";
import { getActiveProjectForUser, getRequestContext } from "../../../../lib/api/context";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const EMPTY_RESPONSE = {
  count: 0,
  palette: [],
  sourceMap: {},
  starred: [],
  brand: [],
  brandEntries: [],
  curated: {},
  sourcePool: [],
  pinPalettes: [],
  starredPalettes: [],
};

/**
 * Returns every per-project palette pool the UI shuffles or browses.
 * Dual-mode: DB-backed when authed, file-backed when not.
 */
export async function GET() {
  const { userId } = await getRequestContext();

  let projectPalette;
  let lib;

  if (userId) {
    const active = await getActiveProjectForUser(userId);
    if (!active) return NextResponse.json(EMPTY_RESPONSE);
    [projectPalette, lib] = await Promise.all([
      dbPalette.readProjectPalette({ projectId: active.id }),
      dbLibrary.readLibrary({ projectId: active.id }),
    ]);
  } else {
    projectPalette = await readProjectPalette();
    const sourcePool = projectPalette.inspiration?.source || [];
    if (sourcePool.length > 0) {
      await seedStarredIfEmpty(sourcePool);
    }
    lib = await readLibrary();
  }

  const seen = new Set();
  const pool = [];
  const sourceMap = {};
  const starredPaletteSet = new Set(lib.starredPalettes || []);

  // Pin palettes as units — the training data for the engine. Each entry
  // preserves the grouping of colors that originally came from one pin.
  const pinPalettes = [];

  for (const pin of Object.values(lib.pins || {})) {
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
    sourcePool: projectPalette.inspiration?.source || [],
    pinPalettes,
    starredPalettes: lib.starredPalettes || [],
  });
}
