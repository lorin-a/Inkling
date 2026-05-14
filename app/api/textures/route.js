import { NextResponse } from "next/server";
import { readdir, writeFile, mkdir, unlink } from "node:fs/promises";
import { existsSync } from "node:fs";
import { join, extname } from "node:path";
import { createHash } from "node:crypto";
import {
  getActiveSlug,
  projectTexturesDir,
  projectTexturesUrlPrefix,
} from "../../../lib/projectRegistry";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const MAX_BYTES = 10 * 1024 * 1024;
const ALLOWED = new Set([".png", ".jpg", ".jpeg", ".webp", ".svg"]);

export async function GET() {
  const slug = await getActiveSlug();
  if (!slug) return NextResponse.json({ textures: [] });
  const dir = projectTexturesDir(slug);
  if (!existsSync(dir)) return NextResponse.json({ textures: [] });
  const entries = await readdir(dir);
  const textures = entries
    .filter((f) => ALLOWED.has(extname(f).toLowerCase()))
    .sort()
    .map((file) => ({
      file,
      url: `${projectTexturesUrlPrefix(slug)}/${file}`,
    }));
  return NextResponse.json({ textures });
}

export async function POST(request) {
  const slug = await getActiveSlug();
  if (!slug) return NextResponse.json({ error: "No active project" }, { status: 400 });

  let form;
  try { form = await request.formData(); }
  catch { return NextResponse.json({ error: "Body must be multipart/form-data" }, { status: 400 }); }

  const files = form.getAll("files").filter((v) => v instanceof File);
  if (files.length === 0) return NextResponse.json({ error: "No files provided" }, { status: 400 });

  const dir = projectTexturesDir(slug);
  await mkdir(dir, { recursive: true });

  const results = [];
  for (const file of files) {
    if (file.size > MAX_BYTES) {
      results.push({ name: file.name, ok: false, error: `Too large (>${MAX_BYTES / 1024 / 1024}MB)` });
      continue;
    }
    const ext = (extname(file.name).toLowerCase() || "").replace(/[^.a-z0-9]/g, "");
    if (!ALLOWED.has(ext)) {
      results.push({ name: file.name, ok: false, error: `Unsupported type ${ext}` });
      continue;
    }
    try {
      const buffer = Buffer.from(await file.arrayBuffer());
      const hash = createHash("sha256").update(buffer).digest("hex").slice(0, 16);
      const filename = `${hash}${ext}`;
      const path = join(dir, filename);
      if (!existsSync(path)) await writeFile(path, buffer);
      results.push({ name: file.name, ok: true, file: filename, url: `${projectTexturesUrlPrefix(slug)}/${filename}` });
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
  if (!file || !/^[a-z0-9._-]+\.(png|jpe?g|webp|svg)$/i.test(file)) {
    return NextResponse.json({ error: "Invalid file" }, { status: 400 });
  }
  const path = join(projectTexturesDir(slug), file);
  if (!existsSync(path)) return NextResponse.json({ error: "Not found" }, { status: 404 });
  try {
    await unlink(path);
    return NextResponse.json({ ok: true });
  } catch (e) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}
