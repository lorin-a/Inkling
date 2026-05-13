/**
 * Source for the Pinterest capture bookmarklet — kept readable here so we
 * can iterate, then minified into `BOOKMARKLET_HREF` at the bottom for the
 * draggable button. Update this file, run `npm run build:bookmarklet`
 * (script below) to regenerate the minified href.
 *
 * Behaviour:
 *   1. Hooks a MutationObserver on document.body to scrape every
 *      [data-test-id="pin"] tile as it mounts. Pinterest virtualizes
 *      offscreen tiles, so we have to catch them on entry.
 *   2. Smoothly auto-scrolls to the bottom of the board until pin-count
 *      plateaus for N rounds (configurable; default 5 plateaus × 800ms).
 *   3. Captures: pinId, pinUrl, current rendered image src, derived
 *      originals URL, alt text, board-card aria title.
 *   4. Downloads a `moodbuilder-{boardName}-{ts}.json` file containing the
 *      manifest. Drop that file on /import to ingest.
 *
 * Source URL enrichment (the external link from each pin to its origin)
 * happens server-side after import. The bookmarklet does not fetch pin
 * detail pages — that would be slow and bot-detection-prone.
 */
export const BOOKMARKLET_SOURCE = `(async () => {
  if (window.__moodbuilderRunning) return;
  window.__moodbuilderRunning = true;

  const captured = new Map();
  let stopped = false;

  const pickHighest = (img) => {
    const srcset = img.srcset || '';
    const variants = srcset.split(',').map(s => s.trim()).filter(Boolean);
    if (!variants.length) return img.src;
    const last = variants[variants.length - 1].split(/\\s+/)[0];
    return last || img.src;
  };

  const captureTile = (el) => {
    const id = el.getAttribute('data-test-pin-id');
    if (!id || captured.has(id)) return;
    const a = el.querySelector('a[href*="/pin/"]');
    const img = el.querySelector('img');
    if (!a || !img) return;
    const titleRaw = el.getAttribute('aria-label') || '';
    const title = titleRaw.replace(/\\s*pin page\\s*$/i, '').replace(/^Pin card$/i, '').trim() || null;
    const display = pickHighest(img);
    const parts = (img.src || '').split('/');
    if (parts[3] && (/^\\d+x$/.test(parts[3]) || parts[3] === 'originals')) parts[3] = 'originals';
    const original = parts.join('/');
    captured.set(id, {
      pinId: id,
      pinUrl: a.href,
      imageDisplay: display,
      imageOriginal: original,
      thumbnail236: img.src,
      alt: img.alt || null,
      title,
      capturedAt: Date.now(),
    });
  };

  const scanAll = () => {
    document.querySelectorAll('[data-test-id="pin"]').forEach(captureTile);
  };

  const obs = new MutationObserver(() => scanAll());
  obs.observe(document.body, { childList: true, subtree: true });
  scanAll();

  // Floating UI
  const ui = document.createElement('div');
  ui.style.cssText = 'position:fixed;bottom:24px;right:24px;background:#1a1a1a;color:#fff;padding:16px 20px;border-radius:14px;font:14px ui-sans-serif;z-index:2147483647;box-shadow:0 12px 32px rgba(0,0,0,.32);min-width:260px;line-height:1.5';
  ui.innerHTML = '<div id="mb-st" style="font-weight:500">Capturing your board…</div><div id="mb-ct" style="font-family:ui-monospace,Menlo,monospace;margin-top:8px;opacity:.85">0 pins</div><div style="display:flex;gap:8px;margin-top:12px"><button id="mb-stop" style="padding:7px 14px;background:#fff;color:#1a1a1a;border:none;border-radius:999px;font:13px ui-sans-serif;cursor:pointer;font-weight:500">Stop &amp; Download</button><button id="mb-cancel" style="padding:7px 14px;background:transparent;color:rgba(255,255,255,.7);border:1px solid rgba(255,255,255,.18);border-radius:999px;font:13px ui-sans-serif;cursor:pointer">Cancel</button></div>';
  document.body.appendChild(ui);

  const statusEl = ui.querySelector('#mb-st');
  const countEl = ui.querySelector('#mb-ct');
  ui.querySelector('#mb-stop').onclick = () => { stopped = true; };
  ui.querySelector('#mb-cancel').onclick = () => {
    obs.disconnect();
    ui.remove();
    window.__moodbuilderRunning = false;
    throw new Error('cancelled');
  };

  const updateCount = () => { countEl.textContent = captured.size + ' pins captured'; };

  // Start from top so we cover the whole board.
  window.scrollTo({ top: 0, behavior: 'instant' });
  await new Promise(r => setTimeout(r, 400));

  let lastCount = -1;
  let plateaus = 0;
  let scrolls = 0;
  const MAX_SCROLLS = 400;
  const PLATEAU_LIMIT = 6;
  const STEP_MS = 700;

  while (!stopped && scrolls < MAX_SCROLLS) {
    window.scrollBy({ top: window.innerHeight * 0.85, behavior: 'instant' });
    await new Promise(r => setTimeout(r, STEP_MS));
    scanAll();
    updateCount();

    if (captured.size === lastCount) {
      plateaus++;
      statusEl.textContent = 'Settling… (' + plateaus + '/' + PLATEAU_LIMIT + ')';
      if (plateaus >= PLATEAU_LIMIT) break;
    } else {
      plateaus = 0;
      lastCount = captured.size;
      statusEl.textContent = 'Capturing your board…';
    }
    scrolls++;
  }

  // Final passes after a brief settle to catch tail-end pins
  await new Promise(r => setTimeout(r, 600));
  scanAll();
  await new Promise(r => setTimeout(r, 400));
  scanAll();
  obs.disconnect();

  const boardName = location.pathname.split('/').filter(Boolean).pop() || 'pinterest';
  const payload = {
    source: 'pinterest',
    boardUrl: location.href,
    boardName,
    pinner: location.pathname.split('/').filter(Boolean)[0] || null,
    capturedAt: new Date().toISOString(),
    count: captured.size,
    pins: Array.from(captured.values()),
  };

  const json = JSON.stringify(payload, null, 2);
  const blob = new Blob([json], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = 'moodbuilder-' + boardName + '-' + Date.now() + '.json';
  document.body.appendChild(link);
  link.click();
  link.remove();
  URL.revokeObjectURL(url);

  statusEl.textContent = 'Done — ' + captured.size + ' pins downloaded';
  statusEl.style.color = '#a3e635';
  setTimeout(() => { ui.remove(); window.__moodbuilderRunning = false; }, 8000);
})();`;

// We skip minification — collapsing whitespace risks eating characters
// inside regex literals or string template artifacts. `javascript:` URLs
// accept newlines fine, encodeURI handles the rest.
export const BOOKMARKLET_HREF = "javascript:" + encodeURI(BOOKMARKLET_SOURCE);
