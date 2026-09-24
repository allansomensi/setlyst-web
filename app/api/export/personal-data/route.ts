import { forwardToApi } from "@/lib/server/api-route";

/**
 * `GET /api/export/personal-data` — everything kept about the account
 * (LGPD access and portability requests), as a JSON file.
 */
export async function GET() {
  return forwardToApi("/users/me/data-export", {
    accept: "application/json",
    timeoutMs: 60_000,
  });
}

export const maxDuration = 60;
