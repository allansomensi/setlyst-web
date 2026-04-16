import { useSession } from "next-auth/react";

const API_URL = process.env.NEXT_PUBLIC_API_URL;

export function useApi() {
  const { data: session } = useSession();
  const token = session?.user?.apiToken;

  const fetchApi = async <T>(
    endpoint: string,
    options: RequestInit = {},
  ): Promise<T> => {
    const headers = {
      "Content-Type": "application/json",
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...options.headers,
    };

    const res = await fetch(`${API_URL}${endpoint}`, { ...options, headers });

    if (!res.ok) {
      const errorData = await res.json().catch(() => ({}));
      throw new Error(errorData.message || `API error: ${res.status}`);
    }

    if (res.status === 204) return {} as T;

    return res.json();
  };

  return { fetchApi };
}
