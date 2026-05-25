import { NextResponse } from "next/server";
import { readLibrary } from "../../../lib/moodboardStore";
import * as dbLibrary from "../../../lib/db/library";
import { getActiveProjectForUser, getRequestContext } from "../../../lib/api/context";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET() {
  const { userId } = await getRequestContext();
  if (userId) {
    const active = await getActiveProjectForUser(userId);
    if (!active) return NextResponse.json({ schemaVersion: 1, pins: {}, boards: [], starred: [], starredPalettes: [] });
    const lib = await dbLibrary.readLibrary({ projectId: active.id });
    return NextResponse.json(lib);
  }
  const lib = await readLibrary();
  return NextResponse.json(lib);
}
