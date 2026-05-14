import { NextResponse } from "next/server";
import { nanoid } from "nanoid";
import { sql } from "@/lib/db";
import { snapshotActiveProject } from "@/lib/instanceSnapshot";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const AUDIENCES = new Set(["public", "private"]);
const UNITS = new Set(["preset", "element"]);

export async function POST(request) {
  let body = {};
  try {
    body = await request.json();
  } catch {
    // empty body is allowed; defaults will apply
  }

  const audience = AUDIENCES.has(body.audience) ? body.audience : "public";
  const voteUnit = UNITS.has(body.vote_unit) ? body.vote_unit : "preset";

  let snapshot;
  try {
    snapshot = await snapshotActiveProject();
  } catch (e) {
    return NextResponse.json({ error: e.message }, { status: 400 });
  }

  const id = `inst_${nanoid(12)}`;
  const token = nanoid(16);
  const ownerKey = nanoid(32);

  await sql.query(
    `INSERT INTO instances (id, slug, owner_key, audience, vote_unit, project_state)
     VALUES ($1, $2, $3, $4, $5, $6)`,
    [id, token, ownerKey, audience, voteUnit, JSON.stringify(snapshot)]
  );

  const origin = new URL(request.url).origin;
  const shareUrl = `${origin}/v/${token}`;

  const response = NextResponse.json({
    id,
    token,
    audience,
    vote_unit: voteUnit,
    share_url: shareUrl,
    snapshot_summary: {
      project_name: snapshot.project?.name || snapshot.slug,
      preset_count: snapshot.presets.length,
      mark_count: snapshot.marks.length,
      pin_count: Object.keys(snapshot.library?.pins || {}).length,
      starred_count: (snapshot.library?.starred || []).length,
    },
  });

  response.cookies.set(`mv_owner_${token}`, ownerKey, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: 60 * 60 * 24 * 365,
  });

  return response;
}
