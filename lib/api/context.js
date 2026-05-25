import { auth } from "../auth";
import * as dbProjects from "../db/projects";

/**
 * Per-request context for the dual-mode (file ↔ DB) transition.
 *
 * Until AUTH_REQUIRED=true and the file-based editor retires, every
 * API route runs in one of two modes:
 *
 *   - **DB mode** when a session userId is present. Reads + writes hit
 *     Postgres via lib/db/*. Each user sees only their own projects.
 *   - **File mode** otherwise. Reads + writes hit data/projects/{slug}/
 *     via lib/projectRegistry + lib/moodboardStore + lib/paletteStore.
 *     Single-tenant, exactly like before this migration began.
 *
 * Route handlers call `getRequestContext()` once, branch on `userId`,
 * and use the matching layer. This keeps the switch logic explicit at
 * each handler rather than smuggling it through shared globals.
 */
export async function getRequestContext() {
  let userId = null;
  try {
    const session = await auth();
    userId = session?.user?.id || null;
  } catch {
    // auth() can throw during build-time prerendering when no request
    // context is available. Treat as unauthenticated.
  }
  return { userId };
}

/**
 * Resolve the active project for the current user in DB mode. Returns
 * null when the user has no projects yet (brand new account).
 */
export async function getActiveProjectForUser(userId) {
  if (!userId) return null;
  return await dbProjects.getActiveProject({ userId });
}
