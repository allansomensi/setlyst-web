import "server-only";

import { cache } from "react";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";

/**
 * The current session, read once per request (React `cache`). The locale
 * layout, the dashboard layout and the page itself all need it; each
 * `getServerSession` call decrypts the cookie and runs the callbacks
 * again. Outside a render (route handlers, server actions) `cache` is a
 * plain pass-through.
 */
export const getSession = cache(() => getServerSession(authOptions));
