import NextAuth from "next-auth";
import Google from "next-auth/providers/google";
import Resend from "next-auth/providers/resend";
import PostgresAdapter from "@auth/pg-adapter";
import { Pool } from "pg";
import { authConfig } from "./auth.config";

/**
 * Full Auth.js config — runs on Node, has DB access via the Postgres
 * adapter. Used by the /api/auth/[...nextauth] route handler and any
 * server code that calls `auth()` and needs the full session +
 * provider machinery.
 *
 * Middleware uses lib/auth.config.js directly — that one is
 * edge-compatible and provider-less.
 */
const pool = new Pool({
  connectionString: process.env.DATABASE_URL_UNPOOLED || process.env.DATABASE_URL,
});

export const { handlers, auth, signIn, signOut } = NextAuth({
  ...authConfig,
  adapter: PostgresAdapter(pool),
  providers: [
    Resend({
      apiKey: process.env.RESEND_API_KEY,
      from: process.env.RESEND_FROM || "onboarding@resend.dev",
      allowDangerousEmailAccountLinking: true,
    }),
    Google({
      clientId: process.env.GOOGLE_CLIENT_ID,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET,
      // Auth.js default refuses to link an OAuth login to an existing
      // user row matched by email — protects against account takeover
      // when the existing row came from an unverified-email path. We
      // trust Google’s email verification, so allow it. Without this
      // flag, a half-failed prior sign-in attempt that created a user
      // row but no account row would lock out the user forever.
      allowDangerousEmailAccountLinking: true,
    }),
    // Same flag on Resend so magic-link logins can attach to an
    // existing user created by a prior Google sign-in (or vice versa).
  ],
});
