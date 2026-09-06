import { notFound } from "next/navigation";
import { boardForToken } from "../../../lib/db/studio";
import Studio from "./Studio";

/**
 * The studio, entered by a member's link. The token is who you are; the
 * board is what you share. Everything else is in Studio.js.
 */

export const dynamic = "force-dynamic";

export async function generateMetadata({ params }) {
  const { token } = await params;
  const view = await boardForToken(String(token || "").replace(/[^A-Za-z0-9_-]/g, ""));
  return { title: view ? `${view.board.name} — Inkling studio` : "Inkling studio" };
}

export default async function StudioByLink({ params }) {
  const { token } = await params;
  const clean = String(token || "").replace(/[^A-Za-z0-9_-]/g, "");
  const view = clean ? await boardForToken(clean) : null;
  if (!view) notFound();
  return <Studio token={clean} initial={view} />;
}
