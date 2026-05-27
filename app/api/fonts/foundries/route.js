import { NextResponse } from "next/server";
import resources from "../../../../data/resources.json";
import { listApprovedResources } from "../../../../lib/db/submissions";

export const runtime = "nodejs";
export const dynamic = "force-dynamic"; // community-approved foundries are live

// Rough tier from the curator’s note so the directory can group indie vs.
// premium vs. marketplace. Transparent heuristic — the note is authoritative.
function tierOf(note = "") {
  const n = note.toLowerCase();
  if (/marketplace|market/.test(n)) return "marketplace";
  if (/premium/.test(n)) return "premium";
  return "indie";
}

/**
 * The Type-step foundry directory: the curated seed from data/resources.json
 * plus any community-approved foundry suggestions, same merge as /resources.
 * Discovery only — these link out; you bring a font in via Upload or a URL.
 */
export async function GET() {
  const seed = resources.categories.find((c) => c.key === "foundries")?.items || [];
  let approved = [];
  try {
    approved = (await listApprovedResources()).filter((r) => r.category === "foundries");
  } catch {
    /* DB optional in dev */
  }
  const foundries = [...seed, ...approved.map((r) => ({ name: r.name, url: r.url, note: r.note }))]
    .map((f) => ({ ...f, tier: tierOf(f.note) }));
  return NextResponse.json({ foundries });
}
