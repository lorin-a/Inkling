import { NextResponse } from "next/server";
import {
  boardForToken, saveState, setVotes, addWord, updateWord, deleteWord, addMember, renameMember, removeMember,
} from "../../../../lib/db/studio";

/**
 * One member's window onto a studio board. The token in the URL is the
 * member; there is no account. GET is what the client polls for the other
 * person's progress and, once it opens, the reveal.
 */

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const TAGS = new Set(["keep", "maybe", "no", "undecided"]);

async function load(params) {
  const { token } = await params;
  const t = String(token || "").replace(/[^A-Za-z0-9_-]/g, "");
  if (!t) return null;
  return boardForToken(t);
}

export async function GET(_req, { params }) {
  const view = await load(params);
  if (!view) return NextResponse.json({ error: "No such link" }, { status: 404 });
  // The poll does not need the pool or the shared state again.
  const { board, ...rest } = view;
  return NextResponse.json({ ...rest, boardUpdatedAt: board.updatedAt });
}

export async function PATCH(req, { params }) {
  const view = await load(params);
  if (!view) return NextResponse.json({ error: "No such link" }, { status: 404 });
  let body;
  try { body = await req.json(); } catch { return NextResponse.json({ error: "Invalid JSON" }, { status: 400 }); }
  if (body?.state && typeof body.state === "object") await saveState(view.board.id, body.state);
  return NextResponse.json({ ok: true });
}

export async function PUT(req, { params }) {
  const view = await load(params);
  if (!view) return NextResponse.json({ error: "No such link" }, { status: 404 });
  let body;
  try { body = await req.json(); } catch { return NextResponse.json({ error: "Invalid JSON" }, { status: 400 }); }
  const votes = (Array.isArray(body?.votes) ? body.votes : [])
    .filter((v) => v && typeof v.cardId === "string" && (v.tag == null || TAGS.has(v.tag)))
    .map((v) => ({ cardId: v.cardId, tag: v.tag ?? null, why: typeof v.why === "string" ? v.why.slice(0, 600) : undefined, round: Number(v.round) || 1 }));
  await setVotes({ boardId: view.board.id, memberId: view.me.id, votes });
  return NextResponse.json({ ok: true, written: votes.length });
}

export async function POST(req, { params }) {
  const view = await load(params);
  if (!view) return NextResponse.json({ error: "No such link" }, { status: 404 });
  let body;
  try { body = await req.json(); } catch { return NextResponse.json({ error: "Invalid JSON" }, { status: 400 }); }
  const boardId = view.board.id;
  const memberId = view.me.id;

  if (body?.word) {
    const text = String(body.word.text || "").slice(0, 200).trim();
    if (!text) return NextResponse.json({ error: "Empty word" }, { status: 400 });
    const w = await addWord({ boardId, memberId, kind: body.word.kind === "first" ? "first" : "note", text, color: body.word.color || null });
    return NextResponse.json({ ok: true, word: w });
  }
  if (body?.updateWord?.id) {
    await updateWord({ boardId, memberId, id: String(body.updateWord.id), text: String(body.updateWord.text || "").slice(0, 200), color: body.updateWord.color || null });
    return NextResponse.json({ ok: true });
  }
  if (body?.deleteWord) {
    await deleteWord({ boardId, memberId, id: String(body.deleteWord) });
    return NextResponse.json({ ok: true });
  }
  if (body?.invite && view.me.role === "owner") {
    const name = String(body.invite.name || "Collaborator").slice(0, 60).trim() || "Collaborator";
    try {
      const m = await addMember({ boardId, name });
      return NextResponse.json({ ok: true, member: m });
    } catch (e) {
      return NextResponse.json({ error: e.message }, { status: 400 });
    }
  }
  if (body?.renameMember?.id && view.me.role === "owner") {
    const name = String(body.renameMember.name || "").slice(0, 60).trim();
    if (name) await renameMember({ memberId: String(body.renameMember.id), name, boardId });
    return NextResponse.json({ ok: true });
  }
  if (body?.removeMember && view.me.role === "owner") {
    await removeMember({ memberId: String(body.removeMember), boardId });
    return NextResponse.json({ ok: true });
  }
  if (typeof body?.rename === "string") {
    const name = body.rename.slice(0, 60).trim();
    if (name) await renameMember({ memberId, name });
    return NextResponse.json({ ok: true });
  }
  return NextResponse.json({ error: "Nothing to do" }, { status: 400 });
}
