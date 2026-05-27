import { NextResponse } from "next/server";
import { createSubmission, listSubmissions } from "../../../lib/db/submissions";
import { getAdminSession } from "../../../lib/admin";
import { auth } from "../../../lib/auth";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const RESOURCE_CATEGORIES = ["foundries", "color", "inspiration", "accessibility", "other"];
const FEEDBACK_TOPICS = ["feature", "bug", "other"];

// Best-effort in-memory rate limit (per warm instance). Combined with the
// honeypot, length caps, and the approval gate, it’s enough to keep the
// queue clean pre-launch without standing up a shared limiter.
const hits = new Map();
function rateLimited(key, max = 5, windowMs = 60_000) {
  const now = Date.now();
  const rec = hits.get(key);
  if (!rec || now - rec.start > windowMs) { hits.set(key, { start: now, n: 1 }); return false; }
  rec.n += 1;
  return rec.n > max;
}

const str = (v, max) => (typeof v === "string" ? v.trim().slice(0, max) : "");
const isHttpUrl = (v) => { try { const u = new URL(v); return u.protocol === "http:" || u.protocol === "https:"; } catch { return false; } };

export async function POST(request) {
  let body;
  try { body = await request.json(); } catch { return NextResponse.json({ error: "Invalid JSON" }, { status: 400 }); }

  // Honeypot — real users never fill this hidden field.
  if (body._hp) return NextResponse.json({ ok: true }); // silently accept-and-drop

  const ip = request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || "local";
  if (rateLimited(ip)) {
    return NextResponse.json({ error: "Too many submissions. Try again in a minute." }, { status: 429 });
  }

  const kind = body.kind;
  if (kind !== "resource" && kind !== "feedback") {
    return NextResponse.json({ error: "Unknown submission kind" }, { status: 400 });
  }

  let payload;
  if (kind === "resource") {
    const name = str(body.name, 80);
    const url = str(body.url, 300);
    if (!name) return NextResponse.json({ error: "Give the resource a name." }, { status: 400 });
    if (!isHttpUrl(url)) return NextResponse.json({ error: "Enter a valid http(s) link." }, { status: 400 });
    const category = RESOURCE_CATEGORIES.includes(body.category) ? body.category : "other";
    payload = { name, url, category, note: str(body.note, 200) };
  } else {
    const message = str(body.message, 2000);
    if (message.length < 3) return NextResponse.json({ error: "Add a little more detail." }, { status: 400 });
    const topic = FEEDBACK_TOPICS.includes(body.topic) ? body.topic : "other";
    payload = { topic, message };
  }

  // Capture the submitter’s email when signed in; otherwise honor an optional
  // one they typed, else anonymous.
  let submitterEmail = null;
  try {
    const session = await auth();
    submitterEmail = session?.user?.email || (str(body.email, 200) || null);
  } catch {
    submitterEmail = str(body.email, 200) || null;
  }

  try {
    const { id } = await createSubmission({ kind, payload, submitterEmail });
    return NextResponse.json({ ok: true, id });
  } catch (e) {
    return NextResponse.json({ error: "Could not save submission" }, { status: 500 });
  }
}

export async function GET(request) {
  const { isAdmin } = await getAdminSession();
  if (!isAdmin) return NextResponse.json({ error: "Not authorized" }, { status: 403 });
  const status = new URL(request.url).searchParams.get("status") || undefined;
  const rows = await listSubmissions({ status });
  return NextResponse.json({ submissions: rows });
}
