import { auth } from "./auth";

/**
 * Admin allowlist. Set ADMIN_EMAILS (comma-separated) in env; falls back to
 * the project owner so review works out of the box in dev. Admin gates the
 * submission review queue — approving a resource publishes it, so it must be
 * owner-only.
 */
const FALLBACK_ADMINS = ["landerbe@andrew.cmu.edu"];

function adminEmails() {
  const fromEnv = (process.env.ADMIN_EMAILS || "")
    .split(",")
    .map((s) => s.trim().toLowerCase())
    .filter(Boolean);
  return new Set(fromEnv.length ? fromEnv : FALLBACK_ADMINS.map((e) => e.toLowerCase()));
}

export function isAdminEmail(email) {
  if (!email) return false;
  return adminEmails().has(email.toLowerCase());
}

/** Resolve the current session’s email and whether it’s an admin. */
export async function getAdminSession() {
  try {
    const session = await auth();
    const email = session?.user?.email || null;
    return { email, isAdmin: isAdminEmail(email) };
  } catch {
    return { email: null, isAdmin: false };
  }
}
