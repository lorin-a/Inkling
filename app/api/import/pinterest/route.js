import { NextResponse } from "next/server";
import { mergePins as fileMergePins, patchPin as filePatchPin } from "../../../../lib/moodboardStore";
import * as dbLibrary from "../../../../lib/db/library";
import { enrichPins } from "../../../../lib/pinterestSourceFetcher";
import { enrichPalettesForPins } from "../../../../lib/paletteEnricher";
import { getActiveProjectForUser, getRequestContext } from "../../../../lib/api/context";

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
  let merged;
  let writePin;

  if (userId) {
    const active = await getActiveProjectForUser(userId);
    if (!active) {
      return NextResponse.json({ error: "No active project — create one first" }, { status: 400 });
    }
    merged = await dbLibrary.mergePins({
      projectId: active.id,
      incoming: payload.pins,
      boardMeta,
    });
    writePin = ({ pinId, patch }) => dbLibrary.patchPin({ projectId: active.id, pinId, patch });
  } else {
    merged = await fileMergePins(payload.pins, boardMeta);
    writePin = ({ pinId, patch }) => filePatchPin(pinId, patch);
  }

  // Kick off palette extraction in the background. Only touches pins
  // missing a palette field — re-imports skip already-extracted pins.
  enrichPalettesForPins(payload.pins, { concurrency: 2, writePin })
    .then((r) => {
      console.log(`[pinterest import] palette extraction done — ${r.succeeded} ok, ${r.failed} failed`);
    })
    .catch((e) => console.error("[pinterest import] palette enrichment threw", e));

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
