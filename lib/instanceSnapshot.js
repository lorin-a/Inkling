import { readFile, readdir } from "node:fs/promises";
import { existsSync } from "node:fs";
import { join } from "node:path";
import { readProject } from "./projectStore";
import { readLibrary } from "./moodboardStore";
import { readPresets } from "./presetStore";
import {
  getActiveSlug,
  projectMarksDir,
  projectFontsDir,
  projectTexturesDir,
} from "./projectRegistry";

async function gatherMarks(slug) {
  const dir = projectMarksDir(slug);
  if (!existsSync(dir)) return [];
  const entries = await readdir(dir);
  const out = [];
  for (const file of entries.sort()) {
    if (!file.toLowerCase().endsWith(".svg")) continue;
    try {
      const svg = await readFile(join(dir, file), "utf8");
      out.push({ name: file.replace(/\.svg$/i, ""), svg });
    } catch {}
  }
  return out;
}

async function gatherFontFiles(slug) {
  const dir = projectFontsDir(slug);
  if (!existsSync(dir)) return [];
  try {
    const entries = await readdir(dir);
    return entries.map((f) => ({ file: f }));
  } catch {
    return [];
  }
}

async function gatherTextureFiles(slug) {
  const dir = projectTexturesDir(slug);
  if (!existsSync(dir)) return [];
  try {
    const entries = await readdir(dir);
    return entries.map((f) => ({ file: f }));
  } catch {
    return [];
  }
}

/**
 * Snapshot the active project into a self-contained JSON object suitable
 * for storage in the `instances.project_state` jsonb column.
 *
 * Marks are inlined as SVG strings. Library pins keep their existing URLs
 * (Pinterest images are external, so they survive the move to hosted).
 * Uploaded assets (library uploads, font files, texture files) reference
 * paths that only exist on the owner's local filesystem — those need a
 * separate upload-to-Blob step before the hosted view can render them.
 */
export async function snapshotActiveProject() {
  const slug = await getActiveSlug();
  if (!slug) throw new Error("No active project to snapshot");

  const [project, library, presets, marks, fontFiles, textureFiles] = await Promise.all([
    readProject(slug),
    readLibrary(slug),
    readPresets(slug),
    gatherMarks(slug),
    gatherFontFiles(slug),
    gatherTextureFiles(slug),
  ]);

  return {
    schemaVersion: 1,
    capturedAt: new Date().toISOString(),
    slug,
    project,
    library,
    presets,
    marks,
    fontFiles,
    textureFiles,
  };
}
