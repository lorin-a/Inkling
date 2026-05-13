import { NextResponse } from "next/server";
import { listProjects, createProject } from "../../../lib/projectRegistry";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET() {
  const projects = await listProjects();
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
  try {
    const project = await createProject({ name, slug });
    return NextResponse.json({ project });
  } catch (e) {
    return NextResponse.json({ error: e.message }, { status: 400 });
  }
}
