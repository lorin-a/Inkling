import { sql } from "../db";

/**
 * Postgres-backed "well" — the user's cross-project library of tagged references
 * (VISION §15). Mirrors lib/db/moodboards.js, but scoped by USER not project, so
 * atoms span every project a user owns. project_id / pin_id are provenance only.
 */

const toIso = (v) => (v instanceof Date ? v.toISOString() : v);

function rowToAtom(row) {
  return {
    id: row.id,
    kind: row.kind,
    dimension: row.dimension || "",
    tags: row.tags || [],
    visual: row.visual || {},
    source: row.source || {},
    createdAt: toIso(row.created_at),
    updatedAt: toIso(row.updated_at),
  };
}

export async function listAtoms({ userId, dimension }) {
  if (!userId) return [];
  const rows = dimension
    ? await sql`SELECT id, kind, dimension, tags, visual, source, created_at, updated_at
        FROM atoms WHERE user_id = ${userId} AND dimension = ${dimension} ORDER BY created_at DESC`
    : await sql`SELECT id, kind, dimension, tags, visual, source, created_at, updated_at
        FROM atoms WHERE user_id = ${userId} ORDER BY created_at DESC`;
  return rows.map(rowToAtom);
}

export async function createAtom({ userId, atom }) {
  if (!userId) throw new Error("userId is required");
  const a = atom || {};
  const src = a.source || {};
  const rows = await sql`
    INSERT INTO atoms (user_id, kind, dimension, tags, visual, source, project_id, pin_id)
    VALUES (
      ${userId},
      ${a.kind || "image"},
      ${a.dimension || ""},
      ${JSON.stringify(Array.isArray(a.tags) ? a.tags : [])},
      ${JSON.stringify(a.visual || {})},
      ${JSON.stringify(src)},
      ${src.projectId || null},
      ${src.pinId || null}
    )
    RETURNING id, kind, dimension, tags, visual, source, created_at, updated_at
  `;
  return rowToAtom(rows[0]);
}

/** Edit an atom's tags and/or dimension (the user re-tagging later). */
export async function updateAtom({ userId, id, patch }) {
  if (!userId || !id) return null;
  const sets = [];
  const values = [];
  if (patch && Object.prototype.hasOwnProperty.call(patch, "dimension")) {
    sets.push(`dimension = $${sets.length + 1}`);
    values.push(String(patch.dimension || ""));
  }
  if (patch && Object.prototype.hasOwnProperty.call(patch, "tags")) {
    sets.push(`tags = $${sets.length + 1}::jsonb`);
    values.push(JSON.stringify(Array.isArray(patch.tags) ? patch.tags : []));
  }
  if (sets.length === 0) {
    const rows = await sql`SELECT id, kind, dimension, tags, visual, source, created_at, updated_at FROM atoms WHERE user_id = ${userId} AND id = ${id} LIMIT 1`;
    return rows[0] ? rowToAtom(rows[0]) : null;
  }
  sets.push(`updated_at = now()`);
  const query = `UPDATE atoms SET ${sets.join(", ")}
    WHERE user_id = $${values.length + 1} AND id = $${values.length + 2}
    RETURNING id, kind, dimension, tags, visual, source, created_at, updated_at`;
  const rows = await sql.query(query, [...values, userId, id]);
  return rows[0] ? rowToAtom(rows[0]) : null;
}

export async function deleteAtom({ userId, id }) {
  if (!userId || !id) return false;
  await sql`DELETE FROM atoms WHERE user_id = ${userId} AND id = ${id}`;
  return true;
}
