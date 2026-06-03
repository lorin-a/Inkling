import { NextResponse } from "next/server";
import * as fileAtoms from "../../../lib/atomsStore";
import * as dbAtoms from "../../../lib/db/atoms";
import { getActiveProjectForUser, getRequestContext } from "../../../lib/api/context";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// List the user's well — every tagged reference, across all their projects
// (user-scoped, NOT project-scoped). Optional ?dimension= filter.
export async function GET(request) {
  const { searchParams } = new URL(request.url);
  const dimension = searchParams.get("dimension") || undefined;
  const { userId } = await getRequestContext();
  if (userId) {
    return NextResponse.json({ atoms: await dbAtoms.listAtoms({ userId, dimension }) });
  }
  return NextResponse.json({ atoms: await fileAtoms.listAtoms({ dimension }) });
}

// Add a pulled reference to the well. The active project is stamped onto the
// atom's source as PROVENANCE only — it never scopes the well.
export async function POST(request) {
  let body;
  try {
    body = await request.json();
  } catch {
    body = {};
  }
  const atom = body?.atom;
  if (!atom || typeof atom !== "object") {
    return NextResponse.json({ error: "Body must be { atom }" }, { status: 400 });
  }

  const { userId } = await getRequestContext();
  try {
    if (userId) {
      const active = await getActiveProjectForUser(userId);
      const stamped = { ...atom, source: { ...(atom.source || {}), projectId: active?.id || null } };
      return NextResponse.json({ atom: await dbAtoms.createAtom({ userId, atom: stamped }) });
    }
    return NextResponse.json({ atom: await fileAtoms.createAtom({ atom }) });
  } catch (e) {
    return NextResponse.json({ error: e.message }, { status: 400 });
  }
}
