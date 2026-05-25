import { readFile, writeFile, mkdir } from "node:fs/promises";
import { existsSync } from "node:fs";
import { dirname, join } from "node:path";
import { getActiveSlug, projectDir } from "./projectRegistry";

const EMPTY = {
  brand: {},
  inspiration: {
    source: [],
    curated: {},
  },
};

function palettePath(slug) {
  return join(projectDir(slug), "palette.json");
}

export async function readProjectPalette(slugOverride) {
  const slug = slugOverride || (await getActiveSlug());
  if (!slug) return structuredClone(EMPTY);
  const file = palettePath(slug);
  if (!existsSync(file)) return structuredClone(EMPTY);
  try {
    const raw = await readFile(file, "utf8");
    const parsed = JSON.parse(raw);
    return {
      brand: parsed.brand || {},
      inspiration: {
        source: parsed.inspiration?.source || parsed.inspiration?.master || [],
        curated: parsed.inspiration?.curated || {},
      },
    };
  } catch {
    return structuredClone(EMPTY);
  }
}

export async function writeProjectPalette(data, slugOverride) {
  const slug = slugOverride || (await getActiveSlug());
  if (!slug) throw new Error("No active project");
  const file = palettePath(slug);
  await mkdir(dirname(file), { recursive: true });
  await writeFile(file, JSON.stringify(data, null, 2), "utf8");
}
