#!/usr/bin/env node
/**
 * Build the Sanzo Wada starter pool from the vendored source.
 *
 * Sanzo Wada's "A Dictionary of Color Combinations" (1933) — 159 colors in
 * 348 historical combinations. Source data: mattdesl/dictionary-of-colour-
 * combinations (MIT). We vendor the raw colors at
 * data/palettes/sanzo-wada.source.json and bake a small runtime artifact so
 * the client bundle carries only what it needs, not the full record.
 *
 * Output: lib/sanzoWada.data.json
 *   { pool: [hex,...],                       // 159 unique colors
 *     combinations: [{ id, hexes:[hex,...] }] }  // size 3-4 only — usable as
 *                                                // ready-made brand palettes
 *
 * Run: node scripts/build-sanzo.mjs
 */
import { readFile, writeFile } from "node:fs/promises";

const src = JSON.parse(
  await readFile(new URL("../data/palettes/sanzo-wada.source.json", import.meta.url)),
);

// Flat pool: every unique color, dominant ones first isn't meaningful here,
// so just dedupe in source order.
const pool = [...new Set(src.map((c) => c.hex.toLowerCase()))];

// Group colors by combination id. Keep only 3- and 4-color combinations —
// they read as complete palettes; pairs are too thin to seed a brand.
const byId = {};
for (const c of src) {
  for (const id of c.combinations || []) {
    (byId[id] = byId[id] || []).push(c.hex.toLowerCase());
  }
}
const combinations = Object.entries(byId)
  .map(([id, hexes]) => ({ id: Number(id), hexes }))
  .filter((c) => c.hexes.length >= 3 && c.hexes.length <= 4)
  .sort((a, b) => a.id - b.id);

const out = {
  attribution: "Sanzo Wada, A Dictionary of Color Combinations (1933). Data: mattdesl/dictionary-of-colour-combinations (MIT).",
  pool,
  combinations,
};

await writeFile(
  new URL("../lib/sanzoWada.data.json", import.meta.url),
  JSON.stringify(out),
  "utf8",
);

console.log(`Sanzo Wada baked: ${pool.length} colors, ${combinations.length} combinations (3-4 colors).`);
