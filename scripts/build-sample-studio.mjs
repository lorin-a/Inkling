#!/usr/bin/env node
/**
 * Build the Sample Studio from a captured Pinterest board.
 *
 * The signed-out playground loads a "Sample Studio" — the demo every
 * visitor sees first. Its pins ship as static data baked into the build,
 * and their images are MIRRORED into public/sample/ rather than hotlinked
 * from i.pinimg.com, so the flagship demo never breaks when Pinterest
 * rotates a thumbnail (and loads fast).
 *
 * Input: a board JSON captured by the /import bookmarklet.
 * Output:
 *   - public/sample/{pinId}.{ext}     mirrored images
 *   - lib/sampleStudio.data.json      pins + derived palette, baked in
 *
 * Run: node scripts/build-sample-studio.mjs <board.json> [--limit 30]
 *
 * Re-runnable and idempotent: swap in a new board JSON and re-run; it
 * clears public/sample/ and rewrites the data file. lib/sampleStudio.js
 * reads the data file and keeps the hand-authored "Your Brand" project
 * template (wordmark / tagline / body) separate, so copy isn't clobbered.
 */

import { readFile, writeFile, mkdir, rm } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";
import sharp from "sharp";
import { extractPalette } from "../lib/extractPalette.js";

// The sample ships to every visitor and lives in the repo, so the
// mirrored images are downscaled — the library grid and brand preview
// never need Pinterest's full-res originals.
const MAX_EDGE = 1000;
const JPEG_QUALITY = 80;

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = join(__dirname, "..");
const PUBLIC_DIR = join(ROOT, "public", "sample");
const DATA_FILE = join(ROOT, "lib", "sampleStudio.data.json");

function parseArgs(argv) {
  const args = { input: null, limit: 30 };
  for (let i = 0; i < argv.length; i++) {
    if (argv[i] === "--limit") args.limit = parseInt(argv[++i], 10) || 30;
    else if (!args.input) args.input = argv[i];
  }
  return args;
}

const bestImage = (pin) => pin.imageOriginal || pin.imageDisplay || pin.thumbnail236;

async function mirrorImage(pin) {
  const url = bestImage(pin);
  if (!url) throw new Error("no image url");
  // i.pinimg.com applies hotlink protection — a browser UA + a Pinterest
  // Referer gets the bytes that a bare fetch 403s on.
  const res = await fetch(url, {
    headers: {
      "User-Agent":
        "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0 Safari/537.36",
      "Referer": "https://www.pinterest.com/",
      "Accept": "image/avif,image/webp,image/png,image/jpeg,*/*",
    },
    redirect: "follow",
    signal: AbortSignal.timeout(20000),
  });
  if (!res.ok) throw new Error(`fetch ${res.status}`);
  const original = Buffer.from(await res.arrayBuffer());
  // Downscale + re-encode to keep the shipped sample lean. Palette is
  // extracted from the resized copy (k-means downsamples anyway, so the
  // dominant colors are identical).
  const resized = await sharp(original)
    .rotate() // honor EXIF orientation before stripping metadata
    .resize(MAX_EDGE, MAX_EDGE, { fit: "inside", withoutEnlargement: true })
    .jpeg({ quality: JPEG_QUALITY })
    .toBuffer();
  const filename = `${pin.pinId}.jpg`;
  await writeFile(join(PUBLIC_DIR, filename), resized);
  return { localPath: `/sample/${filename}`, buffer: resized };
}

// --- palette derivation (no composePalette: it uses an extensionless
// import that bare `node` can't resolve; a luminance/saturation split is
// plenty for a sensible seed the user can re-shuffle from). ---

function hexToRgb(h) {
  const s = h.replace("#", "");
  return [parseInt(s.slice(0, 2), 16), parseInt(s.slice(2, 4), 16), parseInt(s.slice(4, 6), 16)];
}
function luminance(h) {
  const [r, g, b] = hexToRgb(h);
  return (0.2126 * r + 0.7152 * g + 0.0722 * b) / 255;
}
function saturation(h) {
  const [r, g, b] = hexToRgb(h).map((v) => v / 255);
  const max = Math.max(r, g, b), min = Math.min(r, g, b);
  if (max === 0) return 0;
  return (max - min) / max;
}
function dedupeHexes(hexes) {
  const seen = new Set();
  const out = [];
  for (const h of hexes) {
    const k = h.toLowerCase();
    if (seen.has(k)) continue;
    seen.add(k);
    out.push(k);
  }
  return out;
}

