import { NextResponse } from "next/server";
import * as fileAtoms from "../../../../lib/atomsStore";
import * as dbAtoms from "../../../../lib/db/atoms";
import { getRequestContext } from "../../../../lib/api/context";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// Re-tag an atom — change its dimension and/or tags (the user owns these).
export async function PUT(request, { params }) {
  const { id } = await params;
  let body;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }
  const patch = {};
  if (typeof body?.dimension === "string") patch.dimension = body.dimension;
  if (Array.isArray(body?.tags)) patch.tags = body.tags;

  const { userId } = await getRequestContext();
  try {
    const atom = userId
      ? await dbAtoms.updateAtom({ userId, id, patch })
      : await fileAtoms.updateAtom({ id, patch });
    if (!atom) return NextResponse.json({ error: "Not found" }, { status: 404 });
    return NextResponse.json({ atom });
  } catch (e) {
    return NextResponse.json({ error: e.message }, { status: 400 });
  }
}

// Remove an atom from the well.
export async function DELETE(request, { params }) {
  const { id } = await params;
  const { userId } = await getRequestContext();
  try {
    if (userId) await dbAtoms.deleteAtom({ userId, id });
    else await fileAtoms.deleteAtom({ id });
    return NextResponse.json({ ok: true });
  } catch (e) {
    return NextResponse.json({ error: e.message }, { status: 400 });
  }
}
