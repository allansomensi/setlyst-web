"use client";

import { SessionProvider } from "next-auth/react";
import type { Session } from "next-auth";

/**
 * next-auth's client session, seeded with the one the server already
 * read for this request (`null` when signed out). Without a seed the
 * provider fetched `/api/auth/session` on every page load — one more
 * request, and one more cookie decrypt on the server, for the landing
 * page and every sign-in screen alike — and again each time the window
 * regained focus. Sign-out and expiry are handled by the pages and the
 * API client (a 401 signs out), not by polling here.
 */
export function AuthProvider({
  session,
  children,
}: {
  session: Session | null;
  children: React.ReactNode;
}) {
  return (
    <SessionProvider session={session} refetchOnWindowFocus={false}>
      {children}
    </SessionProvider>
  );
}
