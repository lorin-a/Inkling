import { readFile, writeFile, mkdir, readdir, rename, stat, unlink } from "node:fs/promises";
import { existsSync } from "node:fs";
import { join } from "node:path";

/**
 * Multi-project registry.
 *
 * Each project lives at data/projects/{slug}/ with these files:
 *   project.json   — name, wordmark, tagline, body, etc.
 *   library.json   — pins, starred, palettes (moodboard data)
 *
 * Uploaded images live at public/projects/{slug}/uploads/{hash}.{ext}.
 *
 * The active project is recorded in data/active-project.json so all the
 * existing routes (/api/project, /api/library/*, etc.) can resolve which
 * project’s data to read/write.
 *
 * On first run, any legacy files at:
 *   data/project.json
 *   data/moodboard/library.json
 *   public/moodboard/uploads/
 * are migrated to projects/whelm/.
 */

const ROOT = process.cwd();
const DATA_DIR = join(ROOT, "data");
const PROJECTS_DIR = join(DATA_DIR, "projects");
const PUBLIC_PROJECTS_DIR = join(ROOT, "public", "projects");
const ACTIVE_FILE = join(DATA_DIR, "active-project.json");

const DEFAULT_PROJECT = {
  wordmark: "wordmark",
  period: ".",
  initial: "w",
  tagline: "",
  body: "",
};

export function projectDir(slug) {
  return join(PROJECTS_DIR, slug);
}

export function projectLibraryPath(slug) {
  return join(projectDir(slug), "library.json");
}

export function projectConfigPath(slug) {
  return join(projectDir(slug), "project.json");
}

export function projectMoodboardsPath(slug) {
  return join(projectDir(slug), "moodboards.json");
}

// The well is cross-project (one library per tenant), so it lives at the top of
// data/, NOT under projects/{slug}/ — atoms span every project.
export function atomsWellPath() {
  return join(DATA_DIR, "atoms-well.json");
}

export function projectUploadsDir(slug) {
  return join(PUBLIC_PROJECTS_DIR, slug, "uploads");
}

export function projectUploadsUrlPrefix(slug) {
  return `/projects/${slug}/uploads`;
}

export function projectMarksDir(slug) {
  return join(PUBLIC_PROJECTS_DIR, slug, "marks");
}

export function projectMarksUrlPrefix(slug) {
  return `/projects/${slug}/marks`;
}

export function projectFontsDir(slug) {
  return join(PUBLIC_PROJECTS_DIR, slug, "fonts");
}

export function projectFontsUrlPrefix(slug) {
  return `/projects/${slug}/fonts`;
}

export function projectTexturesDir(slug) {
  return join(PUBLIC_PROJECTS_DIR, slug, "textures");
}

export function projectTexturesUrlPrefix(slug) {
  return `/projects/${slug}/textures`;
}

/**
 * Ensure the projects/ tree exists. Idempotent.
 */
async function ensureBase() {
  await mkdir(PROJECTS_DIR, { recursive: true });
  await mkdir(PUBLIC_PROJECTS_DIR, { recursive: true });
}

/**
 * Migrate any legacy single-tenant files to projects/whelm/. Runs once;
 * idempotent (no-op if migration has already happened).
 */
