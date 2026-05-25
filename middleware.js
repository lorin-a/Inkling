import NextAuth from "next-auth";
import { NextResponse } from "next/server";
import { authConfig } from "./lib/auth.config";

/**
 * Feature-flagged auth middleware.
 *
 * Edge-compatible — uses authConfig only (no Postgres adapter). The
 * full auth() with DB access lives in lib/auth.js for server routes.
 *
 * Until the file-based → DB migration completes, the editor still
 * works unauthenticated against local files. Setting AUTH_REQUIRED=true
 * in .env.local flips the gate on.
 *
 * Public routes always pass: hosted brand viewer (/v/[token]), the
 * auth routes themselves, and Next.js internals. /login is special —
 * if already authenticated, we bounce away from it.
 */
const PUBLIC_PATH_PREFIXES = [
  "/api/auth/",
  "/v/",
  "/_next/",
  "/favicon",
];

function isPublicPath(pathname) {
  if (pathname === "/login") return true;
  return PUBLIC_PATH_PREFIXES.some((p) => pathname.startsWith(p));
}

const { auth } = NextAuth(authConfig);

export default auth((req) => {
  const authRequired = process.env.AUTH_REQUIRED === "true";
  const { pathname } = req.nextUrl;

  if (pathname === "/login" && req.auth) {
    return NextResponse.redirect(new URL("/", req.url));
  }

  if (!authRequired) return;
  if (isPublicPath(pathname)) return;
  if (req.auth) return;

  const url = new URL("/login", req.url);
  url.searchParams.set("callbackUrl", pathname);
  return NextResponse.redirect(url);
});

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico).*)"],
};
