import { NextResponse } from "next/server";
import { getActiveSlug, setActiveSlug } from "../../../../lib/projectRegistry";
import * as dbProjects from "../../../../lib/db/projects";
import { getRequestContext } from "../../../../lib/api/context";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET() {
  const { userId } = await getRequestContext();
  if (userId) {
    const active = await dbProjects.getActiveProject({ userId });
    return NextResponse.json({ slug: active?.slug || null });
  }
  const slug = await getActiveSlug();
  return NextResponse.json({ slug });
}

export async function PUT(request) {
  let body;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }
  const { slug } = body || {};
  if (!slug || typeof slug !== "string") {
    return NextResponse.json({ error: "Missing slug" }, { status: 400 });
  }
  const { userId } = await getRequestContext();
  try {
    if (userId) {
      const project = await dbProjects.getProjectBySlug({ userId, slug });
      if (!project) return NextResponse.json({ error: "Project not found" }, { status: 404 });
      await dbProjects.setActiveProject({ userId, projectId: project.id });
      return NextResponse.json({ slug });
    }
    await setActiveSlug(slug);
    return NextResponse.json({ slug });
  } catch (e) {
    return NextResponse.json({ error: e.message }, { status: 404 });
  }
}
