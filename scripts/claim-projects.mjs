import { config as loadEnv } from "dotenv";
loadEnv({ path: ".env.local" });
loadEnv();

import { neon } from "@neondatabase/serverless";

const url = process.env.DATABASE_URL;
if (!url) {
  console.error("DATABASE_URL not set.");
  process.exit(1);
}

const sql = neon(url);

/**
 * Reassigns every project owned by the placeholder migration user to a
 * real user, identified by email. Run this once after signing in to
 * production for the first time so your file-migrated projects (Whelm,
 * etc.) become yours instead of sitting orphaned under the placeholder.
 *
 *   node scripts/claim-projects.mjs you@example.com
 *
 * Idempotent: if the placeholder user has no projects, the script is a
 * no-op. If your real user already owns projects, the script merges the
 * placeholder's projects into your account without disturbing yours.
 */

const PLACEHOLDER_EMAIL = "placeholder-owner@moodbuilder.local";

async function main() {
  const email = process.argv[2];
  if (!email) {
    console.error("Usage: node scripts/claim-projects.mjs <email>");
    console.error("       <email> is the address you signed up with.");
    process.exit(1);
  }

  const placeholderRows = await sql`SELECT id FROM users WHERE email = ${PLACEHOLDER_EMAIL} LIMIT 1`;
  if (placeholderRows.length === 0) {
    console.log("No placeholder user found. Nothing to claim.");
    return;
  }
  const placeholderId = placeholderRows[0].id;

  const realRows = await sql`SELECT id, name FROM users WHERE email = ${email} LIMIT 1`;
  if (realRows.length === 0) {
    console.error(`No user found with email ${email}. Sign in first, then re-run.`);
    process.exit(1);
  }
  const realId = realRows[0].id;
  const realName = realRows[0].name || email;

  const owned = await sql`SELECT id, slug, name FROM projects WHERE owner_user_id = ${placeholderId}`;
  if (owned.length === 0) {
    console.log("Placeholder user owns no projects. Nothing to claim.");
    return;
  }

  console.log(`Transferring ${owned.length} project(s) from placeholder → ${realName} (${realId}):`);
  for (const p of owned) {
    console.log(`  • ${p.slug} (${p.name})`);
  }

  // Slug collisions: if you already own a project with the same slug,
  // the unique (owner_user_id, slug) constraint will reject the move.
  // Rename the incoming one with a -placeholder suffix in that case.
  for (const p of owned) {
    const conflict = await sql`
      SELECT id FROM projects WHERE owner_user_id = ${realId} AND slug = ${p.slug} LIMIT 1
    `;
    if (conflict.length > 0) {
      const newSlug = `${p.slug}-placeholder`;
      console.log(`  ! slug "${p.slug}" already owned by you; renaming claimed project to "${newSlug}"`);
      await sql`
        UPDATE projects SET owner_user_id = ${realId}, slug = ${newSlug}
        WHERE id = ${p.id}
      `;
    } else {
      await sql`
        UPDATE projects SET owner_user_id = ${realId}
        WHERE id = ${p.id}
      `;
    }
  }

  // Set the real user's active project to the first claimed one if they
  // didn't have one already.
  await sql`
    UPDATE users SET last_active_project_id = ${owned[0].id}
    WHERE id = ${realId} AND last_active_project_id IS NULL
  `;

  console.log(`\nDone. Reload the home page to see your claimed projects.`);
  console.log(`The placeholder user remains in the database with no projects — safe to delete later.`);
}

main().catch((e) => {
  console.error("Claim failed:", e);
  process.exit(1);
});
