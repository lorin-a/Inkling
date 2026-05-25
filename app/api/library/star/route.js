import { NextResponse } from "next/server";
import { setStarred } from "../../../../lib/moodboardStore";
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
  const { hex, starred } = body || {};
  if (typeof hex !== "string" || typeof starred !== "boolean") {
    return NextResponse.json({ error: "Body must be {hex: string, starred: boolean}" }, { status: 400 });
  }
  try {
    const { userId } = await getRequestContext();
    if (userId) {
      const active = await getActiveProjectForUser(userId);
      if (!active) return NextResponse.json({ error: "No active project" }, { status: 400 });
      const updated = await dbLibrary.setColorStar({ projectId: active.id, hex, starred });
      return NextResponse.json({ ok: true, starred: updated });
    }
    const updated = await setStarred(hex, starred);
    return NextResponse.json({ ok: true, starred: updated });
  } catch (e) {
    return NextResponse.json({ error: e.message }, { status: 400 });
  }
}
