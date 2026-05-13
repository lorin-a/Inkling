import { NextResponse } from "next/server";
import { readLibrary } from "../../../lib/moodboardStore";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET() {
  const lib = await readLibrary();
  return NextResponse.json(lib);
}
