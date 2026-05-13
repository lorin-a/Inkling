import { NextResponse } from "next/server";
import { writeFile, mkdir } from "node:fs/promises";
import { existsSync } from "node:fs";
import { join, extname } from "node:path";
import { createHash } from "node:crypto";
import { mergePins } from "../../../../lib/moodboardStore";
import { extractPalette } from "../../../../lib/extractPalette";
import { getActiveSlug, projectUploadsDir, projectUploadsUrlPrefix } from "../../../../lib/projectRegistry";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const MAX_BYTES = 25 * 1024 * 1024; // 25 MB per file
const ALLOWED_EXT = new Set([".jpg", ".jpeg", ".png", ".webp", ".gif", ".avif"]);

export async function POST(request) {
  let form;
  try {
    form = await request.formData();
  } catch {
    return NextResponse.json({ error: "Body must be multipart/form-data" }, { status: 400 });
  }

  const files = form.getAll("files").filter((v) => v instanceof File);
  const sourceUrl = (form.get("sourceUrl") || "").toString().trim() || null;
  if (files.length === 0) {
    return NextResponse.json({ error: "No files provided" }, { status: 400 });
  }

  const slug = await getActiveSlug();
  if (!slug) {
    return NextResponse.json({ error: "No active project" }, { status: 400 });
  }
  const UPLOAD_DIR = projectUploadsDir(slug);
  const PUBLIC_PREFIX = projectUploadsUrlPrefix(slug);
  await mkdir(UPLOAD_DIR, { recursive: true });

  const results = [];
  const incomingPins = [];

  for (const file of files) {
    if (file.size > MAX_BYTES) {
      results.push({ name: file.name, ok: false, error: `Too large (>${MAX_BYTES / 1024 / 1024}MB)` });
      continue;
    }
    const ext = (extname(file.name).toLowerCase() || ".jpg").replace(/[^.a-z0-9]/g, "");
    if (!ALLOWED_EXT.has(ext)) {
      results.push({ name: file.name, ok: false, error: `Unsupported type ${ext}` });
      continue;
    }

    try {
      const buffer = Buffer.from(await file.arrayBuffer());
      const hash = createHash("sha256").update(buffer).digest("hex").slice(0, 16);
      const filename = `${hash}${ext}`;
      const diskPath = join(UPLOAD_DIR, filename);
      if (!existsSync(diskPath)) {
        await writeFile(diskPath, buffer);
      }
      const publicUrl = `${PUBLIC_PREFIX}/${filename}`;

      let palette = [];
      try {
        palette = await extractPalette(buffer, { k: 7 });
      } catch (e) {
        // keep the upload; extraction failure is non-fatal
        console.error("extract failed for", file.name, e);
      }

      const pin = {
        pinId: `upload-${hash}`,
        pinUrl: null,
        imageDisplay: publicUrl,
        imageOriginal: publicUrl,
        thumbnail236: publicUrl,
        alt: file.name,
        title: stripExt(file.name),
        sourceUrl,
        sourceDomain: sourceUrl ? safeDomain(sourceUrl) : null,
        pinner: null,
        pinnerUrl: null,
        source: "upload",
        uploadedAt: new Date().toISOString(),
        enrichedAt: new Date().toISOString(),
        enrichmentOk: !!sourceUrl,
        palette,
        paletteExtractedAt: palette.length > 0 ? new Date().toISOString() : null,
      };
      incomingPins.push(pin);
      results.push({ name: file.name, ok: true, pinId: pin.pinId, palette });
    } catch (e) {
      results.push({ name: file.name, ok: false, error: e.message });
    }
  }

  if (incomingPins.length > 0) {
    await mergePins(incomingPins, null);
  }

  return NextResponse.json({
    ok: true,
    accepted: incomingPins.length,
    results,
  });
}

function stripExt(name) {
  return (name || "").replace(/\.[^.]+$/, "");
}

function safeDomain(url) {
  try {
    return new URL(url).host.replace(/^www\./, "");
  } catch {
    return null;
  }
}
