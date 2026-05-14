import { readFile, writeFile, mkdir } from "node:fs/promises";
import { existsSync } from "node:fs";
import { dirname, join } from "node:path";
import { getActiveSlug, projectDir } from "./projectRegistry";

function presetsPath(slug) {
  return join(projectDir(slug), "presets.json");
}

export async function readPresets(slugOverride) {
  const slug = slugOverride || (await getActiveSlug());
  if (!slug) return [];
  const file = presetsPath(slug);
  if (!existsSync(file)) return [];
  try {
    const raw = await readFile(file, "utf8");
    const data = JSON.parse(raw);
    return Array.isArray(data?.presets) ? data.presets : [];
  } catch {
    return [];
  }
}

export async function writePresets(presets, slugOverride) {
  const slug = slugOverride || (await getActiveSlug());
  if (!slug) throw new Error("No active project");
  const file = presetsPath(slug);
  await mkdir(dirname(file), { recursive: true });
  await writeFile(file, JSON.stringify({ presets }, null, 2), "utf8");
}

export async function addPreset(preset, slugOverride) {
  const presets = await readPresets(slugOverride);
  const id = `p_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 6)}`;
  const next = [
    {
      id,
      name: String(preset.name || "Untitled preset").slice(0, 80),
      ts: new Date().toISOString(),
      palette: Array.isArray(preset.palette) ? preset.palette : [],
      size: Number.isFinite(preset.size) ? preset.size : (preset.palette?.length || 5),
      poolKey: typeof preset.poolKey === "string" ? preset.poolKey : "starred",
      roleOverrides: preset.roleOverrides || { dark: {}, light: {} },
      fonts: preset.fonts || {},
      textures: preset.textures || {},
    },
    ...presets,
  ].slice(0, 100);
  await writePresets(next, slugOverride);
  return next[0];
}

export async function removePreset(id, slugOverride) {
  const presets = await readPresets(slugOverride);
  const next = presets.filter((p) => p.id !== id);
  await writePresets(next, slugOverride);
  return next;
}
