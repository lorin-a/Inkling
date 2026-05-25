import { NextResponse } from "next/server";
import { readLibrary, patchPin as filePatchPin } from "../../../../lib/moodboardStore";
import * as dbLibrary from "../../../../lib/db/library";
import { enrichPalettesForPins } from "../../../../lib/paletteEnricher";
import { getActiveProjectForUser, getRequestContext } from "../../../../lib/api/context";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// Tracks active extraction runs by project key so /library can poll
// without kicking off duplicate jobs. Process-local — fine for a single
// dev process; production will scale this out per worker.
const runs = new Map(); // projectKey → { startedAt, total }

/**
 * Background palette extraction for pins already in the library that
 * don't have a palette yet. Called on /library mount; idempotent — if
 * an extraction is already running for this project, returns the
 * existing run's metadata.
 */
export async function POST() {
  const { userId } = await getRequestContext();

  let pinsMissing;
  let runKey;
  let writePin;

  if (userId) {
    const active = await getActiveProjectForUser(userId);
    if (!active) return NextResponse.json({ started: false, missing: 0, reason: "no active project" });
    const lib = await dbLibrary.readLibrary({ projectId: active.id });
    pinsMissing = Object.values(lib.pins).filter((p) => !p.palette);
    runKey = `db:${active.id}`;
    writePin = ({ pinId, patch }) => dbLibrary.patchPin({ projectId: active.id, pinId, patch });
  } else {
    const lib = await readLibrary();
    pinsMissing = Object.values(lib.pins).filter((p) => !p.palette);
    runKey = "file:active";
    writePin = ({ pinId, patch }) => filePatchPin(pinId, patch);
  }

  if (pinsMissing.length === 0) {
    return NextResponse.json({ started: false, missing: 0, reason: "nothing to extract" });
  }
  if (runs.has(runKey)) {
    const r = runs.get(runKey);
    return NextResponse.json({ started: false, missing: pinsMissing.length, already: true, startedAt: r.startedAt });
  }
  const startedAt = new Date().toISOString();
  runs.set(runKey, { startedAt, total: pinsMissing.length });

  enrichPalettesForPins(pinsMissing, { concurrency: 2, writePin })
    .then((r) => {
      console.log(`[library auto-extract] ${runKey} — ${r.succeeded} ok, ${r.failed} failed of ${pinsMissing.length}`);
    })
    .catch((e) => console.error(`[library auto-extract] ${runKey} threw`, e))
    .finally(() => runs.delete(runKey));

  return NextResponse.json({ started: true, missing: pinsMissing.length, startedAt });
}
