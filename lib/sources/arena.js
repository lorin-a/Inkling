/**
 * Are.na inspiration source adapter.
 *
 * The second import source after Pinterest. Are.na has a real public REST
 * API (api.are.na/v2) with permissive CORS, so unlike the Pinterest
 * bookmarklet there's no DOM-scraping: we fetch a public channel's blocks
 * directly — server-side for authed users, in the browser for the
 * signed-out playground (the API sends `access-control-allow-origin: *`).
 *
 * Everything normalizes to the same pin shape the rest of the pipeline
 * already speaks ({ pinId, image*, title, sourceUrl, ... }), so merge,
 * palette extraction, and the library grid work unchanged.
 *
 * This is the source-agnostic seam: a new site is a file like this one
 * (parse input → fetch → normalize to pins) plus a thin route, not a fork
 * of the import flow. NOTE: only build adapters against sources we can
 * actually test. Sites without a free/public read path (e.g. Savee) are
 * deferred rather than written blind.
 */

const API = "https://api.are.na/v2";

const domainOf = (url) => {
  try { return new URL(url).hostname.replace(/^www\./, ""); } catch { return null; }
};

/**
 * Pull a channel slug out of whatever the user pastes: a full are.na URL
 * (`are.na/user/channel-slug` or `are.na/channel-slug`) or a bare slug.
 * Returns null if it can't find one.
 */
export function parseArenaInput(input) {
  const s = String(input || "").trim();
  if (!s) return null;
  if (/are\.na/i.test(s) || s.startsWith("http")) {
    try {
      const u = new URL(s.startsWith("http") ? s : `https://${s}`);
      const parts = u.pathname.split("/").filter(Boolean);
      return parts.length ? decodeURIComponent(parts[parts.length - 1]) : null;
    } catch {
      return null;
    }
  }
  return /^[\w-]+$/.test(s) ? s : null;
}

/**
 * One Are.na block → a pin, or null for blocks we can't use (text blocks,
 * blocks with no image). Honors the same field names the pipeline expects.
 */
export function normalizeArenaBlock(block) {
  const img = block?.image;
  if (!img) return null;
  const imageOriginal = img.original?.url || null;
  const imageDisplay = img.large?.url || img.display?.url || null;
  const thumbnail236 = img.thumb?.url || img.square?.url || null;
  if (!imageOriginal && !imageDisplay && !thumbnail236) return null;

  const sourceUrl = block.source?.url || null;
  return {
    pinId: `arena-${block.id}`,
    // Canonical block permalink, so the library's "View on …" link resolves
    // for Are.na pins the same way pinUrl does for Pinterest.
    pinUrl: `https://www.are.na/block/${block.id}`,
    imageOriginal,
    imageDisplay,
    thumbnail236,
    title: block.title || block.generated_title || "",
    description: block.description || "",
    sourceUrl,
    sourceDomain: sourceUrl ? domainOf(sourceUrl) : null,
    pinner: block.source?.provider?.name || block.user?.full_name || null,
    pinnerUrl: block.source?.provider?.url || null,
    source: "arena",
  };
}

/**
 * Fetch a public Are.na channel and return a normalized import payload —
 * the same `{ source, boardName, boardUrl, pinner, pins }` shape the commit
 * step consumes. Pages through contents up to `max` image blocks.
 * `fetchImpl` is injectable for testing.
 */
export async function fetchArenaChannel(input, { max = 120, fetchImpl = fetch } = {}) {
  const slug = parseArenaInput(input);
  if (!slug) {
    throw new Error("That doesn’t look like an Are.na channel link or slug.");
  }

  const metaRes = await fetchImpl(`${API}/channels/${encodeURIComponent(slug)}?per=1`);
  if (metaRes.status === 404) {
    throw new Error("Channel not found. Check the link, and make sure the channel is public.");
  }
  if (!metaRes.ok) {
    throw new Error(`Are.na returned ${metaRes.status}. Try again in a moment.`);
  }
  const meta = await metaRes.json();

  const per = 100;
  const pageCount = Math.min(
    Math.ceil((meta.length || per) / per),
    Math.ceil(max / per),
  );

  const pins = [];
  for (let page = 1; page <= pageCount && pins.length < max; page++) {
    const res = await fetchImpl(
      `${API}/channels/${encodeURIComponent(slug)}/contents?per=${per}&page=${page}`,
    );
    if (!res.ok) break;
    const data = await res.json();
    for (const block of data.contents || []) {
      const pin = normalizeArenaBlock(block);
      if (pin) pins.push(pin);
      if (pins.length >= max) break;
    }
  }

  return {
    source: "arena",
    boardName: meta.title || slug,
    boardUrl: `https://www.are.na/${meta.user?.slug ? `${meta.user.slug}/` : ""}${meta.slug || slug}`,
    pinner: meta.user?.full_name || meta.user?.slug || null,
    pins,
  };
}
