"use client";

import { useSession } from "next-auth/react";
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
      const headers = {
        "Content-Type": "application/json",
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
        ...options.headers,
      };

      const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}${endpoint}`, {
        ...options,
        headers,
      });

      if (!res.ok) {
        const errorData = await res.json().catch(() => ({}));

        let message = errorData.message || `API error: ${res.status}`;
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
