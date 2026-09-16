import { DefaultSession, DefaultUser } from "next-auth";

declare module "next-auth" {
  interface Session {
    error?: "TokenExpired";
    user: {
      id: string;
      role: "user" | "moderator" | "admin";
      apiToken: string;
      isFirstLogin?: boolean;
    } & DefaultSession["user"];
  }

  interface User extends DefaultUser {
    id: string;
    role: "user" | "moderator" | "admin";
    apiToken: string;
    isFirstLogin?: boolean;
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
  }
}
