import { randomBytes } from "node:crypto";
import { sql } from "../db";

/**
 * The studio, on the server (Phase 1).
 *
 * A board is self-contained: it carries the pool of cards it was opened with
 * (a snapshot of the library, so the deployed app and the local one read the
 * same thing) and the shared state: positions, groups, notes, swatches.
 * Members join by link; the token is the identity. Votes are one row per
 * member per card and are private until the reveal.
 */

const token = () => randomBytes(12).toString("base64url");

const toIso = (v) => (v instanceof Date ? v.toISOString() : v);

/* ---- boards --------------------------------------------------------------- */

export async function createBoard({ projectSlug, name, cards, members }) {
  const rows = await sql`
    INSERT INTO studio_boards (project_slug, name, cards, state)
    VALUES (${projectSlug}, ${name}, ${JSON.stringify(cards)}::jsonb, ${"{}"}::jsonb)
    RETURNING id
  `;
  const boardId = rows[0].id;
  const made = [];
  for (const m of members) {
    const t = token();
    const r = await sql`
      INSERT INTO studio_members (board_id, token, name, role)
      VALUES (${boardId}, ${t}, ${m.name}, ${m.role || "member"})
      RETURNING id, token, name, role
    `;
    made.push(r[0]);
  }
  return { id: boardId, members: made };
}

export async function latestBoardForSlug(projectSlug) {
  const rows = await sql`
    SELECT id FROM studio_boards WHERE project_slug = ${projectSlug}
    ORDER BY created_at DESC LIMIT 1
  `;
  return rows[0]?.id || null;
}

export async function ownerTokenFor(boardId) {
  const rows = await sql`
    SELECT token FROM studio_members WHERE board_id = ${boardId}
    ORDER BY (role = 'owner') DESC, created_at ASC LIMIT 1
  `;
  return rows[0]?.token || null;
}

/** New library pins join the pool; nothing already there is touched. */
export async function mergeCards(boardId, incoming) {
  const rows = await sql`SELECT cards FROM studio_boards WHERE id = ${boardId}`;
  const have = rows[0]?.cards || [];
  const ids = new Set(have.map((c) => c.id));
  const add = incoming.filter((c) => !ids.has(c.id));
  if (!add.length) return 0;
  await sql`
    UPDATE studio_boards SET cards = ${JSON.stringify([...have, ...add])}::jsonb, updated_at = now()
    WHERE id = ${boardId}
  `;
  return add.length;
}

/* ---- reading a board by a member's link ------------------------------------ */

export async function boardForToken(t) {
  const me = await sql`
    SELECT m.id, m.board_id, m.name, m.role, m.done_at
    FROM studio_members m WHERE m.token = ${t} LIMIT 1
  `;
  if (!me[0]) return null;
  const member = me[0];
  const [boards, members, votes, words] = await Promise.all([
    sql`SELECT id, project_slug, name, cards, state, updated_at FROM studio_boards WHERE id = ${member.board_id}`,
    sql`SELECT id, name, role, token, done_at FROM studio_members WHERE board_id = ${member.board_id} ORDER BY created_at ASC`,
    sql`SELECT member_id, card_id, tag, why, round, updated_at FROM studio_votes WHERE board_id = ${member.board_id}`,
    sql`SELECT id, member_id, kind, text, color, created_at FROM studio_words WHERE board_id = ${member.board_id} ORDER BY created_at ASC`,
  ]);
  const board = boards[0];
  if (!board) return null;
  return shape({ board, member, members, votes, words });
}

/**
 * What each person may see. Your own votes and words, always. Everyone's,
 * only once every member who has started has finished: the reveal is the
 * workshop, and a reveal one person can peek at early is not one.
 */
