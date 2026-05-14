import { NextResponse } from "next/server";
import { writeFile, mkdir } from "node:fs/promises";
import { existsSync } from "node:fs";
import { join, extname } from "node:path";
import { createHash } from "node:crypto";
import { getActiveSlug, projectFontsDir, projectFontsUrlPrefix } from "../../../../lib/projectRegistry";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const MAX_BYTES = 5 * 1024 * 1024;
const ALLOWED = new Set([".woff2", ".woff", ".otf", ".ttf"]);

export async function POST(request) {
  const slug = await getActiveSlug();
  if (!slug) return NextResponse.json({ error: "No active project" }, { status: 400 });

  let form;
  try { form = await request.formData(); }
  catch { return NextResponse.json({ error: "Body must be multipart/form-data" }, { status: 400 }); }

  const file = form.get("file");
  if (!(file instanceof File)) return NextResponse.json({ error: "No file provided" }, { status: 400 });
  if (file.size > MAX_BYTES) {
    return NextResponse.json({ error: `Too large (>${MAX_BYTES / 1024 / 1024}MB)` }, { status: 400 });
  }
  const ext = (extname(file.name).toLowerCase() || "").replace(/[^.a-z0-9]/g, "");
  if (!ALLOWED.has(ext)) {
    return NextResponse.json({ error: `Unsupported type ${ext}` }, { status: 400 });
  }

  try {
    const buffer = Buffer.from(await file.arrayBuffer());
    const hash = createHash("sha256").update(buffer).digest("hex").slice(0, 16);
    const filename = `${hash}${ext}`;
    const dir = projectFontsDir(slug);
    await mkdir(dir, { recursive: true });
    const path = join(dir, filename);
    if (!existsSync(path)) await writeFile(path, buffer);
    const url = `${projectFontsUrlPrefix(slug)}/${filename}`;
    return NextResponse.json({ ok: true, url, filename, originalName: file.name });
  } catch (e) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}
