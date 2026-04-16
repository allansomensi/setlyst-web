import { getServerSession } from "next-auth";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";

const API_URL = process.env.NEXT_PUBLIC_API_URL;

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

  const res = await fetch(`${API_URL}${endpoint}`, {
    ...options,
    headers,
  });

  if (!res.ok) {
    const errorData = await res.json().catch(() => ({}));
    throw new Error(errorData.message || `API error: ${res.status}`);
  }

  if (res.status === 204) return {} as T;

  return res.json();
}
