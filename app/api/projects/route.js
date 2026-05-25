import { NextResponse } from "next/server";
import { listProjects as listFileProjects, createProject as createFileProject } from "../../../lib/projectRegistry";
import * as dbProjects from "../../../lib/db/projects";
import { getRequestContext } from "../../../lib/api/context";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET() {
  const { userId } = await getRequestContext();
  if (userId) {
    const projects = await dbProjects.listProjects({ userId });
    return NextResponse.json({ projects });
  }
  const projects = await listFileProjects();
  return NextResponse.json({ projects });
}

export async function POST(request) {
  let body;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }
  const { name, slug } = body || {};
  if (!name || typeof name !== "string") {
    return NextResponse.json({ error: "Missing project name" }, { status: 400 });
  }
  const { userId } = await getRequestContext();
  try {
    const project = userId
      ? await dbProjects.createProject({ userId, name, slug })
      : await createFileProject({ name, slug });
    return NextResponse.json({ project });
  } catch (e) {
    return NextResponse.json({ error: e.message }, { status: 400 });
  }
}
