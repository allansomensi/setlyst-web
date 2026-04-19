import { getServerSession } from "next-auth";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";

export class ApiError extends Error {
  constructor(
    public status: number,
    message: string,
  ) {
    super(message);
    this.name = "ApiError";
  }
}

/**
 * Returns the internal API base URL.
 * Uses API_URL (server-only) first, falls back to NEXT_PUBLIC_API_URL.
 * Never exposed to the browser bundle.
 */
function getApiBaseUrl(): string {
  const url = process.env.API_URL ?? process.env.NEXT_PUBLIC_API_URL ?? "";

  if (!url) {
    throw new ApiError(500, "API base URL is not configured.");
  }

  return url.replace(/\/$/, "");
}

/**
 * Validates that the endpoint is a safe relative path and cannot be used
 * for SSRF (e.g. "//evil.com" or absolute URLs).
 */
function validateEndpoint(endpoint: string): void {
  if (!endpoint.startsWith("/") || endpoint.startsWith("//")) {
    throw new ApiError(400, `Invalid API endpoint: ${endpoint}`);
  }
}

export async function fetchServerApi<T>(
  endpoint: string,
  options: RequestInit = {},
): Promise<T> {
  validateEndpoint(endpoint);

  const session = await getServerSession(authOptions);
  const token = session?.user?.apiToken;

  const headers = new Headers(options.headers);
  headers.set("Content-Type", "application/json");
  headers.set("Accept", "application/json");

  if (token) {
    headers.set("Authorization", `Bearer ${token}`);
  }

  const baseUrl = getApiBaseUrl();
  const url = `${baseUrl}${endpoint}`;

  let res: Response;
  try {
    res = await fetch(url, {
      ...options,
      headers,
      // Prevent SSRF by not following redirects automatically
      redirect: "error",
    });
  } catch (err) {
    console.error("[fetchServerApi] Network error:", err);
    throw new ApiError(503, "Unable to reach the backend service.");
  }

  if (!res.ok) {
    let message: string;
    try {
      const body = await res.json();
      message =
        typeof body?.message === "string"
          ? body.message
          : `API error: ${res.status}`;
    } catch {
      message = `API error: ${res.status}`;
    }

    if (res.status === 429) {
      message = "Too many requests. Please wait a moment and try again.";
    }

    if (res.status === 401) {
      message = "Unauthorized. Please sign in again.";
    }

    throw new ApiError(res.status, message);
  }

  if (res.status === 204) return {} as T;

  return res.json();
}
