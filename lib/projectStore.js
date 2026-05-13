import { readFile, writeFile, mkdir } from "node:fs/promises";
import { existsSync } from "node:fs";
import { dirname } from "node:path";
import { getActiveSlug, projectConfigPath } from "./projectRegistry";

const DEFAULTS = {
  name: "Untitled",
  slug: "untitled",
  wordmark: "wordmark",
  period: ".",
  initial: "w",
  tagline: "",
  body: "",
};

export async function readProject(slugOverride) {
  const slug = slugOverride || (await getActiveSlug());
  if (!slug) return { ...DEFAULTS };
  const file = projectConfigPath(slug);
  if (!existsSync(file)) return { ...DEFAULTS, slug };
  try {
    const raw = await readFile(file, "utf8");
    return { ...DEFAULTS, ...JSON.parse(raw), slug };
  } catch {
    return { ...DEFAULTS, slug };
  }
}

export async function writeProject(patch, slugOverride) {
  const slug = slugOverride || (await getActiveSlug());
  if (!slug) throw new Error("No active project");
  const current = await readProject(slug);
  const next = { ...current, ...patch, slug };
  for (const key of ["name", "wordmark", "period", "initial", "tagline", "body"]) {
    if (typeof next[key] === "string") next[key] = next[key].slice(0, 400);
  }
  const file = projectConfigPath(slug);
  await mkdir(dirname(file), { recursive: true });
  await writeFile(file, JSON.stringify(next, null, 2), "utf8");
  return next;
}
