import { NextResponse } from "next/server";
import { getActiveSlug, setActiveSlug } from "../../../../lib/projectRegistry";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET() {
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
  try {
    await setActiveSlug(slug);
    return NextResponse.json({ slug });
  } catch (e) {
    return NextResponse.json({ error: e.message }, { status: 404 });
  }
}
