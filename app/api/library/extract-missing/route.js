import { NextResponse } from "next/server";
import { readLibrary } from "../../../../lib/moodboardStore";
import { enrichPalettesForPins } from "../../../../lib/paletteEnricher";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// Tracks active extraction runs by project slug so /library can poll
// without kicking off duplicate jobs. Process-local — fine for a
// single-tenant dev app.
const runs = new Map(); // slug -> { startedAt, total, started: true }

/**
 * Background palette extraction for pins already in the library that
 * don't have a palette yet. Called on /library mount; idempotent — if
 * an extraction is already running for this project, returns the
 * existing run's metadata instead of starting a new one.
 */
export async function POST() {
  const lib = await readLibrary();
  const pinsMissing = Object.values(lib.pins).filter((p) => !p.palette);
  if (pinsMissing.length === 0) {
    return NextResponse.json({ started: false, missing: 0, reason: "nothing to extract" });
  }

  // We don't have a slug to key the run map by reliably from inside
  // readLibrary; use a sentinel since this is single-tenant.
  const key = "active";
  if (runs.has(key)) {
    const r = runs.get(key);
    return NextResponse.json({ started: false, missing: pinsMissing.length, already: true, startedAt: r.startedAt });
  }
  const startedAt = new Date().toISOString();
  runs.set(key, { startedAt, total: pinsMissing.length });

  enrichPalettesForPins(pinsMissing, { concurrency: 2 })
    .then((r) => {
      console.log(`[library auto-extract] done — ${r.succeeded} ok, ${r.failed} failed of ${pinsMissing.length}`);
    })
    .catch((e) => console.error("[library auto-extract] threw", e))
    .finally(() => runs.delete(key));

  return NextResponse.json({ started: true, missing: pinsMissing.length, startedAt });
}
