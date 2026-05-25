import { sql } from "../db";

/**
 * Postgres-backed library store. Mirrors lib/moodboardStore.js but
 * scoped by projectId rather than the active-slug global. Concurrency
 * safety is delegated to Postgres — rows replace each other on conflict
 * via INSERT ... ON CONFLICT, so no per-file mutex is needed.
 */

export async function readLibrary({ projectId }) {
  if (!projectId) {
    return { schemaVersion: 1, pins: {}, boards: [], starred: [], starredPalettes: [] };
  }
  const [pinRows, boardRows, starredHexRows, starredPaletteRows] = await Promise.all([
    sql`
      SELECT pin_id, pin_url, image_original, image_display, thumbnail_236,
             alt, title, description, source_url, source_domain, pinner,
             pinner_url, palette, palette_extracted_at, enriched_at,
             enrichment_ok, tags, added_at
      FROM pins WHERE project_id = ${projectId}
    `,
    sql`
      SELECT board_url, board_name, pinner, captured_at, imported_at, count
      FROM boards WHERE project_id = ${projectId}
    `,
    sql`SELECT hex FROM colors_saved WHERE project_id = ${projectId}`,
    sql`SELECT pin_id FROM palettes_saved WHERE project_id = ${projectId}`,
  ]);

  // Normalize Postgres TIMESTAMPTZ -> ISO string so consumers that
  // sort on these fields via String.prototype.localeCompare still work.
  // The file-based store always returned ISO strings; the DB driver
  // hands back JS Date objects. Without this conversion, /api/library/palette
  // throws TypeError on the addedAt sort comparator.
  const toIso = (v) => (v instanceof Date ? v.toISOString() : v);

  const pins = {};
  for (const row of pinRows) {
    pins[row.pin_id] = {
      pinId: row.pin_id,
      pinUrl: row.pin_url,
      imageOriginal: row.image_original,
      imageDisplay: row.image_display,
      thumbnail236: row.thumbnail_236,
      alt: row.alt,
      title: row.title,
      description: row.description,
      sourceUrl: row.source_url,
      sourceDomain: row.source_domain,
      pinner: row.pinner,
      pinnerUrl: row.pinner_url,
      palette: row.palette,
      paletteExtractedAt: toIso(row.palette_extracted_at),
      enrichedAt: toIso(row.enriched_at),
      enrichmentOk: row.enrichment_ok,
      tags: row.tags || [],
      addedAt: toIso(row.added_at),
    };
  }

  return {
    schemaVersion: 1,
    pins,
    boards: boardRows.map((b) => ({
      boardUrl: b.board_url,
      boardName: b.board_name,
      pinner: b.pinner,
      capturedAt: toIso(b.captured_at),
      importedAt: toIso(b.imported_at),
      count: b.count,
    })),
    starred: starredHexRows.map((r) => r.hex),
    starredPalettes: starredPaletteRows.map((r) => r.pin_id),
  };
}

export async function upsertPin({ projectId, pin }) {
  await sql`
    INSERT INTO pins (
      project_id, pin_id, pin_url, image_original, image_display,
      thumbnail_236, alt, title, description, source_url, source_domain,
      pinner, pinner_url, palette, palette_extracted_at, enriched_at,
      enrichment_ok, tags, added_at
    ) VALUES (
      ${projectId}, ${pin.pinId}, ${pin.pinUrl},
      ${pin.imageOriginal}, ${pin.imageDisplay}, ${pin.thumbnail236},
      ${pin.alt}, ${pin.title}, ${pin.description},
      ${pin.sourceUrl}, ${pin.sourceDomain},
      ${pin.pinner}, ${pin.pinnerUrl},
      ${pin.palette ? JSON.stringify(pin.palette) : null},
      ${pin.paletteExtractedAt || null},
      ${pin.enrichedAt || null}, ${pin.enrichmentOk ?? null},
      ${JSON.stringify(pin.tags || [])},
      ${pin.addedAt || new Date().toISOString()}
    )
    ON CONFLICT (project_id, pin_id) DO UPDATE SET
      pin_url = COALESCE(EXCLUDED.pin_url, pins.pin_url),
      image_original = COALESCE(EXCLUDED.image_original, pins.image_original),
      image_display = COALESCE(EXCLUDED.image_display, pins.image_display),
      thumbnail_236 = COALESCE(EXCLUDED.thumbnail_236, pins.thumbnail_236),
      alt = COALESCE(EXCLUDED.alt, pins.alt),
      title = COALESCE(EXCLUDED.title, pins.title),
      description = COALESCE(EXCLUDED.description, pins.description),
      source_url = COALESCE(EXCLUDED.source_url, pins.source_url),
      source_domain = COALESCE(EXCLUDED.source_domain, pins.source_domain),
      pinner = COALESCE(EXCLUDED.pinner, pins.pinner),
      pinner_url = COALESCE(EXCLUDED.pinner_url, pins.pinner_url),
      palette = COALESCE(EXCLUDED.palette, pins.palette),
      palette_extracted_at = COALESCE(EXCLUDED.palette_extracted_at, pins.palette_extracted_at),
      enriched_at = COALESCE(EXCLUDED.enriched_at, pins.enriched_at),
      enrichment_ok = COALESCE(EXCLUDED.enrichment_ok, pins.enrichment_ok)
  `;
}

