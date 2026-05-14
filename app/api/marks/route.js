import { NextResponse } from "next/server";
import { readdir, writeFile, mkdir, unlink } from "node:fs/promises";
import { existsSync } from "node:fs";
import { join } from "node:path";
import {
  getActiveSlug,
  projectMarksDir,
  projectMarksUrlPrefix,
} from "../../../lib/projectRegistry";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const MAX_BYTES = 1 * 1024 * 1024;

export async function GET() {
  const slug = await getActiveSlug();
  if (!slug) return NextResponse.json({ marks: [] });
  const dir = projectMarksDir(slug);
  if (!existsSync(dir)) return NextResponse.json({ marks: [] });
  const entries = await readdir(dir);
  const marks = entries
    .filter((f) => f.toLowerCase().endsWith(".svg"))
    .sort()
    .map((file) => ({
      name: file.replace(/\.svg$/i, ""),
      file,
      url: `${projectMarksUrlPrefix(slug)}/${file}`,
    }));
  return NextResponse.json({ marks });
}

export async function POST(request) {
  const slug = await getActiveSlug();
  if (!slug) return NextResponse.json({ error: "No active project" }, { status: 400 });

  let form;
  try { form = await request.formData(); }
  catch { return NextResponse.json({ error: "Body must be multipart/form-data" }, { status: 400 }); }

  const files = form.getAll("files").filter((v) => v instanceof File);
  if (files.length === 0) return NextResponse.json({ error: "No files provided" }, { status: 400 });

  const dir = projectMarksDir(slug);
  await mkdir(dir, { recursive: true });
  const existing = new Set((existsSync(dir) ? await readdir(dir) : []).map((f) => f.toLowerCase()));

  const results = [];
  for (const file of files) {
    if (file.size > MAX_BYTES) {
      results.push({ name: file.name, ok: false, error: `Too large (>${MAX_BYTES / 1024 / 1024}MB)` });
      continue;
    }
    if (!file.name.toLowerCase().endsWith(".svg")) {
      results.push({ name: file.name, ok: false, error: "Only .svg accepted" });
      continue;
    }
    try {
      const text = await file.text();
      if (!/<svg[\s>]/i.test(text)) {
        results.push({ name: file.name, ok: false, error: "Not a valid SVG" });
        continue;
      }
      const safeBase = file.name
        .replace(/\.svg$/i, "")
        .toLowerCase()
        .replace(/[^a-z0-9-]+/g, "-")
        .replace(/^-+|-+$/g, "")
        .slice(0, 48) || "mark";
      let candidate = `${safeBase}.svg`;
      let i = 2;
      while (existing.has(candidate.toLowerCase())) {
        candidate = `${safeBase}-${i}.svg`;
        i += 1;
      }
      existing.add(candidate.toLowerCase());
      await writeFile(join(dir, candidate), text, "utf8");
      results.push({ name: file.name, ok: true, file: candidate });
    } catch (e) {
      results.push({ name: file.name, ok: false, error: e.message });
    }
  }
  return NextResponse.json({ ok: true, results });
}

export async function DELETE(request) {
  const slug = await getActiveSlug();
  if (!slug) return NextResponse.json({ error: "No active project" }, { status: 400 });
  const { searchParams } = new URL(request.url);
  const file = (searchParams.get("file") || "").trim();
  if (!file || !/^[a-z0-9._-]+\.svg$/i.test(file)) {
    return NextResponse.json({ error: "Invalid file" }, { status: 400 });
  }
  const path = join(projectMarksDir(slug), file);
  if (!existsSync(path)) return NextResponse.json({ error: "Not found" }, { status: 404 });
  try {
    await unlink(path);
    return NextResponse.json({ ok: true });
  } catch (e) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}
