import puppeteer from "puppeteer-core";

/**
 * Launch a headless Chromium that works in both worlds:
 *   - Local dev / macOS: drive an already-installed Chrome (env override,
 *     system Chrome, or the puppeteer cache).
 *   - Vercel serverless: the @sparticuz/chromium Lambda build.
 *
 * Returns a puppeteer-core Browser. Caller is responsible for closing it.
 */
export async function launchChromium() {
  const onVercel = !!process.env.VERCEL || !!process.env.AWS_LAMBDA_FUNCTION_NAME;

  if (onVercel) {
    // Dynamic import so the ~50MB Lambda binary never loads in local dev.
    const chromium = (await import("@sparticuz/chromium")).default;
    return puppeteer.launch({
      args: chromium.args,
      executablePath: await chromium.executablePath(),
      headless: chromium.headless,
      defaultViewport: chromium.defaultViewport,
    });
  }

  return puppeteer.launch({
    executablePath: localChromePath(),
    headless: true,
    args: ["--no-sandbox", "--disable-setuid-sandbox"],
  });
}

function localChromePath() {
  if (process.env.PUPPETEER_EXECUTABLE_PATH) return process.env.PUPPETEER_EXECUTABLE_PATH;

  const fs = require("fs");
  const os = require("os");
  const path = require("path");

  const candidates = [
    "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome",
    "/Applications/Google Chrome Canary.app/Contents/MacOS/Google Chrome Canary",
    "/usr/bin/google-chrome",
    "/usr/bin/chromium-browser",
  ];

  // The puppeteer cache (chrome / chrome-headless-shell), version-agnostic.
  const cacheRoot = path.join(os.homedir(), ".cache", "puppeteer");
  try {
    for (const kind of ["chrome", "chrome-headless-shell"]) {
      const base = path.join(cacheRoot, kind);
      if (!fs.existsSync(base)) continue;
      for (const ver of fs.readdirSync(base)) {
        const dir = path.join(base, ver);
        const found = walkForChrome(dir, fs, path);
        if (found) candidates.push(found);
      }
    }
  } catch { /* cache not present */ }

  const hit = candidates.find((p) => { try { return fs.existsSync(p); } catch { return false; } });
  if (!hit) throw new Error("No local Chrome found. Set PUPPETEER_EXECUTABLE_PATH.");
  return hit;
}

// Find the executable inside an unpacked chrome-for-testing folder.
function walkForChrome(dir, fs, path) {
  const names = ["Google Chrome for Testing", "chrome-headless-shell", "chrome"];
  const stack = [dir];
  while (stack.length) {
    const cur = stack.pop();
    let entries;
    try { entries = fs.readdirSync(cur, { withFileTypes: true }); } catch { continue; }
    for (const e of entries) {
      const full = path.join(cur, e.name);
      if (e.isDirectory()) stack.push(full);
      else if (names.includes(e.name)) return full;
    }
  }
  return null;
}
