import { NextResponse } from "next/server";
import { readLibrary, patchPin as filePatchPin } from "../../../../lib/moodboardStore";
import * as dbLibrary from "../../../../lib/db/library";
import { extractPalette } from "../../../../lib/extractPalette";
import { getActiveProjectForUser, getRequestContext } from "../../../../lib/api/context";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(request) {
  let body;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }
  const { pinId } = body || {};
  if (!pinId) return NextResponse.json({ error: "Missing pinId" }, { status: 400 });

  const { userId } = await getRequestContext();

  let pin;
  let writePatch;

  if (userId) {
    const active = await getActiveProjectForUser(userId);
    if (!active) return NextResponse.json({ error: "No active project" }, { status: 400 });
    const lib = await dbLibrary.readLibrary({ projectId: active.id });
    pin = lib.pins[pinId];
    writePatch = (patch) => dbLibrary.patchPin({ projectId: active.id, pinId, patch });
  } else {
    const lib = await readLibrary();
    pin = lib.pins[pinId];
    writePatch = (patch) => filePatchPin(pinId, patch);
  }

  if (!pin) return NextResponse.json({ error: "Pin not found" }, { status: 404 });

  const imageUrl = pin.imageOriginal || pin.imageDisplay || pin.thumbnail236;
  if (!imageUrl) return NextResponse.json({ error: "Pin has no image URL" }, { status: 400 });

  let palette;
  try {
    palette = await extractPalette(imageUrl, { k: 7 });
  } catch (e) {
    if (pin.imageDisplay && imageUrl !== pin.imageDisplay) {
      try {
        palette = await extractPalette(pin.imageDisplay, { k: 7 });
      } catch (e2) {
        return NextResponse.json({ error: e2.message }, { status: 502 });
      }
    } else {
      return NextResponse.json({ error: e.message }, { status: 502 });
    }
  }

  await writePatch({ palette, paletteExtractedAt: new Date().toISOString() });
  return NextResponse.json({ pinId, palette });
}