function shape({ board, member, members, votes, words }) {
  const cardIds = new Set((board.cards || []).map((c) => c.id));
  const total = cardIds.size;
  const byMember = new Map(members.map((m) => [m.id, { voted: 0 }]));
  for (const v of votes) {
    if (!cardIds.has(v.card_id) || !v.tag) continue;
    const b = byMember.get(v.member_id);
    if (b) b.voted += 1;
  }
  const people = members.map((m) => ({
    id: m.id,
    name: m.name,
    role: m.role,
    me: m.id === member.id,
    voted: byMember.get(m.id)?.voted || 0,
    done: total > 0 && (byMember.get(m.id)?.voted || 0) >= total,
    // Only the owner ever sees the other links; that is how the invite travels.
    token: member.role === "owner" || m.id === member.id ? m.token : undefined,
  }));
  const finished = people.filter((p) => p.done);
  const revealOpen = finished.length >= 2;

  const mine = {};
  const everyone = {};
  for (const v of votes) {
    const entry = { tag: v.tag, why: v.why || "", round: v.round, at: toIso(v.updated_at) };
    if (v.member_id === member.id) mine[v.card_id] = entry;
    if (revealOpen && byMember.get(v.member_id)?.voted >= total) {
      (everyone[v.card_id] ||= {})[v.member_id] = entry;
    }
  }
  const myWords = words.filter((w) => w.member_id === member.id).map(wordOut);
  const allWords = revealOpen ? words.map(wordOut) : [];

  return {
    board: { id: board.id, slug: board.project_slug, name: board.name, cards: board.cards || [], state: board.state || {}, updatedAt: toIso(board.updated_at) },
    me: { id: member.id, name: member.name, role: member.role },
    people,
    total,
    revealOpen,
    votes: { mine, everyone },
    words: { mine: myWords, everyone: allWords },
  };
}

const wordOut = (w) => ({ id: w.id, memberId: w.member_id, kind: w.kind, text: w.text, color: w.color, at: toIso(w.created_at) });

/* ---- writes ------------------------------------------------------------------ */

export async function saveState(boardId, state) {
  await sql`
    UPDATE studio_boards SET state = ${JSON.stringify(state)}::jsonb, updated_at = now()
    WHERE id = ${boardId}
  `;
}

export async function setVotes({ boardId, memberId, votes }) {
  for (const v of votes) {
    if (!v?.cardId) continue;
    if (!v.tag) {
      await sql`DELETE FROM studio_votes WHERE board_id = ${boardId} AND member_id = ${memberId} AND card_id = ${v.cardId}`;
      continue;
    }
    await sql`
      INSERT INTO studio_votes (board_id, member_id, card_id, tag, why, round, updated_at)
      VALUES (${boardId}, ${memberId}, ${v.cardId}, ${v.tag}, ${v.why ?? null}, ${v.round || 1}, now())
      ON CONFLICT (board_id, member_id, card_id)
      DO UPDATE SET tag = EXCLUDED.tag, why = COALESCE(EXCLUDED.why, studio_votes.why), round = EXCLUDED.round, updated_at = now()
    `;
  }
}

export async function addWord({ boardId, memberId, kind = "first", text, color }) {
  const rows = await sql`
    INSERT INTO studio_words (board_id, member_id, kind, text, color)
    VALUES (${boardId}, ${memberId}, ${kind}, ${text}, ${color ?? null})
    RETURNING id, member_id, kind, text, color, created_at
  `;
  return wordOut(rows[0]);
}

export async function updateWord({ boardId, memberId, id, text, color }) {
  await sql`
    UPDATE studio_words SET text = ${text}, color = ${color ?? null}
    WHERE id = ${id} AND board_id = ${boardId} AND member_id = ${memberId}
  `;
}

export async function deleteWord({ boardId, memberId, id }) {
  await sql`DELETE FROM studio_words WHERE id = ${id} AND board_id = ${boardId} AND member_id = ${memberId}`;
}

export async function addMember({ boardId, name }) {
  const t = token();
  const rows = await sql`
    INSERT INTO studio_members (board_id, token, name, role) VALUES (${boardId}, ${t}, ${name}, ${"member"})
    RETURNING id, token, name, role
  `;
  return rows[0];
}

export async function renameMember({ memberId, name }) {
  await sql`UPDATE studio_members SET name = ${name} WHERE id = ${memberId}`;
}
