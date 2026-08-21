import { readLibrary } from "../../lib/moodboardStore";
import * as dbLibrary from "../../lib/db/library";
import { getActiveProjectForUser, getRequestContext } from "../../lib/api/context";
import { aggregateSpectrum } from "../../lib/studio/spectrum";
import Studio from "./Studio";

/**
 * Playtest 01. The seven questions this build exists to answer live in
 * STATUS.md ("Playtest 01 — what we are testing"). Nothing is here that does
 * not serve one of them; locking, outfit cards, the taste spec and multiplayer
 * are deliberately absent because they would test nothing yet.
 *
 * The spectrum is computed on the server: clustering ~1,700 swatches is real
 * work and the pair should not wait on the main thread for it mid-session.
 */

export const dynamic = "force-dynamic";

export const metadata = { title: "Studio — Inkling" };

async function loadPins() {
  const { userId } = await getRequestContext();
  if (userId) {
    const active = await getActiveProjectForUser(userId);
    if (!active) return [];
    const lib = await dbLibrary.readLibrary({ projectId: active.id });
    return Object.values(lib?.pins || {});
  }
  const lib = await readLibrary();
  return Object.values(lib?.pins || {});
}

export default async function StudioPage() {
  const all = await loadPins();

  // Only what a card needs to render. The full pin record is 19 fields and most
  // of them are provenance the pile never reads.
  const pins = all
    .filter((p) => p?.thumbnail236 || p?.imageDisplay)
    .map((p) => ({
      id: p.pinId,
      src: p.thumbnail236 || p.imageDisplay,
      alt: p.alt || p.title || "",
      palette: Array.isArray(p.palette) ? p.palette : [],
      credit: p.sourceDomain || p.pinner || "",
      sourceUrl: p.sourceUrl || p.pinUrl || "",
    }));

  const { bands, total } = aggregateSpectrum(pins);

  // Two readings, because "what you keep reaching for" has two honest answers:
  // the whole ground (mostly neutral) and the colour inside it.
  const CHROMATIC = 0.055;
  const ground = bands.slice(0, 20);
  const figure = bands.filter((b) => b.chroma > CHROMATIC).slice(0, 16);

  return <Studio pins={pins} spectrum={ground} chromatic={figure} swatchTotal={total} />;
}
