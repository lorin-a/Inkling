/**
 * Given a Pinterest pin URL, server-side fetch the page and try to extract:
 *   - sourceUrl     — outbound link to the original (vogue.com, etc.)
 *   - sourceDomain  — derived host for the badge
 *   - pinner        — display name of the user who pinned it
 *   - pinnerUrl     — link to the pinner's profile
 *   - title         — pin title if Pinterest exposes one
 *
 * Pinterest pin detail pages mix server-rendered metadata (og:*, JSON-LD)
 * with client-hydrated content. The fields above land in the server HTML
 * often enough that a careful parser succeeds on most pins.
 *
 * Strategy, in priority order:
 *   1. JSON-LD blocks (most reliable for `mainEntityOfPage.url`, `author.name`)
 *   2. Meta tags: og:see_also, twitter:app:url:iphone, etc.
 *   3. Anchor with class containing "Visit" or rel="nofollow noopener" inside
 *      the article element.
 *
 * Any field we can't find returns null — the import still saves the pin.
 */
const UA =
  "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Safari/605.1.15";

export async function fetchPinSource(pinUrl, { timeoutMs = 8000 } = {}) {
  const result = {
    sourceUrl: null,
    sourceDomain: null,
    pinner: null,
    pinnerUrl: null,
    title: null,
    description: null,
    fetchedAt: new Date().toISOString(),
    ok: false,
  };

  try {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), timeoutMs);
    const res = await fetch(pinUrl, {
      headers: {
        "User-Agent": UA,
        Accept: "text/html,application/xhtml+xml",
        "Accept-Language": "en-US,en;q=0.9",
      },
      signal: controller.signal,
      redirect: "follow",
    });
    clearTimeout(timer);
    if (!res.ok) return result;
    const html = await res.text();

    extractJsonLd(html, result);
    if (!result.sourceUrl) extractMeta(html, result);
    if (!result.sourceUrl) extractVisitLink(html, result);
    if (!result.title) extractMetaTitle(html, result);
    if (!result.description) extractMetaDescription(html, result);

    if (result.sourceUrl) {
      try {
        result.sourceDomain = new URL(result.sourceUrl).host.replace(/^www\./, "");
      } catch {}
    }

    result.ok = !!result.sourceUrl;
    return result;
  } catch (e) {
    return result;
  }
}

function extractJsonLd(html, out) {
  const re = /<script[^>]+type=["']application\/ld\+json["'][^>]*>([\s\S]*?)<\/script>/gi;
  let match;
  while ((match = re.exec(html)) !== null) {
    let data;
    try {
      data = JSON.parse(match[1].trim());
    } catch {
      continue;
    }
    const items = Array.isArray(data) ? data : [data];
    for (const item of items) {
      walkJsonLd(item, out);
    }
  }
}

function walkJsonLd(node, out) {
  if (!node || typeof node !== "object") return;
  const types = []
    .concat(node["@type"] || [])
    .map((t) => String(t).toLowerCase());

  // The pin's "mainEntityOfPage" or top-level url often points to the
  // outbound source. Also Recipe/Article schemas frequently include url.
  if (!out.sourceUrl) {
    const candidate =
      (node.mainEntityOfPage && (node.mainEntityOfPage.url || node.mainEntityOfPage["@id"])) ||
      node.url ||
      node.contentUrl;
    if (candidate && typeof candidate === "string" && !/pinterest\.com\/pin\//i.test(candidate)) {
      out.sourceUrl = candidate;
    }
  }

  if (!out.pinner && node.author) {
    if (typeof node.author === "object") {
      out.pinner = node.author.name || null;
      out.pinnerUrl = node.author.url || null;
    } else if (typeof node.author === "string") {
      out.pinner = node.author;
    }
  }

  if (!out.title && (types.includes("imageobject") || types.includes("socialmediaposting"))) {
    out.title = node.name || node.headline || null;
  }

  for (const key of Object.keys(node)) {
    const v = node[key];
    if (Array.isArray(v)) v.forEach((c) => walkJsonLd(c, out));
    else if (typeof v === "object") walkJsonLd(v, out);
  }
}

function extractMeta(html, out) {
  const props = [
    "og:see_also",
    "pinterestapp:source",
    "twitter:app:url:iphone",
    "twitter:app:url:googleplay",
  ];
  for (const prop of props) {
    const re = new RegExp(
      `<meta[^>]+(?:property|name)=["']${prop}["'][^>]+content=["']([^"']+)["']`,
      "i",
    );
    const m = html.match(re);
    if (m && m[1] && !/pinterest\.com\/pin\//i.test(m[1])) {
      out.sourceUrl = m[1];
      return;
    }
  }
}

function extractMetaTitle(html, out) {
  const m = html.match(/<meta[^>]+property=["']og:title["'][^>]+content=["']([^"']+)["']/i);
  if (m) out.title = decodeEntities(m[1]);
}

function extractMetaDescription(html, out) {
  const m = html.match(
    /<meta[^>]+(?:property|name)=["']og:description["'][^>]+content=["']([^"']+)["']/i,
  );
  if (m) out.description = decodeEntities(m[1]);
}

function extractVisitLink(html, out) {
  // Look for the "Visit" outbound anchor. Pinterest renames classes
  // constantly, so we match on rel + nofollow + http href pattern.
  const re =
    /<a[^>]+href=["'](https?:\/\/[^"']+)["'][^>]*rel=["'][^"']*nofollow[^"']*["'][^>]*>/gi;
  let m;
  while ((m = re.exec(html)) !== null) {
    const candidate = m[1];
    if (/pinterest\.com\//i.test(candidate)) continue;
    if (/^https?:\/\/(?:i\.)?pinimg\.com/i.test(candidate)) continue;
    out.sourceUrl = candidate;
    return;
  }
}

function decodeEntities(s) {
  return s
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&#x27;/g, "'");
}

/**
 * Enrich many pins in parallel with a concurrency cap.
 */
export async function enrichPins(pins, { concurrency = 6, onProgress } = {}) {
  const results = new Map();
  const queue = pins.slice();
  let inFlight = 0;
  let processed = 0;
  const total = queue.length;

  return await new Promise((resolve) => {
    function next() {
      while (inFlight < concurrency && queue.length > 0) {
        const pin = queue.shift();
        inFlight++;
        fetchPinSource(pin.pinUrl)
          .then((src) => {
            results.set(pin.pinId, src);
          })
          .catch(() => {})
          .finally(() => {
            inFlight--;
            processed++;
            onProgress?.(processed, total);
            if (queue.length === 0 && inFlight === 0) resolve(results);
            else next();
          });
      }
    }
    if (total === 0) resolve(results);
    else next();
  });
}
