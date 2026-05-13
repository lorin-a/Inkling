import { readFile, writeFile, mkdir } from "node:fs/promises";
import { existsSync } from "node:fs";
import { join, dirname } from "node:path";

const ROOT = process.cwd();
const FILE = join(ROOT, "data", "project.json");

const DEFAULTS = {
  name: "Whelm",
  slug: "whelm",
  wordmark: "whelm",
  period: ".",
  initial: "w",
  tagline: "Find your way to feeling",
  body: "A ritual for cultivating a relationship with your intuition",
};

export async function readProject() {
  if (!existsSync(FILE)) return { ...DEFAULTS };
  try {
    const raw = await readFile(FILE, "utf8");
    return { ...DEFAULTS, ...JSON.parse(raw) };
  } catch {
    return { ...DEFAULTS };
  }
}

export async function writeProject(patch) {
  const current = await readProject();
  const next = { ...current, ...patch };
  // Sanitize — keep strings as strings, trim, cap reasonable lengths.
  for (const key of ["name", "wordmark", "period", "initial", "tagline", "body"]) {
    if (typeof next[key] === "string") next[key] = next[key].slice(0, 400);
  }
  await mkdir(dirname(FILE), { recursive: true });
  await writeFile(FILE, JSON.stringify(next, null, 2), "utf8");
  return next;
}
