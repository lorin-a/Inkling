import { NextResponse } from "next/server";
import { appendFile, mkdir } from "node:fs/promises";
import path from "node:path";

/**
 * Playtest event log. Every action the pair takes lands here as one JSON line
 * so the session is reviewed from a record rather than from memory — the
 * questions in STATUS.md ("does round 2 actually draw from the maybe pile?",
 * "how often does control change hands?") are answered by counting, not by
 * recalling. Local file, single tenant; this is instrumentation for playtest 01
 * and retires with it.
 */

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const DIR = path.join(process.cwd(), "data", "playtest");

export async function POST(request) {
  let body;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const session = String(body?.session || "unknown").replace(/[^a-z0-9-]/gi, "");
  const events = Array.isArray(body?.events) ? body.events : [body];
  if (!session) return NextResponse.json({ error: "Missing session" }, { status: 400 });

  // A tester's sessions (Playwright, Claude) are prefixed `claude-` by the
  // client and land in their own directory, so the record of her sessions is
  // never mixed with mine again.
  const dir = session.startsWith("claude-") ? path.join(DIR, "_claude") : DIR;
  await mkdir(dir, { recursive: true });
  const line = events.map((e) => JSON.stringify({ ...e, at: e?.at || new Date().toISOString() })).join("\n");
  await appendFile(path.join(dir, `${session}.jsonl`), line + "\n", "utf8");

  return NextResponse.json({ ok: true, written: events.length });
}
