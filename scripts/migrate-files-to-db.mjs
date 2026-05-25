import { config as loadEnv } from "dotenv";
loadEnv({ path: ".env.local" });
loadEnv();

import { neon } from "@neondatabase/serverless";
import { readdir, readFile } from "node:fs/promises";
import { existsSync } from "node:fs";
import { join } from "node:path";

const url = process.env.DATABASE_URL;
if (!url) {
  console.error("DATABASE_URL not set.");
  process.exit(1);
}

const sql = neon(url);

const ROOT = process.cwd();
const PROJECTS_DIR = join(ROOT, "data", "projects");

/**
 * One-time copy of every file-based project under data/projects/* into
 * Postgres. Creates a placeholder owner user the first time it runs.
 * Idempotent: re-running is a no-op for projects already present
 * (matched on owner_user_id + slug).
 *
 * Why a placeholder owner: real users don't exist yet until AUTH_REQUIRED
 * flips on. Once you sign in for real, a follow-up migration can reassign
 * these projects to your real user id.
 */

async function ensurePlaceholderUser() {
  const PLACEHOLDER_EMAIL = "placeholder-owner@moodbuilder.local";
  const existing = await sql`SELECT id FROM users WHERE email = ${PLACEHOLDER_EMAIL} LIMIT 1`;
  if (existing.length > 0) return existing[0].id;
  const rows = await sql`
    INSERT INTO users (email, name, "emailVerified")
    VALUES (${PLACEHOLDER_EMAIL}, 'Placeholder Owner', now())
    RETURNING id
  `;
  console.log(`Created placeholder user ${rows[0].id}`);
  return rows[0].id;
}

