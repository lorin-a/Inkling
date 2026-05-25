/**
 * Edge-safe Auth.js config. Used by middleware.js, which runs on the
 * Edge runtime by default and can't import Node-native code (the pg
 * adapter, or providers like Resend that need an adapter to persist
 * verification tokens).
 *
 * Middleware only validates JWTs to gate routes — it doesn't initiate
 * sign-in flows. Providers therefore live exclusively in lib/auth.js
 * alongside the adapter; this minimal config is just enough for the
 * middleware-side `auth()` to decode the JWT cookie.
 */
export const authConfig = {
  session: { strategy: "jwt" },
  trustHost: true,
  // No providers here on purpose — see the file comment above.
  providers: [],
  pages: {
    signIn: "/login",
    verifyRequest: "/login?check-email=1",
  },
  callbacks: {
    async jwt({ token, user }) {
      if (user?.id) token.userId = user.id;
      return token;
    },
    async session({ session, token }) {
      if (token?.userId) session.user.id = token.userId;
      return session;
    },
  },
};
