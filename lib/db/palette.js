import { sql } from "../db";

/**
 * Postgres-backed per-project palette config — the brand color
 * dictionary, curated row groupings, and source-pool seeds that used
 * to live in data/projects/{slug}/palette.json.
 */

export async function readProjectPalette({ projectId }) {
  if (!projectId) return { brand: {}, inspiration: { source: [], curated: {} } };
  const rows = await sql`
    SELECT brand, inspiration FROM project_palette WHERE project_id = ${projectId} LIMIT 1
  `;
  if (rows.length === 0) {
    return { brand: {}, inspiration: { source: [], curated: {} } };
  }
  const insp = rows[0].inspiration || {};
  return {
    brand: rows[0].brand || {},
    inspiration: {
      source: insp.source || insp.master || [],
      curated: insp.curated || {},
    },
  };
}

export async function writeProjectPalette({ projectId, data }) {
  if (!projectId) throw new Error("projectId required");
  await sql`
    INSERT INTO project_palette (project_id, brand, inspiration, updated_at)
    VALUES (${projectId},
            ${JSON.stringify(data.brand || {})},
            ${JSON.stringify(data.inspiration || {})},
            now())
    ON CONFLICT (project_id) DO UPDATE SET
      brand = EXCLUDED.brand,
      inspiration = EXCLUDED.inspiration,
      updated_at = now()
  `;
}
