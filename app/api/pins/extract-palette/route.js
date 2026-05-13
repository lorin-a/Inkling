import { NextResponse } from "next/server";
import { readLibrary, patchPin } from "../../../../lib/moodboardStore";
import { extractPalette } from "../../../../lib/extractPalette";

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

  const lib = await readLibrary();
  const pin = lib.pins[pinId];
  if (!pin) return NextResponse.json({ error: "Pin not found" }, { status: 404 });

  const imageUrl = pin.imageOriginal || pin.imageDisplay || pin.thumbnail236;
  if (!imageUrl) return NextResponse.json({ error: "Pin has no image URL" }, { status: 400 });

  let palette;
  try {
    palette = await extractPalette(imageUrl, { k: 7 });
  } catch (e) {
    // Fall back to the smaller thumbnail if the original 404s.
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

  await patchPin(pinId, { palette, paletteExtractedAt: new Date().toISOString() });
  return NextResponse.json({ pinId, palette });
}
