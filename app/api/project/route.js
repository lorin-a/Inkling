import { NextResponse } from "next/server";
import { readProject, writeProject } from "../../../lib/projectStore";
import * as dbProjects from "../../../lib/db/projects";
import { getRequestContext } from "../../../lib/api/context";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const EMPTY = {
  name: "Untitled",
  slug: "",
  wordmark: "wordmark",
  period: ".",
  initial: "w",
  tagline: "",
  body: "",
  fonts: {},
};

export async function GET() {
  const { userId } = await getRequestContext();
  if (userId) {
    const active = await dbProjects.getActiveProject({ userId });
    if (!active) return NextResponse.json(EMPTY);
    return NextResponse.json(active);
  }
  const project = await readProject();
  return NextResponse.json(project);
}

export async function PATCH(request) {
  let body;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }
  const { userId } = await getRequestContext();
  if (userId) {
    const active = await dbProjects.getActiveProject({ userId });
    if (!active) return NextResponse.json({ error: "No active project" }, { status: 400 });
    const updated = await dbProjects.updateProject({ userId, id: active.id, patch: body || {} });
    return NextResponse.json(updated || EMPTY);
  }
  const next = await writeProject(body || {});
  return NextResponse.json(next);
}
