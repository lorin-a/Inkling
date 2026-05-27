"use client";

/**
 * apiFetch — the editor's single data entry point.
 *
 * Signed in  → forwards to the real /api/* route (Postgres-backed).
 * Signed out → answers persistence reads/writes from localStorage
 *              (lib/storage/localStore), so the playground works with no
 *              account. Compute routes (palette extraction, font search,
 *              source enrichment) always hit the network in both modes —
 *              they're stateless processing, not persistence.
 *
 * Call sites use it exactly like fetch(): `await apiFetch(path, opts)`
 * returns something with `.ok`, `.status`, and `.json()`. Existing hooks
 * change by one identifier (fetch → apiFetch) and nothing else.
 */

import * as local from "../storage/localStore";

// ---------------------------------------------------------- auth detection

let authedPromise = null;

/**
 * Resolves once to whether a real session exists, then caches. We can't
 * read this synchronously, so callers await it. The cache means we only
 * hit /api/auth/session a single time per page load.
 */
export function isAuthed() {
  if (!authedPromise) {
    authedPromise = fetch("/api/auth/session", { cache: "no-store" })
      .then((r) => (r.ok ? r.json() : null))
      .then((s) => !!s?.user)
      .catch(() => false);
  }
  return authedPromise;
}

/** Drop the cached auth state (e.g. right after sign-in/out). */
export function resetAuthCache() {
  authedPromise = null;
}

// ---------------------------------------------------------- synthetic Response

function jsonResponse(data, status = 200) {
  return {
    ok: status >= 200 && status < 300,
    status,
    json: async () => data,
    text: async () => JSON.stringify(data),
  };
}

function parseBody(opts) {
  if (!opts?.body) return {};
  try {
    return typeof opts.body === "string" ? JSON.parse(opts.body) : opts.body;
  } catch {
    return {};
  }
}

// ---------------------------------------------------------- local router

// Persistence routes answered from localStorage when signed out. Anything
// not listed here falls through to the network (compute + auth routes).
function routeLocal(path, opts) {
  const method = (opts?.method || "GET").toUpperCase();
  const url = path.split("?")[0];
  const body = parseBody(opts);

  switch (`${method} ${url}`) {
    case "GET /api/auth/session":
      return jsonResponse({}); // no user — signed out

    case "GET /api/project":
      return jsonResponse(local.getProject());
    case "PATCH /api/project":
      return jsonResponse(local.patchProject(body));

    case "GET /api/projects":
      return jsonResponse({ projects: local.listProjects() });
    case "POST /api/projects":
      // Creating extra projects is a sync feature — nudge toward sign-in.
      return jsonResponse({ error: "Sign in to save more than one project" }, 401);

    case "GET /api/projects/active":
      return jsonResponse({ slug: local.getActiveSlug() });
    case "PUT /api/projects/active":
      try {
        return jsonResponse({ slug: local.setActiveSlug(body.slug) });
      } catch (e) {
        return jsonResponse({ error: e.message }, 400);
      }

    case "GET /api/marks":
      return jsonResponse(local.getMarks());
    case "POST /api/marks":
      // SVG marks are text, so signed-out visitors store them locally (sent as
      // JSON { marks: [{ name, svg }] }, read client-side from the file).
      return jsonResponse(local.addMarks(body));
    case "DELETE /api/marks":
      return jsonResponse(local.removeMark(new URLSearchParams(path.split("?")[1] || "").get("file")));

    case "GET /api/textures":
      // Textures are binary uploads — empty until an IndexedDB/Blob store ships.
      return jsonResponse({ textures: [] });

    case "GET /api/presets":
      return jsonResponse({ presets: local.readPresets() });
    case "POST /api/presets":
      return jsonResponse({ preset: local.addPreset(body) });
    case "DELETE /api/presets":
      return jsonResponse({ presets: local.removePreset(new URLSearchParams(path.split("?")[1] || "").get("id")) });

    case "GET /api/library":
      return jsonResponse(local.readLibrary());
    case "GET /api/library/palette":
      return jsonResponse(local.buildPaletteResponse());

    case "POST /api/library/star":
      if (typeof body.hex !== "string" || typeof body.starred !== "boolean") {
        return jsonResponse({ error: "Body must be {hex, starred}" }, 400);
      }
      return jsonResponse({ ok: true, starred: local.setColorStar(body.hex, body.starred) });

    case "POST /api/library/star-palette":
      if (!body.pinId || typeof body.starred !== "boolean") {
        return jsonResponse({ error: "Missing pinId or starred" }, 400);
      }
      return jsonResponse({ ok: true, starredPalettes: local.setPaletteStar(body.pinId, body.starred) });

    default:
      return null; // not a persistence route — let the network handle it
  }
}

// ---------------------------------------------------------- public

export async function apiFetch(path, opts) {
  const authed = await isAuthed();
  if (authed) return fetch(path, opts);

  const localResult = routeLocal(path, opts);
  if (localResult) return localResult;

  // Compute / auth route — runs on the server for everyone.
  return fetch(path, opts);
}
