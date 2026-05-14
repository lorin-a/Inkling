import { NextResponse } from "next/server";
import { readPresets, addPreset, removePreset } from "../../../lib/presetStore";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET() {
  const presets = await readPresets();
  return NextResponse.json({ presets });
}

export async function POST(request) {
  let body;
  try { body = await request.json(); }
  catch { return NextResponse.json({ error: "Invalid JSON" }, { status: 400 }); }
  if (!body || typeof body !== "object") {
    return NextResponse.json({ error: "Missing body" }, { status: 400 });
  }
  try {
    const preset = await addPreset(body);
    return NextResponse.json({ preset });
  } catch (e) {
    return NextResponse.json({ error: e.message }, { status: 400 });
  }
}

export async function DELETE(request) {
  const { searchParams } = new URL(request.url);
  const id = (searchParams.get("id") || "").trim();
  if (!id) return NextResponse.json({ error: "Missing id" }, { status: 400 });
  try {
    const presets = await removePreset(id);
    return NextResponse.json({ presets });
  } catch (e) {
    return NextResponse.json({ error: e.message }, { status: 400 });
  }
}