async function migrateIfNeeded() {
  await ensureBase();
  const legacyProject = join(DATA_DIR, "project.json");
  const legacyLibrary = join(DATA_DIR, "moodboard", "library.json");
  const legacyUploads = join(ROOT, "public", "moodboard", "uploads");
  const targetSlug = "whelm";
  const targetDir = projectDir(targetSlug);

  // If the target project already exists, assume migration is complete.
  if (existsSync(join(targetDir, "project.json")) || existsSync(join(targetDir, "library.json"))) {
    return;
  }

  await mkdir(targetDir, { recursive: true });

  if (existsSync(legacyProject)) {
    try {
      await rename(legacyProject, join(targetDir, "project.json"));
    } catch {}
  }
  if (existsSync(legacyLibrary)) {
    try {
      await rename(legacyLibrary, join(targetDir, "library.json"));
    } catch {}
  }
  if (existsSync(legacyUploads)) {
    const target = projectUploadsDir(targetSlug);
    try {
      await mkdir(join(PUBLIC_PROJECTS_DIR, targetSlug), { recursive: true });
      await rename(legacyUploads, target);
    } catch {}
  }

  // Marks were originally global at public/marks/. Move them under
  // the whelm project so they become per-project.
  const legacyMarks = join(ROOT, "public", "marks");
  if (existsSync(legacyMarks)) {
    const targetMarks = projectMarksDir(targetSlug);
    if (!existsSync(targetMarks)) {
      try {
        await mkdir(join(PUBLIC_PROJECTS_DIR, targetSlug), { recursive: true });
        await rename(legacyMarks, targetMarks);
      } catch {}
    }
  }

  // If no active project recorded yet, set it.
  if (!existsSync(ACTIVE_FILE)) {
    await writeFile(ACTIVE_FILE, JSON.stringify({ slug: targetSlug }, null, 2));
  }
}

export async function listProjects() {
  await migrateIfNeeded();
  const out = [];
  try {
    const entries = await readdir(PROJECTS_DIR, { withFileTypes: true });
    for (const e of entries) {
      if (!e.isDirectory()) continue;
      const slug = e.name;
      const configPath = projectConfigPath(slug);
      let project = { name: slug, slug };
      if (existsSync(configPath)) {
        try {
          const raw = await readFile(configPath, "utf8");
          project = { ...project, ...JSON.parse(raw), slug };
        } catch {}
      }
      // Stats
      let pins = 0;
      const libPath = projectLibraryPath(slug);
      if (existsSync(libPath)) {
        try {
          const raw = await readFile(libPath, "utf8");
          const lib = JSON.parse(raw);
          pins = Object.keys(lib.pins || {}).length;
        } catch {}
      }
      let updatedAt = null;
      try {
        const s = await stat(projectDir(slug));
        updatedAt = s.mtime.toISOString();
      } catch {}
      out.push({ ...project, pins, updatedAt });
    }
  } catch {}
  return out.sort((a, b) => (b.updatedAt || "").localeCompare(a.updatedAt || ""));
}

export async function getActiveSlug() {
  await migrateIfNeeded();
  if (!existsSync(ACTIVE_FILE)) return null;
  try {
    const raw = await readFile(ACTIVE_FILE, "utf8");
    const { slug } = JSON.parse(raw);
    if (slug && existsSync(projectDir(slug))) return slug;
  } catch {}
  return null;
}

export async function setActiveSlug(slug) {
  await migrateIfNeeded();
  if (!existsSync(projectDir(slug))) throw new Error(`No such project: ${slug}`);
  await writeFile(ACTIVE_FILE, JSON.stringify({ slug }, null, 2));
  return slug;
}

/**
 * Normalize a user-supplied name into a safe lowercase slug.
 */
export function makeSlug(name) {
  return String(name || "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 48);
}

export async function createProject({ name, slug }) {
  await ensureBase();
  const finalSlug = slug ? makeSlug(slug) : makeSlug(name);
  if (!finalSlug) throw new Error("Invalid project name");
  const dir = projectDir(finalSlug);
  if (existsSync(dir)) throw new Error(`Project "${finalSlug}" already exists`);
  await mkdir(dir, { recursive: true });
  const project = {
    name: String(name || finalSlug).slice(0, 80),
    slug: finalSlug,
    ...DEFAULT_PROJECT,
    createdAt: new Date().toISOString(),
  };
  await writeFile(projectConfigPath(finalSlug), JSON.stringify(project, null, 2));
  await writeFile(projectLibraryPath(finalSlug), JSON.stringify({
    schemaVersion: 1,
    pins: {},
    boards: [],
    starred: [],
  }, null, 2));
  await setActiveSlug(finalSlug);
  return project;
}
