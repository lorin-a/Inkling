import { NextResponse } from "next/server";
import { fetchArenaChannel } from "../../../../lib/sources/arena";
import { getRequestContext } from "../../../../lib/api/context";
import { resolveLibraryWriter, kickPaletteExtraction } from "../../../../lib/importCommit";

// Node runtime — palette extraction reaches for sharp + network.
export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * Import a public Are.na channel by link or slug. Unlike Pinterest there’s
 * no bookmarklet: we fetch the channel server-side via the Are.na API and
 * normalize blocks to pins, then hand off to the shared commit path. Source
 * URLs come straight from the API, so there’s no scraping-enrichment step.
 *
 * Signed-out visitors don’t hit this route — they fetch Are.na directly in
 * the browser (CORS is open) and commit to localStorage.
 */
export async function POST(request) {
  let body;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const input = body?.input || body?.channel || body?.slug;
  if (!input) {
    return NextResponse.json({ error: "Missing Are.na channel link or slug" }, { status: 400 });
  }

  let payload;
  try {
    payload = await fetchArenaChannel(input);
  } catch (e) {
    return NextResponse.json({ error: e.message || "Could not load that channel" }, { status: 400 });
  }

  if (payload.pins.length === 0) {
    return NextResponse.json(
      { error: "That channel has no image blocks to import." },
      { status: 400 },
    );
  }

  const { userId } = await getRequestContext();
  const writer = await resolveLibraryWriter(userId);
  if (!writer) {
    return NextResponse.json({ error: "No active project — create one first" }, { status: 400 });
  }

  const boardMeta = {
    boardUrl: payload.boardUrl,
    boardName: payload.boardName,
    pinner: payload.pinner,
    source: "arena",
    count: payload.pins.length,
    importedAt: new Date().toISOString(),
  };

  const merged = await writer.mergePins(payload.pins, boardMeta);
  kickPaletteExtraction(payload.pins, writer.writePin, "arena import");

  return NextResponse.json({
    ok: true,
    board: payload.boardName,
    added: merged.added,
    updated: merged.updated,
    librarySize: merged.total,
    enrichmentStarted: true,
  });
}
