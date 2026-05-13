import { NextResponse } from "next/server";
import { readProject, writeProject } from "../../../lib/projectStore";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET() {
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
  const next = await writeProject(body || {});
  return NextResponse.json(next);
}
