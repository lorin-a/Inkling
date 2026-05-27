import { NextResponse } from "next/server";
import { setSubmissionStatus } from "../../../../lib/db/submissions";
import { getAdminSession } from "../../../../lib/admin";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const ALLOWED = ["approved", "rejected", "archived", "pending"];

// Admin-only: move a submission through review. Approving a resource is what
// publishes it to /resources, so this gate is the publish gate.
export async function PATCH(request, { params }) {
  const { isAdmin } = await getAdminSession();
  if (!isAdmin) return NextResponse.json({ error: "Not authorized" }, { status: 403 });

  const { id } = await params;
  let body;
  try { body = await request.json(); } catch { return NextResponse.json({ error: "Invalid JSON" }, { status: 400 }); }
  if (!ALLOWED.includes(body.status)) {
    return NextResponse.json({ error: "Invalid status" }, { status: 400 });
  }

  const updated = await setSubmissionStatus({ id, status: body.status });
  if (!updated) return NextResponse.json({ error: "Not found" }, { status: 404 });
  return NextResponse.json({ ok: true, submission: updated });
}
