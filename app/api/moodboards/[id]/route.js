import { NextResponse } from "next/server";
import * as fileBoards from "../../../../lib/boardsStore";
import * as dbBoards from "../../../../lib/db/moodboards";
import { getActiveProjectForUser, getRequestContext } from "../../../../lib/api/context";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

async function resolveProjectId(userId) {
  if (!userId) return null;
  const active = await getActiveProjectForUser(userId);
  return active?.id || null;
}

// Read one board (name + blocks).
export async function GET(request, { params }) {
  const { id } = await params;
  const { userId } = await getRequestContext();
  const board = userId
    ? await dbBoards.getBoard({ projectId: await resolveProjectId(userId), id })
    : await fileBoards.getBoard(id);
  if (!board) return NextResponse.json({ error: "Not found" }, { status: 404 });
  return NextResponse.json({ board });
}

// Save a board — rename and/or replace its blocks (whole-document write).
export async function PUT(request, { params }) {
  const { id } = await params;
  let body;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }
  const patch = {};
  if (typeof body?.name === "string") patch.name = body.name;
  if (Array.isArray(body?.blocks)) patch.blocks = body.blocks;
  if (Array.isArray(body?.sections)) patch.sections = body.sections;
  if (Array.isArray(body?.comments)) patch.comments = body.comments;
  if (body && Object.prototype.hasOwnProperty.call(body, "background")) patch.background = body.background;

  const { userId } = await getRequestContext();
  try {
    const board = userId
      ? await dbBoards.saveBoard({ projectId: await resolveProjectId(userId), id, patch })
      : await fileBoards.saveBoard(id, patch);
    if (!board) return NextResponse.json({ error: "Not found" }, { status: 404 });
    return NextResponse.json({ board });
  } catch (e) {
    return NextResponse.json({ error: e.message }, { status: 400 });
  }
}

// Delete a board.
export async function DELETE(request, { params }) {
  const { id } = await params;
  const { userId } = await getRequestContext();
  try {
    if (userId) {
      await dbBoards.deleteBoard({ projectId: await resolveProjectId(userId), id });
    } else {
      await fileBoards.deleteBoard(id);
    }
    return NextResponse.json({ ok: true });
  } catch (e) {
    return NextResponse.json({ error: e.message }, { status: 400 });
  }
}
