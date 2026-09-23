import { forwardToApi } from "@/lib/server/api-route";

/** `GET /api/export/backup` — the account backup (JSON file). */
export async function GET() {
  return forwardToApi("/backup/export", {
    accept: "application/json",
    timeoutMs: 120_000,
  });
}

export const maxDuration = 120;
