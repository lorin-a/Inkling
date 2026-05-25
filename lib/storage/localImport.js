"use client";

/**
 * Signed-out Pinterest import + palette extraction.
 *
 * In DB mode the /api/import/pinterest route merges pins server-side and
 * kicks off background extraction. Signed-out visitors have no server
 * store, so the client owns it: merge pins into localStorage, then drive
 * extraction by calling the compute-only /api/pins/extract-palette
 * endpoint (imageUrl in, palette out) and writing each result locally.
 *
 * Source-URL enrichment (outbound links / pinner) stays an authed-only
 * nicety for now — pins import and get palettes without it.
 */

import * as local from "./localStore";

/** Merge a bookmarklet payload into localStorage. Returns merge counts. */
export function commitLocalImport(payload) {
  const boardMeta = {
    boardUrl: payload.boardUrl,
    boardName: payload.boardName,
    pinner: payload.pinner,
    capturedAt: payload.capturedAt,
    count: payload.pins.length,
    importedAt: new Date().toISOString(),
  };
  return local.mergePins(payload.pins, boardMeta);
}

const imageUrlFor = (pin) => pin.imageOriginal || pin.imageDisplay || pin.thumbnail236;

/**
 * Extract palettes for every locally-stored pin still missing one.
 * Runs with bounded concurrency; writes each palette into localStorage as
 * it lands. `onTick({ done, total, failed })` fires after each pin so the
 * caller can show progress. Resolves when the batch finishes.
 */
export async function extractMissingLocal({ concurrency = 2, onTick, signal } = {}) {
  const lib = local.readLibrary();
  const queue = Object.values(lib.pins || {}).filter(
    (p) => (!p.palette || p.palette.length === 0) && imageUrlFor(p),
  );
  const total = queue.length;
  let done = 0;
  let failed = 0;
  if (total === 0) return { total, done, failed };

  let cursor = 0;
  async function worker() {
    while (cursor < queue.length) {
      if (signal?.aborted) return;
      const pin = queue[cursor++];
      try {
        const res = await fetch("/api/pins/extract-palette", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ pinId: pin.pinId, imageUrl: imageUrlFor(pin) }),
        });
        const data = await res.json();
        if (res.ok && Array.isArray(data.palette)) {
          local.patchPin(pin.pinId, {
            palette: data.palette,
            paletteExtractedAt: new Date().toISOString(),
          });
        } else {
          failed += 1;
        }
      } catch {
        failed += 1;
      }
      done += 1;
      onTick?.({ done, total, failed });
    }
  }

  await Promise.all(Array.from({ length: Math.min(concurrency, total) }, worker));
  return { total, done, failed };
}
