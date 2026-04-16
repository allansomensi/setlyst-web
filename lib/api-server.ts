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

export async function fetchServerApi<T>(
  endpoint: string,
  options: RequestInit = {},
): Promise<T> {
  const session = await getServerSession(authOptions);
  const token = session?.user?.apiToken;

  const headers = new Headers(options.headers);
  headers.set("Content-Type", "application/json");
  if (token) {
    headers.set("Authorization", `Bearer ${token}`);
  }

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
}
