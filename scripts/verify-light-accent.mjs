import { readFileSync } from "node:fs";
import { composePalette } from "../lib/composePalette.js";
import { derivePreviewRoles } from "../lib/derivePreviewRoles.js";
import { contrastRatio, deltaEOK } from "../lib/colorTheory.js";

const here = (p) => new URL(p, import.meta.url);

// --- Composed path: build a pool like a real board produces. ---
const p = JSON.parse(readFileSync(here("../data/projects/whelm/palette.json")));
const pool = [
  ...Object.values(p.brand ?? {}),
  ...Object.values(p.inspiration?.curated ?? {}).flat(),
].filter((h, i, a) => /^#[0-9a-f]{6}$/i.test(h) && a.indexOf(h) === i);

function measure(label, getRoles, n) {
  let lightFail = 0, lightTwin = 0, darkFail = 0, lightSum = 0;
  for (let i = 0; i < n; i++) {
    const { light, dark } = getRoles(i);
    if (contrastRatio(light.accent, light.bg) < 3.0) lightFail++;
    if (deltaEOK(light.accent, light.muted) < 0.12) lightTwin++;
    if (contrastRatio(dark.accent, dark.bg) < 3.0) darkFail++;
    lightSum += contrastRatio(light.accent, light.bg);
  }
  console.log(`\n${label} (n=${n})`);
  console.log(`  LIGHT accent fails 3:1   : ${lightFail} (${((lightFail / n) * 100).toFixed(0)}%)`);
  console.log(`  LIGHT accent===muted twin: ${lightTwin} (${((lightTwin / n) * 100).toFixed(0)}%)`);
  console.log(`  LIGHT avg accent contrast: ${(lightSum / n).toFixed(2)}:1`);
  console.log(`  DARK  accent fails 3:1   : ${darkFail} (${((darkFail / n) * 100).toFixed(0)}%)`);
}

measure("COMPOSED (/brand shuffle, hero)", () => {
  const palette = composePalette({ pool, size: 5 });
  return {
    light: derivePreviewRoles(palette, "light", { sourceKind: "composed" }),
    dark: derivePreviewRoles(palette, "dark", { sourceKind: "composed" }),
  };
}, 200);

// --- Pin path: real extracted pin palettes (what /colors rows render). ---
const lib = JSON.parse(readFileSync(here("../data/projects/whelm/library.json")));
const pins = (Array.isArray(lib.pins) ? lib.pins : Object.values(lib.pins ?? lib))
  .filter((x) => x && Array.isArray(x.palette) && x.palette.length >= 3)
  .map((x) => x.palette);

measure("PIN (/colors rows)", (i) => {
  const palette = pins[i % pins.length];
  return {
    light: derivePreviewRoles(palette, "light", { sourceKind: "pin" }),
    dark: derivePreviewRoles(palette, "dark", { sourceKind: "pin" }),
  };
}, pins.length);
