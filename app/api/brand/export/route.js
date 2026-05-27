import { NextResponse } from "next/server";
import { launchChromium } from "../../../../lib/pdf/launchChromium";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 60; // PDF render can take a few seconds cold

// localStorage keys the signed-out editor reads from (mirror of localStore.js).
const LS = {
  seeded: "moodbuilder.local.seeded.v1",
  project: "moodbuilder.local.project.v1",
  activeSlug: "moodbuilder.local.activeSlug.v1",
};

/**
 * One-click brand-book PDF.
 *
 * Renders the existing /print page in headless Chromium and returns it as a
 * Letter-landscape PDF — no Cmd+P. The headless browser has no session or
 * localStorage, so the client posts the brand snapshot; we seed it into
 * localStorage before the app boots (the signed-out editor reads from there),
 * and pass the palette via the URL the print page already understands.
 *
 * Body: { palette: string[], project: object, slug?: string }
 */
export async function POST(request) {
  let browser;
  try {
    const { palette = [], project = {}, slug = "sample" } = await request.json();
    const origin = new URL(request.url).origin;

    const paletteParam = palette
      .map((h) => String(h).replace(/^#/, ""))
      .filter(Boolean)
      .join(",");
    const target = `${origin}/print?palette=${encodeURIComponent(paletteParam)}&export=1`;

    const seed = JSON.stringify({ ...project, slug: project.slug || slug });

    browser = await launchChromium();
    const page = await browser.newPage();

    // Seed before any document script runs, so getProject() returns this
    // snapshot instead of seeding the sample.
    await page.evaluateOnNewDocument(
      (projectJson, slugVal, keys) => {
        try {
          localStorage.setItem(keys.seeded, "true");
          localStorage.setItem(keys.project, projectJson);
          localStorage.setItem(keys.activeSlug, JSON.stringify(slugVal));
        } catch { /* storage unavailable */ }
      },
      seed,
      project.slug || slug,
      LS,
    );

    await page.goto(target, { waitUntil: "networkidle0", timeout: 45000 });
    // Let webfonts settle so the wordmark renders in the chosen faces.
    await page.evaluate(async () => { try { await document.fonts.ready; } catch {} });
    await new Promise((r) => setTimeout(r, 400));

    const pdf = await page.pdf({
      format: "Letter",
      landscape: true,
      printBackground: true,
      preferCSSPageSize: true,
      margin: { top: 0, right: 0, bottom: 0, left: 0 },
    });

    const name = (project.wordmark || project.name || "brand").toString().toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "") || "brand";
    return new NextResponse(pdf, {
      status: 200,
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition": `attachment; filename="${name}-brand-book.pdf"`,
        "Cache-Control": "no-store",
      },
    });
  } catch (e) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  } finally {
    if (browser) await browser.close();
  }
}