function deriveSeed(pins) {
  const pool = dedupeHexes(
    Object.values(pins).flatMap((p) => (p.palette || []).slice(0, 4)),
  );
  if (pool.length < 4) {
    return { brand: null, starred: [], source: pool, curated: {} };
  }
  const byLum = [...pool].sort((a, b) => luminance(a) - luminance(b));
  const bg = byLum[byLum.length - 1];          // lightest
  const ink = byLum[0];                          // darkest
  const mids = byLum.slice(1, -1);
  const accent = [...mids].sort((a, b) => saturation(b) - saturation(a))[0] || byLum[1];
  const muted = mids.find((h) => h !== accent) || byLum[Math.floor(byLum.length / 2)];

  // Starred = a luminance-spread handful so the Brand "Starred" shuffle
  // has range to compose from on day one.
  const step = Math.max(1, Math.floor(byLum.length / 6));
  const starred = dedupeHexes(byLum.filter((_, i) => i % step === 0)).slice(0, 6);

  return {
    brand: { bg, ink, accent, muted },
    starred,
    source: pool.slice(0, 48),
    curated: { Highlights: dedupeHexes([bg, ink, accent, muted]) },
  };
}

async function pool(items, worker, concurrency = 4) {
  const results = [];
  let cursor = 0;
  async function run() {
    while (cursor < items.length) {
      const i = cursor++;
      results[i] = await worker(items[i], i);
    }
  }
  await Promise.all(Array.from({ length: Math.min(concurrency, items.length) }, run));
  return results;
}

async function main() {
  const { input, limit } = parseArgs(process.argv.slice(2));
  if (!input) {
    console.error("Usage: node scripts/build-sample-studio.mjs <board.json> [--limit 30]");
    process.exit(1);
  }

  const payload = JSON.parse(await readFile(input, "utf8"));
  if (!Array.isArray(payload.pins)) {
    console.error("Input has no `pins` array — is this a bookmarklet capture?");
    process.exit(1);
  }

  const incoming = payload.pins.filter((p) => p?.pinId && bestImage(p)).slice(0, limit);
  console.log(`Building sample from ${incoming.length} pins (board: ${payload.boardName || "—"})`);

  await rm(PUBLIC_DIR, { recursive: true, force: true });
  await mkdir(PUBLIC_DIR, { recursive: true });

  const now = new Date().toISOString();
  const built = await pool(incoming, async (pin) => {
    try {
      const { localPath, buffer } = await mirrorImage(pin);
      const palette = await extractPalette(buffer, { k: 7 });
      process.stdout.write(".");
      return {
        pinId: pin.pinId,
        pinUrl: pin.pinUrl,
        imageOriginal: localPath,
        imageDisplay: localPath,
        thumbnail236: localPath,
        alt: pin.alt || "",
        title: pin.title || "",
        sourceUrl: pin.sourceUrl || pin.pinUrl,
        sourceDomain: pin.sourceDomain || "pinterest.com",
        pinner: pin.pinner || null,
        pinnerUrl: pin.pinnerUrl || null,
        palette,
        paletteExtractedAt: now,
        addedAt: now,
        capturedAt: pin.capturedAt || Date.now(),
      };
    } catch (e) {
      process.stdout.write("x");
      console.warn(`\n  skip ${pin.pinId}: ${e.message}`);
      return null;
    }
  });

  const pins = {};
  for (const p of built) if (p) pins[p.pinId] = p;

  const seed = deriveSeed(pins);
  const data = {
    generatedAt: now,
    boardName: payload.boardName || null,
    count: Object.keys(pins).length,
    pins,
    starred: seed.starred,
    palette: seed.brand
      ? { brand: seed.brand, inspiration: { source: seed.source, curated: seed.curated } }
      : null,
  };

  await writeFile(DATA_FILE, JSON.stringify(data, null, 2) + "\n");
  console.log(`\n✓ ${data.count} pins mirrored to public/sample/`);
  console.log(`✓ wrote lib/sampleStudio.data.json`);
  if (seed.brand) {
    console.log(`  brand: ${Object.values(seed.brand).join(" ")}`);
    console.log(`  starred: ${seed.starred.join(" ")}`);
  } else {
    console.log("  (too few palettes to derive a brand — sampleStudio.js falls back to its built-in starter)");
  }
}

main().catch((e) => { console.error(e); process.exit(1); });
