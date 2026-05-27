/**
 * Shared tail of every import source. Whatever the source (Pinterest
 * bookmarklet, Are.na API, …), once pins are normalized they merge and
 * extract palettes the same way — only the storage backend differs by
 * sign-in state. Routes call resolveLibraryWriter() then kickPaletteExtraction();
 * source-specific enrichment (e.g. Pinterest source-URL scraping) stays in
 * its own route.
 */

import { mergePins as fileMergePins, patchPin as filePatchPin } from "./moodboardStore";
import * as dbLibrary from "./db/library";
import { enrichPalettesForPins } from "./paletteEnricher";
import { getActiveProjectForUser } from "./api/context";

/**
 * Resolve where a writer’s pins go. Signed-in → their active project in the
 * DB; signed-out → the on-disk file store. Returns null only when a signed-in
 * user has no active project (the caller should 400). Shape:
 *   { mergePins(pins, boardMeta), writePin({ pinId, patch }) }
 */
export async function resolveLibraryWriter(userId) {
  if (userId) {
    const active = await getActiveProjectForUser(userId);
    if (!active) return null;
    return {
      mergePins: (pins, boardMeta) =>
        dbLibrary.mergePins({ projectId: active.id, incoming: pins, boardMeta }),
      writePin: ({ pinId, patch }) =>
        dbLibrary.patchPin({ projectId: active.id, pinId, patch }),
    };
  }
  return {
    mergePins: (pins, boardMeta) => fileMergePins(pins, boardMeta),
    writePin: ({ pinId, patch }) => filePatchPin(pinId, patch),
  };
}

/**
 * Fire-and-forget palette extraction for freshly imported pins. Only touches
 * pins missing a palette, so re-imports are cheap. Does not block the response.
 */
export function kickPaletteExtraction(pins, writePin, tag = "import") {
  enrichPalettesForPins(pins, { concurrency: 2, writePin })
    .then((r) => console.log(`[${tag}] palette extraction done — ${r.succeeded} ok, ${r.failed} failed`))
    .catch((e) => console.error(`[${tag}] palette enrichment threw`, e));
}
