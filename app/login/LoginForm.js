"use client";

import { useSearchParams } from "next/navigation";
import { signIn } from "next-auth/react";
import { useState } from "react";
import styles from "./page.module.css";

export default function LoginForm() {
  const params = useSearchParams();
  const checkEmail = params.get("check-email") === "1";
  const callbackUrl = params.get("callbackUrl") || "/";
  const error = params.get("error");

  const [email, setEmail] = useState("");
  const [submitting, setSubmitting] = useState(false);

  async function submitEmail(e) {
    e.preventDefault();
    if (!email.trim()) return;
    setSubmitting(true);
    await signIn("resend", { email: email.trim(), callbackUrl });
  }

  if (checkEmail) {
    return (
      <main className={styles.page}>
        <div className={styles.card}>
          <h1 className={styles.title}>Check your email</h1>
          <p className={styles.body}>
            A sign-in link is on its way. Open the message and click the link to come back here.
          </p>
          <p className={styles.hint}>
            Didn't arrive? Check spam, or <a href="/login" className={styles.link}>try a different email</a>.
          </p>
        </div>
      </main>
    );
  }

  return (
    <main className={styles.page}>
      <div className={styles.card}>
        <h1 className={styles.title}>Moodbuilder</h1>
        <p className={styles.subtitle}>
          A studio for designers turning Pinterest moods into brand identities. Sign in to save palettes and projects across devices.
        </p>

        <button
          type="button"
          className={styles.googleBtn}
          onClick={() => signIn("google", { callbackUrl })}
        >
          <GoogleGlyph /> Continue with Google
        </button>

        <div className={styles.divider}>
          <span>or</span>
        </div>

        <form onSubmit={submitEmail} className={styles.form}>
          <label className={styles.field}>
            <span className={styles.label}>Email</span>
            <input
              type="email"
              required
              placeholder="you@studio.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className={styles.input}
              autoFocus
              autoComplete="email"
            />
          </label>
          <button
            type="submit"
            className={styles.emailBtn}
            disabled={!email.trim() || submitting}
          >
            {submitting ? "Sending link…" : "Send sign-in link"}
          </button>
        </form>

        {error && (
          <p className={styles.error}>
            {error === "OAuthAccountNotLinked"
              ? "That email is already linked to a different sign-in method. Try the one you used first."
              : "Something went wrong. Please try again."}
          </p>
        )}

        <p className={styles.fineprint}>
          No password. We'll email you a one-time link, or you can use Google.
        </p>
        <p className={styles.playgroundHint}>
          An account-free playground is on the way. Until then, sign in to explore.
        </p>
      </div>
    </main>
  );
}

function GoogleGlyph() {
  return (
    <svg width="18" height="18" viewBox="0 0 18 18" aria-hidden="true">
      <path d="M17.64 9.2a10.34 10.34 0 0 0-.16-1.84H9v3.48h4.84a4.14 4.14 0 0 1-1.8 2.71v2.26h2.92a8.78 8.78 0 0 0 2.68-6.61z" fill="#4285F4"/>
      <path d="M9 18a8.6 8.6 0 0 0 5.96-2.18l-2.92-2.26a5.4 5.4 0 0 1-8.06-2.83H.96v2.33A9 9 0 0 0 9 18z" fill="#34A853"/>
      <path d="M3.98 10.73a5.4 5.4 0 0 1 0-3.46V4.94H.96a9 9 0 0 0 0 8.12l3.02-2.33z" fill="#FBBC05"/>
      <path d="M9 3.58c1.32 0 2.5.45 3.44 1.35l2.58-2.58A9 9 0 0 0 .96 4.94l3.02 2.33A5.36 5.36 0 0 1 9 3.58z" fill="#EA4335"/>
    </svg>
  );
}
