import { sql } from "../db";

/**
 * Postgres-backed moodboard (canvas) store. Mirrors lib/boardsStore.js but
 * scoped by projectId rather than the active-slug global. One row per board;
 * blocks live in a JSONB column and the whole document is replaced on save.
 *
 * Distinct from lib/db/library.js's `boards` table — that holds imported
 * Pinterest board metadata. These are the spatial canvases (Act I).
 */

const toIso = (v) => (v instanceof Date ? v.toISOString() : v);

function rowToBoard(row) {
  return {
    id: row.id,
    name: row.name,
    blocks: row.blocks || [],
    createdAt: toIso(row.created_at),
    updatedAt: toIso(row.updated_at),
  };
}

export async function listBoards({ projectId }) {
  if (!projectId) return [];
  const rows = await sql`
    SELECT id, name, blocks, created_at, updated_at
    FROM moodboards WHERE project_id = ${projectId}
    ORDER BY created_at ASC
  `;
  return rows.map(rowToBoard);
}

export async function getBoard({ projectId, id }) {
  if (!projectId || !id) return null;
  const rows = await sql`
    SELECT id, name, blocks, created_at, updated_at
    FROM moodboards WHERE project_id = ${projectId} AND id = ${id} LIMIT 1
  `;
  return rows[0] ? rowToBoard(rows[0]) : null;
}

export async function createBoard({ projectId, name }) {
  if (!projectId) throw new Error("projectId is required");
  const rows = await sql`
    INSERT INTO moodboards (project_id, name)
    VALUES (${projectId}, ${String(name || "Untitled board").slice(0, 120)})
    RETURNING id, name, blocks, created_at, updated_at
  `;
  return rowToBoard(rows[0]);
}

/**
 * Replace a board's name and/or blocks. Whole-document save: the route
 * sends the full block array. Only fields present in `patch` are written.
 */
export async function saveBoard({ projectId, id, patch }) {
  if (!projectId || !id) return null;
  const sets = [];
  const values = [];
  if (patch && Object.prototype.hasOwnProperty.call(patch, "name")) {
    sets.push(`name = $${sets.length + 1}`);
    values.push(String(patch.name || "Untitled board").slice(0, 120));
  }
  if (patch && Object.prototype.hasOwnProperty.call(patch, "blocks")) {
    sets.push(`blocks = $${sets.length + 1}`);
    values.push(JSON.stringify(Array.isArray(patch.blocks) ? patch.blocks : []));
  }
  if (sets.length === 0) return await getBoard({ projectId, id });
  sets.push(`updated_at = now()`);
  const query = `
    UPDATE moodboards SET ${sets.join(", ")}
    WHERE project_id = $${values.length + 1} AND id = $${values.length + 2}
    RETURNING id, name, blocks, created_at, updated_at
  `;
  const rows = await sql.query(query, [...values, projectId, id]);
  return rows[0] ? rowToBoard(rows[0]) : null;
}

export async function deleteBoard({ projectId, id }) {
  if (!projectId || !id) return false;
  await sql`DELETE FROM moodboards WHERE project_id = ${projectId} AND id = ${id}`;
  return true;
}
