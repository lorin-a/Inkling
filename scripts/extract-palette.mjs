#!/usr/bin/env node
// One-off extractor. Downloads Figma MCP asset PNGs (expire 7 days from fetch),
// pixel-samples each swatch center, writes data/palette.json with hex values.
//
// Run: npm run extract

import { writeFile, mkdir } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";
import sharp from "sharp";

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = join(__dirname, "..");
const ASSETS = join(ROOT, "public", "figma-assets");

// ---------- Figma asset URLs (captured from MCP responses, expire ~7 days) ----------

// Frame 2 (Colors) rasterized — contains every inspiration swatch
const COLORS_PNG = "https://www.figma.com/api/mcp/asset/fbb8d191-18e0-4acf-9378-c280d7f83285";

// Frame 1 (Brand) swatch row — 7 individual ellipse PNGs
const BRAND_SWATCHES = {
  "ellipse-780": "https://www.figma.com/api/mcp/asset/3b0f6800-ad6f-47ea-9024-e3e887e00b2b",
  "ellipse-788": "https://www.figma.com/api/mcp/asset/f1acd416-7df7-455c-ab27-09039bd62a1c",
  "ellipse-789": "https://www.figma.com/api/mcp/asset/372b7e73-401a-423f-8551-94b7bea9ec6f",
  "ellipse-790": "https://www.figma.com/api/mcp/asset/0cd4ef8b-e377-4ed9-9f68-5031db4d7522",
  "ellipse-791": "https://www.figma.com/api/mcp/asset/5b88f453-382e-4b07-a79e-d12277c2562f",
  "ellipse-792": "https://www.figma.com/api/mcp/asset/0024b462-d740-4e65-ad10-2af9689dc3fe",
  "ellipse-793": "https://www.figma.com/api/mcp/asset/03b99f70-1ca9-4156-a3a6-e4caffd1dcc7",
};

// Frame 2 ellipse positions, sourced from get_metadata. Coordinates are within
// the Colors frame (1920x1080). Each ellipse is 56x56. We sample the center.
//
// Structure: { id, x, y, name, group }
// "group" labels which palette cluster the swatch belongs to (master = the big
// inspiration grid; everything else is one of Lorin's curated row palettes).
const COLORS_FRAME_W = 1920;
const COLORS_FRAME_H = 1080;
const SWATCH_SIZE = 56;

