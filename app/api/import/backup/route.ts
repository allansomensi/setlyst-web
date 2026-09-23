import {
  forwardToApi,
  isSameOriginRequest,
  jsonError,
} from "@/lib/server/api-route";
import { revalidateDashboard } from "@/lib/revalidate";

/**
 * `POST /api/import/backup` — restores a backup file (the raw JSON as the
 * request body, `Content-Type: application/json`).
 *
 * A route handler rather than a server action: server actions cap bodies
 * at 1 MB and a real library's backup is far bigger (audit P0 #1). The
 * body is streamed to the API as it arrives, with the same 10 MB ceiling
 * the API enforces, and the API gets two minutes to import it.
 */

/** Same limit as the API's `DefaultBodyLimit`. */
const MAX_BACKUP_BYTES = 10 * 1024 * 1024;

export const maxDuration = 150;

function tooLarge() {
  return jsonError(413, "PAYLOAD_TOO_LARGE", "The backup file is too large.", {
    limit_bytes: MAX_BACKUP_BYTES,
  });
}

export async function POST(request: Request) {
  if (!isSameOriginRequest(request)) {
    return jsonError(403, "FORBIDDEN", "Cross-site request refused.");
  }

  const contentType = request.headers.get("content-type") ?? "";
  if (!contentType.toLowerCase().startsWith("application/json")) {
    return jsonError(415, "BAD_REQUEST", "Send the backup as JSON.");
  }

  const declared = Number(request.headers.get("content-length"));
  if (Number.isFinite(declared) && declared > MAX_BACKUP_BYTES) {
    return tooLarge();
  }
  if (!request.body) {
    return jsonError(400, "BAD_REQUEST", "The backup file is empty.");
  }

  // Counts bytes as they stream through and aborts past the limit, so a
  // missing or lying Content-Length can't push more than that upstream.
  let received = 0;
  const limited = request.body.pipeThrough(
    new TransformStream<Uint8Array, Uint8Array>({
      transform(chunk, controller) {
        received += chunk.byteLength;
        if (received > MAX_BACKUP_BYTES) {
          controller.error(new Error("PAYLOAD_TOO_LARGE"));
          return;
        }
        controller.enqueue(chunk);
      },
    }),
  );

  const response = await forwardToApi("/backup/import", {
    method: "POST",
    body: limited,
    contentType: "application/json",
    accept: "application/json",
    timeoutMs: 120_000,
  });

  if (received > MAX_BACKUP_BYTES) return tooLarge();

  if (response.ok) {
    // Everything may have changed: songs, artists, setlists, gigs, tags.
    revalidateDashboard("", "layout");
  }
  return response;
}
