import {
  forwardToApi,
  isSameOriginRequest,
  jsonError,
} from "@/lib/server/api-route";

/** Same limit as the API's `DefaultBodyLimit` on its import routes. */
export const MAX_IMPORT_BYTES = 10 * 1024 * 1024;

function tooLarge() {
  return jsonError(413, "PAYLOAD_TOO_LARGE", "The file is too large.", {
    limit_bytes: MAX_IMPORT_BYTES,
  });
}

/**
 * Streams a JSON file posted to one of the app's import routes on to the
 * API (`apiPath`), as the signed-in person.
 *
 * A route handler rather than a server action: server actions cap bodies
 * at 1 MB and an import file is often bigger. The body goes through as
 * it arrives, with the same 10 MB ceiling the API enforces, and the API
 * gets two minutes to import it. Cross-site posts are refused.
 */
export async function forwardJsonUpload(
  request: Request,
  apiPath: string,
): Promise<Response> {
  if (!isSameOriginRequest(request)) {
    return jsonError(403, "FORBIDDEN", "Cross-site request refused.");
  }

  const contentType = request.headers.get("content-type") ?? "";
  if (!contentType.toLowerCase().startsWith("application/json")) {
    return jsonError(415, "BAD_REQUEST", "Send the file as JSON.");
  }

  const declared = Number(request.headers.get("content-length"));
  if (Number.isFinite(declared) && declared > MAX_IMPORT_BYTES) {
    return tooLarge();
  }
  if (!request.body) {
    return jsonError(400, "BAD_REQUEST", "The file is empty.");
  }

  // Counts bytes as they stream through and aborts past the limit, so a
  // missing or lying Content-Length can't push more than that upstream.
  let received = 0;
  const limited = request.body.pipeThrough(
    new TransformStream<Uint8Array, Uint8Array>({
      transform(chunk, controller) {
        received += chunk.byteLength;
        if (received > MAX_IMPORT_BYTES) {
          controller.error(new Error("PAYLOAD_TOO_LARGE"));
          return;
        }
        controller.enqueue(chunk);
      },
    }),
  );

  const response = await forwardToApi(apiPath, {
    method: "POST",
    body: limited,
    contentType: "application/json",
    accept: "application/json",
    timeoutMs: 120_000,
  });

  if (received > MAX_IMPORT_BYTES) return tooLarge();
  return response;
}
