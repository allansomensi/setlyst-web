"use client";

import { useSession, signOut } from "next-auth/react";
import { useCallback } from "react";

export class ApiError extends Error {
  constructor(
    public status: number,
    message: string,
  ) {
    super(message);
    this.name = "ApiError";
  }
}

export function useApi() {
  const { data: session } = useSession();
  const token = session?.user?.apiToken;

  const fetchApi = useCallback(
    async <T>(endpoint: string, options: RequestInit = {}): Promise<T> => {
      if (!endpoint.startsWith("/") || endpoint.startsWith("//")) {
        throw new ApiError(400, "Invalid endpoint");
      }

      const baseUrl = process.env.NEXT_PUBLIC_API_URL?.replace(/\/$/, "") ?? "";

      const headers: Record<string, string> = {
        "Content-Type": "application/json",
        Accept: "application/json",
        ...(options.headers as Record<string, string>),
      };

      if (token) {
        headers["Authorization"] = `Bearer ${token}`;
      }

      let res: Response;
      try {
        res = await fetch(`${baseUrl}${endpoint}`, {
          ...options,
          headers,
        });
      } catch {
        throw new ApiError(503, "Network error. Please check your connection.");
      }

      if (res.status === 401) {
        await signOut({ callbackUrl: "/login" });
        throw new ApiError(401, "Session expired. Please sign in again.");
      }

      if (!res.ok) {
        let message = `API error: ${res.status}`;
        try {
          const body = await res.json();
          if (typeof body?.message === "string") message = body.message;
        } catch {
          // ignore parse errors
        }

        if (res.status === 429) {
          message = "Too many requests. Please wait a moment and try again.";
        }

        throw new ApiError(res.status, message);
      }

      if (res.status === 204) return {} as T;

      return res.json();
    },
    [token],
  );

  return { fetchApi };
}