const COLORS_SWATCHES = [
  // master grid (Frame 1430105642) at x=84, y=203, 6 cols x 5 rows
  ...gridSwatches({ ox: 84, oy: 203, cols: 6, rows: 5, stepX: 72, stepY: 78, group: "source", ellipseIds: [
    "769", "770", "771", "772", "773", "774",
    "745", "749", "753", "757", "761", "765",
    "746", "750", "754", "758", "762", "766",
    "747", "751", "755", "759", "763", "767",
    "748", "752", "756", "760", "764", "768",
  ]}),
  // Frame 1430105625 (vertical 5-col rotated) at x=1048, y=495 — actually horizontal 5 swatches
  // Per metadata: rotate(90) container wrapping a 56x344 column. Treat as horizontal row.
  ...rowSwatches({ ox: 704, oy: 495, count: 5, stepX: 72, group: "row-1430105625", ellipseIds: ["783","784","785","786","787"] }),
  ...rowSwatches({ ox: 709, oy: 748, count: 4, stepX: 74, group: "row-1430105626", ellipseIds: ["769","770","771","772"] }),
  ...rowSwatches({ ox: 707, oy: 331, count: 5, stepX: 74, group: "row-1430105628", ellipseIds: ["775","776","777","778","779"] }),
  ...rowSwatches({ ox: 709, oy: 663, count: 4, stepX: 72, group: "row-1430105627", ellipseIds: ["773","774","781","782"] }),
  ...rowSwatches({ ox: 701, oy: 239, count: 5, stepX: 77, group: "row-1430105629", ellipseIds: ["780","788","789","790","791"] }),
  ...rowSwatches({ ox: 1071, oy: 634, count: 5, stepX: 77, group: "row-1430105623", ellipseIds: ["792","793","794","795","796"] }),
  ...rowSwatches({ ox: 81, oy: 831, count: 6, stepX: 77, group: "row-1430105624", ellipseIds: ["780","788","789","790","791","792"] }),
  ...rowSwatches({ ox: 707, oy: 416, count: 5, stepX: 77, group: "row-1430105630", ellipseIds: ["780","788","789","790","791"] }),
  ...rowSwatches({ ox: 1206, oy: 550, count: 7, stepX: 77, group: "row-1430105631", ellipseIds: ["788","780","789","790","791","792","793"] }),
  ...rowSwatches({ ox: 1206, oy: 363, count: 6, stepX: 77, group: "row-1430105632", ellipseIds: ["788","780","789","792","790","791"] }),
  ...rowSwatches({ ox: 715, oy: 886, count: 3, stepX: 77, group: "row-1430105633", ellipseIds: ["788","780","789"] }),
  ...rowSwatches({ ox: 81, oy: 638, count: 6, stepX: 77, group: "row-1430105634", ellipseIds: ["788","780","789","790","791","792"] }),
  ...rowSwatches({ ox: 1206, oy: 465, count: 7, stepX: 77, group: "row-1430105635", ellipseIds: ["788","780","789","790","791","792","793"] }),
  ...rowSwatches({ ox: 713, oy: 815, count: 4, stepX: 77, group: "row-1430105636", ellipseIds: ["788","780","789","790"] }),
  ...rowSwatches({ ox: 84, oy: 105, count: 4, stepX: 77, group: "row-1430105643", ellipseIds: ["788","780","789","790"] }),
  ...rowSwatches({ ox: 82, oy: 736, count: 6, stepX: 77, group: "row-1430105637", ellipseIds: ["788","780","789","790","791","792"] }),
  ...rowSwatches({ ox: 701, oy: 158, count: 5, stepX: 77, group: "row-1430105638", ellipseIds: ["788","780","789","790","791"] }),
  ...rowSwatches({ ox: 1206, oy: 732, count: 8, stepX: 77, group: "row-1430105639", ellipseIds: ["788","780","789","790","791","792","793","794"] }),
  ...rowSwatches({ ox: 1206, oy: 648, count: 6, stepX: 77, group: "row-1430105640", ellipseIds: ["788","780","789","790","791","792"] }),
  ...rowSwatches({ ox: 1206, oy: 278, count: 7, stepX: 77, group: "row-1430105641", ellipseIds: ["788","780","789","790","791","792","793"] }),
];

function gridSwatches({ ox, oy, cols, rows, stepX, stepY, group, ellipseIds }) {
  const out = [];
  let i = 0;
  for (let r = 0; r < rows; r++) {
    for (let c = 0; c < cols; c++) {
      out.push({
        id: `${group}-r${r}-c${c}`,
        ellipse: ellipseIds[i++],
        x: ox + c * stepX,
        y: oy + r * stepY,
        group,
      });
    }
  }
  return out;
}

function rowSwatches({ ox, oy, count, stepX, group, ellipseIds }) {
  const out = [];
  for (let i = 0; i < count; i++) {
    out.push({
      id: `${group}-${i}`,
      ellipse: ellipseIds[i],
      x: ox + i * stepX,
      y: oy,
      group,
    });
  }
  return out;
}

// ---------- helpers ----------

async function download(url, filename) {
  const res = await fetch(url);
  if (!res.ok) throw new Error(`Failed to fetch ${url}: ${res.status}`);
  const buf = Buffer.from(await res.arrayBuffer());
  await writeFile(join(ASSETS, filename), buf);
  return buf;
}

function toHex(r, g, b) {
  return "#" + [r, g, b].map((v) => v.toString(16).padStart(2, "0")).join("");
}

