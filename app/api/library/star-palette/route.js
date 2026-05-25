import { NextResponse } from "next/server";
import { setPaletteStar } from "../../../../lib/moodboardStore";
import * as dbLibrary from "../../../../lib/db/library";
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
  const { pinId, starred } = body || {};
  if (!pinId || typeof starred !== "boolean") {
    return NextResponse.json({ error: "Missing pinId or starred boolean" }, { status: 400 });
  }
  try {
    const { userId } = await getRequestContext();
    if (userId) {
      const active = await getActiveProjectForUser(userId);
      if (!active) return NextResponse.json({ error: "No active project" }, { status: 400 });
      const starredPalettes = await dbLibrary.setPaletteStar({
        projectId: active.id, pinId, starred,
      });
      return NextResponse.json({ ok: true, starredPalettes });
    }
    const starredPalettes = await setPaletteStar(pinId, starred);
    return NextResponse.json({ ok: true, starredPalettes });
  } catch (e) {
    return NextResponse.json({ error: e.message }, { status: 400 });
  }
}
