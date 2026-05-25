import { NextResponse } from "next/server";
import { mergePins, patchPin } from "../../../../lib/moodboardStore";
import { enrichPins } from "../../../../lib/pinterestSourceFetcher";
import { enrichPalettesForPins } from "../../../../lib/paletteEnricher";

// Node runtime — we need fs + DNS lookups, can't run on edge.
export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(request) {
  let payload;
  try {
    payload = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  if (!payload?.pins || !Array.isArray(payload.pins)) {
    return NextResponse.json({ error: "Missing `pins` array" }, { status: 400 });
  }

  const boardMeta = {
    boardUrl: payload.boardUrl,
    boardName: payload.boardName,
    pinner: payload.pinner,
    capturedAt: payload.capturedAt,
    count: payload.pins.length,
    importedAt: new Date().toISOString(),
  };

  const merged = await mergePins(payload.pins, boardMeta);

  // Kick off palette extraction in the background. Only touches pins
  // missing a palette field — re-imports skip already-extracted pins.
  // The /library page polls /api/library to surface progress.
  enrichPalettesForPins(payload.pins, { concurrency: 2 })
    .then((r) => {
      console.log(`[pinterest import] palette extraction done — ${r.succeeded} ok, ${r.failed} failed`);
    })
    .catch((e) => console.error("[pinterest import] palette enrichment threw", e));

  // Kick off source enrichment in the background. This can take a while
  // for hundreds of pins — we don't await it before returning. Progress
  // is observable via the library page (sourceUrl appears as each pin
  // gets enriched).
  enrichPins(payload.pins, { concurrency: 6 }).then(async (results) => {
    for (const [pinId, src] of results.entries()) {
      if (!src) continue;
      const patch = {
        sourceUrl: src.sourceUrl,
        sourceDomain: src.sourceDomain,
        pinner: src.pinner,
        pinnerUrl: src.pinnerUrl,
        title: src.title,
        description: src.description,
        enrichedAt: src.fetchedAt,
        enrichmentOk: src.ok,
      };
      try {
        await patchPin(pinId, patch);
      } catch (e) {
        // best-effort; log to server console
        console.error("patchPin failed", pinId, e);
      }
    }
    console.log(`[pinterest import] enrichment done — ${results.size} pins`);
  });

  return NextResponse.json({
    ok: true,
    board: payload.boardName,
    added: merged.added,
    updated: merged.updated,
    librarySize: merged.total,
    enrichmentStarted: true,
  });
}
