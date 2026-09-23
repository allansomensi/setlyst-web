"use client";

import { signIn, type SignInResponse } from "next-auth/react";

/**
 * `signIn("credentials", …)` without redirect, robust to next-auth's CSRF
 * race.
 *
 * On a first visit there is no CSRF cookie yet, and the session request
 * `SessionProvider` fires on mount can set one while `signIn` is fetching
 * its own: the POST then carries a token that no longer matches the
 * cookie, and next-auth answers with a redirect to `/signin?csrf=true`
 * and no `error`, which `signIn` reports as a success even though no
 * session was created. One retry (with the now-settled cookie) fixes it.
 */
export async function credentialsSignIn(
  credentials: Record<string, string>,
): Promise<SignInResponse | undefined> {
  const attempt = () =>
    signIn("credentials", { ...credentials, redirect: false });
  const first = await attempt();
  if (first && !first.error && first.url?.includes("csrf=true")) {
    return attempt();
  }
  return first;
}
