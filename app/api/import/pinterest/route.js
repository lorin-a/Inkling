import { NextResponse } from "next/server";
import { enrichPins } from "../../../../lib/pinterestSourceFetcher";
import { getRequestContext } from "../../../../lib/api/context";
import { resolveLibraryWriter, kickPaletteExtraction } from "../../../../lib/importCommit";

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

  const { userId } = await getRequestContext();
  const writer = await resolveLibraryWriter(userId);
  if (!writer) {
    return NextResponse.json({ error: "No active project — create one first" }, { status: 400 });
  }
  const merged = await writer.mergePins(payload.pins, boardMeta);
  const writePin = writer.writePin;

  // Palette extraction in the background — shared with every import source.
  kickPaletteExtraction(payload.pins, writePin, "pinterest import");

  // Source URL enrichment — populates outbound link + pinner metadata.
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
        await writePin({ pinId, patch });
      } catch (e) {
        console.error("patch failed", pinId, e);
      }
    }
    console.log(`[pinterest import] source enrichment done — ${results.size} pins`);
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
