import type { NextRequest } from "next/server";
import { ADMIN_EXPORTS, isAdminExportKind } from "@/lib/console";
import {
  badRequest,
  forwardToApi,
  isSameOriginRequest,
  jsonError,
  pickQuery,
} from "@/lib/server/api-route";

/**
 * `GET /api/export/admin/{users|audit-logs}?<filters>` — the staff CSV
 * exports (admin only; the API checks). Only each export's own filter keys
 * are forwarded (see `ADMIN_EXPORTS`), and only for requests from our own
 * pages: the file holds everyone's e-mail addresses, so a link on another
 * site must not be able to make an admin's browser fetch it.
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ kind: string }> },
) {
  const { kind } = await params;
  if (!isAdminExportKind(kind)) return badRequest();
  if (!isSameOriginRequest(request)) {
    return jsonError(403, "FORBIDDEN", "Cross-site request refused.");
  }

  const { endpoint, keys } = ADMIN_EXPORTS[kind];
  const query = pickQuery(request.nextUrl.searchParams, keys);
  const qs = query.toString();
  return forwardToApi(qs ? `${endpoint}?${qs}` : endpoint, {
    accept: "text/csv",
    timeoutMs: 120_000,
  });
}

export const maxDuration = 120;