async function sampleCenter(buf) {
  const img = sharp(buf);
  const { width, height } = await img.metadata();
  // Sample a small 4x4 patch at center and average to avoid PNG fringe noise.
  const cx = Math.floor(width / 2) - 2;
  const cy = Math.floor(height / 2) - 2;
  const { data } = await img
    .extract({ left: cx, top: cy, width: 4, height: 4 })
    .raw()
    .toBuffer({ resolveWithObject: true });
  // data is RGBA or RGB; sharp returns 3 channels by default for PNG without alpha.
  // Detect channel count from length.
  const channels = data.length / 16;
  let r = 0, g = 0, b = 0;
  for (let i = 0; i < 16; i++) {
    r += data[i * channels];
    g += data[i * channels + 1];
    b += data[i * channels + 2];
  }
  return toHex(Math.round(r / 16), Math.round(g / 16), Math.round(b / 16));
}

async function samplePoint(buf, x, y) {
  // Sample a 4x4 patch centered at (x, y).
  const left = Math.max(0, Math.floor(x) - 2);
  const top = Math.max(0, Math.floor(y) - 2);
  const { data } = await sharp(buf)
    .extract({ left, top, width: 4, height: 4 })
    .raw()
    .toBuffer({ resolveWithObject: true });
  const channels = data.length / 16;
  let r = 0, g = 0, b = 0;
  for (let i = 0; i < 16; i++) {
    r += data[i * channels];
    g += data[i * channels + 1];
    b += data[i * channels + 2];
  }
  return toHex(Math.round(r / 16), Math.round(g / 16), Math.round(b / 16));
}

// ---------- main ----------

async function main() {
  await mkdir(ASSETS, { recursive: true });

  // Brand swatches (each is a tiny PNG of a single circle)
  console.log("Sampling brand swatches…");
  const brand = {};
  for (const [name, url] of Object.entries(BRAND_SWATCHES)) {
    const buf = await download(url, `${name}.png`);
    brand[name] = await sampleCenter(buf);
    console.log(`  ${name} → ${brand[name]}`);
  }

  // Colors grid (one big rasterized PNG)
  console.log("\nDownloading Colors frame PNG…");
  const colorsBuf = await download(COLORS_PNG, "colors-frame.png");
  const meta = await sharp(colorsBuf).metadata();
  console.log(`  PNG size: ${meta.width}x${meta.height}`);

  // The Figma frame is 1920x1080. PNG may be rendered at 1x or 2x.
  const scaleX = meta.width / COLORS_FRAME_W;
  const scaleY = meta.height / COLORS_FRAME_H;
  console.log(`  scale: ${scaleX.toFixed(2)}x / ${scaleY.toFixed(2)}x\n`);

  console.log("Sampling Colors swatches…");
  const colors = [];
  for (const sw of COLORS_SWATCHES) {
    const cxFrame = sw.x + SWATCH_SIZE / 2;
    const cyFrame = sw.y + SWATCH_SIZE / 2;
    const hex = await samplePoint(colorsBuf, cxFrame * scaleX, cyFrame * scaleY);
    colors.push({ ...sw, hex });
  }

  // Dedupe master grid into the canonical palette pool.
  const masterPool = colors.filter((c) => c.group === "master").map((c) => c.hex);
  const uniqueHexes = [...new Set(colors.map((c) => c.hex.toLowerCase()))];

  // Build curated palette groupings (Lorin's hand-pulled rows).
  const curatedGroups = {};
  for (const c of colors) {
    if (c.group === "master") continue;
    (curatedGroups[c.group] ??= []).push(c.hex);
  }

  const palette = {
    generated: new Date().toISOString(),
    brand,
    inspiration: {
      master: masterPool,
      curated: curatedGroups,
      uniqueHexes,
    },
    raw: colors,
  };

  await writeFile(join(ROOT, "data", "palette.json"), JSON.stringify(palette, null, 2));
  console.log(`\n✓ Wrote data/palette.json`);
  console.log(`  brand swatches: ${Object.keys(brand).length}`);
  console.log(`  master grid: ${masterPool.length}`);
  console.log(`  curated groups: ${Object.keys(curatedGroups).length}`);
  console.log(`  unique hexes (all): ${uniqueHexes.length}`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
