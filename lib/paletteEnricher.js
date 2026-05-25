import { extractPalette } from "./extractPalette";
import { patchPin } from "./moodboardStore";

/**
 * Background palette extraction. Given a list of pins from a freshly
 * imported board, runs extraction for any pin that doesn't already have
 * a palette and writes the result back through patchPin (which is mutex
 * + atomic-write safe). Failures are swallowed — the manual "Extract
 * palette" button on /library remains the recovery path.
 *
 * Concurrency is intentionally low (2) because each worker spins up
 * sharp + k-means in addition to fetching the image. Higher concurrency
 * spikes memory without much wall-clock benefit.
 */
export async function enrichPalettesForPins(pins, { concurrency = 2, slug } = {}) {
  const queue = pins.filter((p) => !p.palette && (p.imageOriginal || p.imageDisplay || p.thumbnail236));
  if (queue.length === 0) return { processed: 0, succeeded: 0, failed: 0 };

  let succeeded = 0;
  let failed = 0;
  let inFlight = 0;
  let processed = 0;

  return await new Promise((resolve) => {
    function next() {
      while (inFlight < concurrency && queue.length > 0) {
        const pin = queue.shift();
        inFlight++;
        const url = pin.imageOriginal || pin.imageDisplay || pin.thumbnail236;
        extractPalette(url, { k: 7 })
          .then(async (palette) => {
            await patchPin(pin.pinId, {
              palette,
              paletteExtractedAt: new Date().toISOString(),
            }, slug);
            succeeded++;
          })
          .catch(async () => {
            // Fall back to the smaller thumbnail if the original failed.
            if (pin.imageDisplay && pin.imageDisplay !== url) {
              try {
                const palette = await extractPalette(pin.imageDisplay, { k: 7 });
                await patchPin(pin.pinId, {
                  palette,
                  paletteExtractedAt: new Date().toISOString(),
                }, slug);
                succeeded++;
                return;
              } catch {}
            }
            failed++;
          })
          .finally(() => {
            inFlight--;
            processed++;
            if (queue.length === 0 && inFlight === 0) {
              resolve({ processed, succeeded, failed });
            } else {
              next();
            }
          });
      }
    }
    next();
  });
}
