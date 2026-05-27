import { sql } from "../db";

/**
 * Postgres-backed project store. Mirrors the API of lib/projectRegistry.js
 * but takes an explicit userId on every call instead of relying on global
 * file-based state.
 *
 * All functions throw if userId is missing. The caller (an API route)
 * is responsible for resolving the userId via auth() and passing it
 * down. The file-based projectRegistry continues to serve unauthenticated
 * requests until 6b cuts the API routes over.
 */

function requireUserId(userId) {
  if (!userId || typeof userId !== "string") {
    throw new Error("userId is required");
  }
}

export function makeSlug(name) {
  return String(name || "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 48);
}

export async function listProjects({ userId }) {
  requireUserId(userId);
  // Pin count + updated_at for the switcher. Subquery is fine here —
  // projects per user will be small (< 100 realistic).
  const rows = await sql`
    SELECT
      p.id, p.slug, p.name, p.wordmark, p.period, p.initial,
      p.tagline, p.body, p.fonts, p.created_at, p.updated_at,
      (SELECT COUNT(*) FROM pins WHERE pins.project_id = p.id) AS pins
    FROM projects p
    WHERE p.owner_user_id = ${userId}
    ORDER BY p.updated_at DESC
  `;
  return rows.map(rowToProject);
}

export async function getProjectBySlug({ userId, slug }) {
  requireUserId(userId);
  if (!slug) return null;
  const rows = await sql`
    SELECT id, slug, name, wordmark, period, initial, tagline, body, fonts,
           created_at, updated_at
    FROM projects
    WHERE owner_user_id = ${userId} AND slug = ${slug}
    LIMIT 1
  `;
  return rows[0] ? rowToProject(rows[0]) : null;
}

export async function getProjectById({ id }) {
  if (!id) return null;
  const rows = await sql`
    SELECT id, owner_user_id, slug, name, wordmark, period, initial,
           tagline, body, fonts, created_at, updated_at
    FROM projects WHERE id = ${id} LIMIT 1
  `;
  return rows[0] ? rowToProject(rows[0]) : null;
}

export async function createProject({ userId, name, slug }) {
  requireUserId(userId);
  const finalName = String(name || "Untitled").slice(0, 80);
  const finalSlug = makeSlug(slug || name);
  if (!finalSlug) throw new Error("Invalid project name");

  // Conflict surfaces as a Postgres unique violation on
  // (owner_user_id, slug) — translate to a friendlier error.
  try {
    const rows = await sql`
      INSERT INTO projects (owner_user_id, slug, name)
      VALUES (${userId}, ${finalSlug}, ${finalName})
      RETURNING id, slug, name, wordmark, period, initial, tagline, body,
                fonts, created_at, updated_at
    `;
    const project = rowToProject(rows[0]);
    // First project becomes the user’s active project automatically.
    await sql`
      UPDATE users
      SET last_active_project_id = COALESCE(last_active_project_id, ${project.id})
      WHERE id = ${userId}
    `;
    return project;
  } catch (e) {
    if (e.message && /duplicate key|unique/i.test(e.message)) {
      throw new Error(`Project "${finalSlug}" already exists`);
    }
    throw e;
  }
}

export async function updateProject({ userId, id, patch }) {
  requireUserId(userId);
  if (!id) throw new Error("project id required");
  // Build an UPDATE only for the fields actually in patch. Keeps the
  // function honest about what it overwrites.
  const allowed = ["name", "wordmark", "period", "initial", "tagline", "body", "fonts"];
  const sets = [];
  const values = [];
  for (const key of allowed) {
    if (patch && Object.prototype.hasOwnProperty.call(patch, key)) {
      sets.push(`${key} = $${sets.length + 1}`);
      values.push(key === "fonts" ? JSON.stringify(patch[key] || {}) : patch[key]);
    }
  }
  if (sets.length === 0) {
    return await getProjectById({ id });
  }
  sets.push(`updated_at = now()`);
  const query = `
    UPDATE projects
    SET ${sets.join(", ")}
    WHERE id = $${values.length + 1} AND owner_user_id = $${values.length + 2}
    RETURNING id, slug, name, wordmark, period, initial, tagline, body,
              fonts, created_at, updated_at
  `;
  const rows = await sql.query(query, [...values, id, userId]);
  return rows[0] ? rowToProject(rows[0]) : null;
}

export async function deleteProject({ userId, id }) {
  requireUserId(userId);
  await sql`
    DELETE FROM projects
    WHERE id = ${id} AND owner_user_id = ${userId}
  `;
  return true;
}

export async function getActiveProject({ userId }) {
  requireUserId(userId);
  const rows = await sql`
    SELECT p.id, p.slug, p.name, p.wordmark, p.period, p.initial,
           p.tagline, p.body, p.fonts, p.created_at, p.updated_at
    FROM users u
    JOIN projects p ON p.id = u.last_active_project_id
    WHERE u.id = ${userId}
    LIMIT 1
  `;
  return rows[0] ? rowToProject(rows[0]) : null;
}

export async function setActiveProject({ userId, projectId }) {
  requireUserId(userId);
  // Only allow setting active project to one the user owns.
  const owned = await sql`
    SELECT id FROM projects WHERE id = ${projectId} AND owner_user_id = ${userId} LIMIT 1
  `;
  if (owned.length === 0) throw new Error("Project not found or not owned by user");
  await sql`
    UPDATE users SET last_active_project_id = ${projectId} WHERE id = ${userId}
  `;
  return true;
}

function rowToProject(row) {
  return {
    id: row.id,
    slug: row.slug,
    name: row.name,
    wordmark: row.wordmark || "",
    period: row.period || ".",
    initial: row.initial || "",
    tagline: row.tagline || "",
    body: row.body || "",
    fonts: row.fonts || {},
    pins: row.pins != null ? Number(row.pins) : undefined,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}
