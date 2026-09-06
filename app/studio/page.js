import { redirect } from "next/navigation";
import { readLibrary } from "../../lib/moodboardStore";
import { getActiveSlug } from "../../lib/projectRegistry";
import * as dbLibrary from "../../lib/db/library";
import { getActiveProjectForUser, getRequestContext } from "../../lib/api/context";
import { createBoard, latestBoardForSlug, ownerTokenFor, mergeCards } from "../../lib/db/studio";

/**
 * /studio is the door, not the room. It finds (or opens) the studio board for
 * the active project and sends you to your own link, which is where the work
 * happens (app/s/[token]). Your partner never comes through here; they come
 * through their link.
 */

export const dynamic = "force-dynamic";

async function loadLibrary() {
  const { userId } = await getRequestContext();
  if (userId) {
    const active = await getActiveProjectForUser(userId);
    if (!active) return { slug: null, name: null, pins: [] };
    const lib = await dbLibrary.readLibrary({ projectId: active.id });
    return { slug: active.slug, name: active.name, pins: Object.values(lib?.pins || {}) };
  }
  const slug = await getActiveSlug();
  const lib = await readLibrary();
  return { slug, name: (lib?.boards?.[0]?.boardName) || slug, pins: Object.values(lib?.pins || {}) };
}

// Only what a card needs to render; the full pin record is provenance the
// studio never reads. Palette stays: it is the material of the Colors step.
function toCards(pins, by) {
  return pins
    .filter((p) => p?.thumbnail236 || p?.imageDisplay)
    .map((p) => ({
      id: p.pinId,
      kind: "reference",
      src: p.thumbnail236 || p.imageDisplay,
      full: p.imageDisplay || p.imageOriginal || p.thumbnail236,
      alt: p.alt || p.title || "",
      palette: Array.isArray(p.palette) ? p.palette : [],
      credit: p.sourceDomain || p.pinner || "",
      sourceUrl: p.sourceUrl || p.pinUrl || "",
      by,
    }));
}

export default async function StudioDoor({ searchParams }) {
  const sp = await searchParams;
  const { slug, name, pins } = await loadLibrary();
  if (!slug) redirect("/import");

  const cards = toCards(pins, "Lorin");
  let boardId = await latestBoardForSlug(slug);
  if (!boardId) {
    const made = await createBoard({
      projectSlug: slug,
      name: (name || slug).toString().toUpperCase() === slug.toUpperCase() ? slug.toUpperCase() : name || slug,
      cards,
      members: [{ name: "Lorin", role: "owner" }],
    });
    boardId = made.id;
  } else if (cards.length) {
    // A re-import (the full bookmarklet run after a partial seed) joins the pool.
    await mergeCards(boardId, cards);
  }
  const token = await ownerTokenFor(boardId);
  const tester = sp?.tester ? `?tester=${encodeURIComponent(String(sp.tester))}` : "";
  redirect(`/s/${token}${tester}`);
}