async function migrateProject(slug, ownerUserId) {
  const dir = join(PROJECTS_DIR, slug);
  const configPath = join(dir, "project.json");
  const libraryPath = join(dir, "library.json");
  const palettePath = join(dir, "palette.json");

  let config = {};
  if (existsSync(configPath)) {
    config = JSON.parse(await readFile(configPath, "utf8"));
  }

  // Project row (idempotent on owner + slug).
  const existing = await sql`
    SELECT id FROM projects WHERE owner_user_id = ${ownerUserId} AND slug = ${slug} LIMIT 1
  `;
  let projectId;
  if (existing.length > 0) {
    projectId = existing[0].id;
    console.log(`  ✓ project ${slug} already in DB (${projectId})`);
  } else {
    const rows = await sql`
      INSERT INTO projects (
        owner_user_id, slug, name, wordmark, period, initial, tagline, body, fonts
      ) VALUES (
        ${ownerUserId}, ${slug},
        ${config.name || slug},
        ${config.wordmark || ""},
        ${config.period || "."},
        ${config.initial || ""},
        ${config.tagline || ""},
        ${config.body || ""},
        ${JSON.stringify(config.fonts || {})}
      )
      RETURNING id
    `;
    projectId = rows[0].id;
    console.log(`  + inserted project ${slug} (${projectId})`);
  }

  // Library: pins + boards + starred hexes + starred palettes.
  if (existsSync(libraryPath)) {
    const lib = JSON.parse(await readFile(libraryPath, "utf8"));
    const pinIds = Object.keys(lib.pins || {});
    let pinsInserted = 0;
    for (const pinId of pinIds) {
      const p = lib.pins[pinId];
      try {
        await sql`
          INSERT INTO pins (
            project_id, pin_id, pin_url, image_original, image_display,
            thumbnail_236, alt, title, description, source_url, source_domain,
            pinner, pinner_url, palette, palette_extracted_at, enriched_at,
            enrichment_ok, tags, added_at
          ) VALUES (
            ${projectId}, ${pinId}, ${p.pinUrl || null},
            ${p.imageOriginal || null}, ${p.imageDisplay || null}, ${p.thumbnail236 || null},
            ${p.alt || null}, ${p.title || null}, ${p.description || null},
            ${p.sourceUrl || null}, ${p.sourceDomain || null},
            ${p.pinner || null}, ${p.pinnerUrl || null},
            ${p.palette ? JSON.stringify(p.palette) : null},
            ${p.paletteExtractedAt || null},
            ${p.enrichedAt || null}, ${p.enrichmentOk ?? null},
            ${JSON.stringify(p.tags || [])},
            ${p.addedAt || new Date().toISOString()}
          )
          ON CONFLICT (project_id, pin_id) DO NOTHING
        `;
        pinsInserted++;
      } catch (e) {
        console.error(`    ! pin ${pinId} failed: ${e.message}`);
      }
    }
    console.log(`  + ${pinsInserted}/${pinIds.length} pins`);

    for (const board of lib.boards || []) {
      await sql`
        INSERT INTO boards (project_id, board_url, board_name, pinner, captured_at, count, imported_at)
        VALUES (
          ${projectId}, ${board.boardUrl}, ${board.boardName || null},
          ${board.pinner || null}, ${board.capturedAt || null},
          ${board.count || null}, ${board.importedAt || new Date().toISOString()}
        )
        ON CONFLICT (project_id, board_url) DO NOTHING
      `;
    }
    if ((lib.boards || []).length > 0) {
      console.log(`  + ${lib.boards.length} board(s)`);
    }

    // Starred hexes
    for (const hex of lib.starred || []) {
      const h = String(hex).toLowerCase();
      if (!/^#[0-9a-f]{6}$/.test(h)) continue;
      await sql`
        INSERT INTO colors_saved (project_id, hex) VALUES (${projectId}, ${h})
        ON CONFLICT DO NOTHING
      `;
    }
    if ((lib.starred || []).length > 0) {
      console.log(`  + ${lib.starred.length} starred color(s)`);
    }

    // Starred palettes (pin-level saves)
    for (const pinId of lib.starredPalettes || []) {
      await sql`
        INSERT INTO palettes_saved (project_id, pin_id) VALUES (${projectId}, ${pinId})
        ON CONFLICT DO NOTHING
      `;
    }
    if ((lib.starredPalettes || []).length > 0) {
      console.log(`  + ${lib.starredPalettes.length} saved palette(s)`);
    }
  }

  // project_palette config
  if (existsSync(palettePath)) {
    const pal = JSON.parse(await readFile(palettePath, "utf8"));
    await sql`
      INSERT INTO project_palette (project_id, brand, inspiration)
      VALUES (${projectId},
              ${JSON.stringify(pal.brand || {})},
              ${JSON.stringify(pal.inspiration || {})})
      ON CONFLICT (project_id) DO UPDATE SET
        brand = EXCLUDED.brand,
        inspiration = EXCLUDED.inspiration,
        updated_at = now()
    `;
    console.log(`  + project_palette`);
  }

  return projectId;
}

async function main() {
  if (!existsSync(PROJECTS_DIR)) {
    console.log("No data/projects/ directory found. Nothing to migrate.");
    return;
  }

  const ownerUserId = await ensurePlaceholderUser();

  const entries = await readdir(PROJECTS_DIR, { withFileTypes: true });
  const slugs = entries.filter((e) => e.isDirectory()).map((e) => e.name);

  if (slugs.length === 0) {
    console.log("data/projects/ is empty. Nothing to migrate.");
    return;
  }

  console.log(`Migrating ${slugs.length} project(s) to placeholder owner ${ownerUserId}:\n`);
  let firstProjectId = null;
  for (const slug of slugs) {
    console.log(`→ ${slug}`);
    const id = await migrateProject(slug, ownerUserId);
    if (!firstProjectId) firstProjectId = id;
  }

  // Set the placeholder user's last_active_project_id so listings have
  // something to load by default.
  await sql`
    UPDATE users SET last_active_project_id = ${firstProjectId}
    WHERE id = ${ownerUserId} AND last_active_project_id IS NULL
  `;

  console.log(`\nMigration complete. Verify:`);
  const projectCount = (await sql`SELECT COUNT(*)::int FROM projects`)[0].count;
  const pinCount = (await sql`SELECT COUNT(*)::int FROM pins`)[0].count;
  console.log(`  Projects in DB: ${projectCount}`);
  console.log(`  Pins in DB:     ${pinCount}`);
}

main().catch((e) => {
  console.error("Migration failed:", e);
  process.exit(1);
});
