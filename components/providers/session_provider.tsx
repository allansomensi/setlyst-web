"use client";

import { SessionProvider } from "next-auth/react";
import type { Session } from "next-auth";
import { SessionKeepAlive } from "@/components/providers/session-keep-alive";

/**
 * next-auth's client session, seeded with the one the server already
 * read for this request (`null` when signed out). Without a seed the
 * provider fetched `/api/auth/session` on every page load — one more
 * request, and one more cookie decrypt on the server, for the landing
 * page and every sign-in screen alike — and again each time the window
 * regained focus. Sign-out and expiry are handled by the pages and the
 * API client (a 401 signs out), not by polling here. A session in use is
 * renewed by SessionKeepAlive, so it only ends after a month unused.
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
      {session && <SessionKeepAlive />}
      {children}
    </SessionProvider>
  );
}
