import { DefaultSession, DefaultUser } from "next-auth";

type PlatformRole = "user" | "moderator" | "admin";

declare module "next-auth" {
  interface Session {
    error?: "TokenExpired";
    user: {
      id: string;
      role: PlatformRole;
      apiToken: string;
      isFirstLogin?: boolean;
      /**
       * The account must choose a new password before anything else (a
       * temporary password, or one below the current policy). The proxy
       * keeps it on the change-password screen until then.
       */
      mustChangePassword?: boolean;
      /** The account's saved interface language — see lib/auth.ts. */
      language?: string;
      /**
       * Set while a staff member is viewing the platform as this user
       * (read-only). Identifies who to switch back to.
       */
      impersonator?: { id: string; name: string; role: PlatformRole };
    } & DefaultSession["user"];
  }

  interface User extends DefaultUser {
    id: string;
    role: PlatformRole;
    apiToken: string;
    isFirstLogin?: boolean;
    mustChangePassword?: boolean;
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
    role: PlatformRole;
    apiToken: string;
    apiTokenExpires?: number;
    error?: "TokenExpired";
    isFirstLogin?: boolean;
    mustChangePassword?: boolean;
    language?: string;
    /** The staff member's own session, kept aside while impersonating. */
    impersonator?: {
      id: string;
      name: string;
      role: PlatformRole;
      apiToken: string;
      apiTokenExpires?: number;
    };
  }
}