export async function patchPin({ projectId, pinId, patch }) {
  // Build dynamic update only over keys present in patch. Postgres
  // safely handles every field, so the verbose explicit list is just
  // a guardrail against accidentally writing junk fields.
  const allowed = {
    palette: (v) => JSON.stringify(v),
    paletteExtractedAt: (v) => v,
    sourceUrl: (v) => v,
    sourceDomain: (v) => v,
    pinner: (v) => v,
    pinnerUrl: (v) => v,
    title: (v) => v,
    description: (v) => v,
    enrichedAt: (v) => v,
    enrichmentOk: (v) => v,
  };
  const sets = [];
  const values = [];
  for (const [key, transform] of Object.entries(allowed)) {
    if (patch && Object.prototype.hasOwnProperty.call(patch, key)) {
      const dbCol = camelToSnake(key);
      sets.push(`${dbCol} = $${sets.length + 1}`);
      values.push(transform(patch[key]));
    }
  }
  if (sets.length === 0) return false;
  const query = `
    UPDATE pins SET ${sets.join(", ")}
    WHERE project_id = $${values.length + 1} AND pin_id = $${values.length + 2}
  `;
  await sql.query(query, [...values, projectId, pinId]);
  return true;
}

export async function mergePins({ projectId, incoming, boardMeta }) {
  let added = 0;
  let updated = 0;
  for (const pin of incoming) {
    if (!pin.pinId) continue;
    const existing = await sql`
      SELECT pin_id FROM pins WHERE project_id = ${projectId} AND pin_id = ${pin.pinId} LIMIT 1
    `;
    await upsertPin({ projectId, pin });
    if (existing.length > 0) updated++;
    else added++;
  }
  if (boardMeta) {
    await sql`
      INSERT INTO boards (
        project_id, board_url, board_name, pinner, captured_at, count
      ) VALUES (
        ${projectId}, ${boardMeta.boardUrl}, ${boardMeta.boardName},
        ${boardMeta.pinner}, ${boardMeta.capturedAt || null}, ${boardMeta.count}
      )
      ON CONFLICT (project_id, board_url) DO UPDATE SET
        board_name = EXCLUDED.board_name,
        pinner = EXCLUDED.pinner,
        captured_at = EXCLUDED.captured_at,
        count = EXCLUDED.count,
        imported_at = now()
    `;
  }
  const total = (await sql`SELECT COUNT(*)::int FROM pins WHERE project_id = ${projectId}`)[0].count;
  return { added, updated, total };
}

export async function setColorStar({ projectId, hex, starred }) {
  const h = String(hex || "").toLowerCase().trim();
  if (!/^#[0-9a-f]{6}$/.test(h)) throw new Error("Invalid hex");
  if (starred) {
    await sql`
      INSERT INTO colors_saved (project_id, hex) VALUES (${projectId}, ${h})
      ON CONFLICT DO NOTHING
    `;
  } else {
    await sql`DELETE FROM colors_saved WHERE project_id = ${projectId} AND hex = ${h}`;
  }
  const rows = await sql`SELECT hex FROM colors_saved WHERE project_id = ${projectId}`;
  return rows.map((r) => r.hex);
}

export async function setPaletteStar({ projectId, pinId, starred }) {
  if (starred) {
    await sql`
      INSERT INTO palettes_saved (project_id, pin_id) VALUES (${projectId}, ${pinId})
      ON CONFLICT DO NOTHING
    `;
  } else {
    await sql`DELETE FROM palettes_saved WHERE project_id = ${projectId} AND pin_id = ${pinId}`;
  }
  const rows = await sql`SELECT pin_id FROM palettes_saved WHERE project_id = ${projectId}`;
  return rows.map((r) => r.pin_id);
}

function camelToSnake(s) {
  return s.replace(/[A-Z]/g, (m) => "_" + m.toLowerCase());
}
