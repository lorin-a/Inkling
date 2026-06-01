import { NextResponse } from "next/server";
import * as fileBoards from "../../../lib/boardsStore";
import * as dbBoards from "../../../lib/db/moodboards";
import { getActiveProjectForUser, getRequestContext } from "../../../lib/api/context";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// List the active project's moodboard canvases.
export async function GET() {
  const { userId } = await getRequestContext();
  if (userId) {
    const active = await getActiveProjectForUser(userId);
    if (!active) return NextResponse.json({ boards: [] });
    const boards = await dbBoards.listBoards({ projectId: active.id });
    return NextResponse.json({ boards });
  }
  const boards = await fileBoards.listBoards();
  return NextResponse.json({ boards });
}

// Create a new (empty) board.
export async function POST(request) {
  let body;
  try {
    body = await request.json();
  } catch {
    body = {};
  }
  const name = typeof body?.name === "string" ? body.name : undefined;

  const { userId } = await getRequestContext();
  try {
    if (userId) {
      const active = await getActiveProjectForUser(userId);
      if (!active) return NextResponse.json({ error: "No active project" }, { status: 400 });
      const board = await dbBoards.createBoard({ projectId: active.id, name });
      return NextResponse.json({ board });
    }
    const board = await fileBoards.createBoard({ name });
    return NextResponse.json({ board });
  } catch (e) {
    return NextResponse.json({ error: e.message }, { status: 400 });
  }
}
