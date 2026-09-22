import { DefaultSession, DefaultUser } from "next-auth";

declare module "next-auth" {
  interface Session {
    error?: "TokenExpired";
    user: {
      id: string;
      role: "user" | "moderator" | "admin";
      apiToken: string;
      isFirstLogin?: boolean;
      /** The account's saved interface language — see lib/auth.ts. */
      language?: string;
    } & DefaultSession["user"];
  }

  interface User extends DefaultUser {
    id: string;
    role: "user" | "moderator" | "admin";
    apiToken: string;
    isFirstLogin?: boolean;
    /**
     * Read from the API at sign-in so the very first launch on a new
     * device can open in the right language, before any cookie exists.
     * Null when the lookup failed — locale detection then falls back to
     * the `Accept-Language` header as it always did.
     */
    language?: string | null;
  }
}

declare module "next-auth/jwt" {
  interface JWT {
    id: string;
    role: "user" | "moderator" | "admin";
    apiToken: string;
    apiTokenExpires?: number;
    error?: "TokenExpired";
    isFirstLogin?: boolean;
    language?: string;
  }
}
