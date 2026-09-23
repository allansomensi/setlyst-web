/**
 * File downloads from the app's own route handlers (`/api/export/*`).
 *
 * Isomorphic helpers (the filename parsing is unit-tested) plus the
 * browser-only `downloadFile`.
 */

/** Why a download failed, for picking the right message. */
export type DownloadErrorKind =
  | "unauthorized"
  | "forbidden"
  | "notFound"
  | "rate_limited"
  | "busy"
  | "network"
  | "failed";

export class DownloadError extends Error {
  constructor(
    public readonly kind: DownloadErrorKind,
    public readonly status: number | null = null,
    /** The API's error code, when it sent one (`FEATURE_NOT_IN_PLAN`...). */
    public readonly code: string | null = null,
    public readonly meta: Record<string, unknown> | null = null,
    /** Seconds to wait before retrying, when the server said. */
    public readonly retryAfterSeconds: number | null = null,
  ) {
    super(`Download failed (${kind})`);
    this.name = "DownloadError";
  }
}

/** Removes path separators, control characters and reserved characters. */
export function sanitizeFilename(name: string): string {
  const cleaned = name
    .replace(/[\u0000-\u001f\u007f]/g, "")
    .replace(/[\\/:*?"<>|]/g, "_")
    .replace(/^\.+/, "")
    .trim();
  return cleaned.slice(0, 200);
}

/**
 * The file name in a `Content-Disposition` header, preferring the RFC 5987
 * `filename*=UTF-8''...` form (which keeps accented titles intact) over
 * the plain `filename=`. Null when there's none.
 */
export function parseContentDisposition(
  header: string | null | undefined,
): string | null {
  if (!header) return null;

  const extended = /filename\*\s*=\s*([^;]+)/i.exec(header);
  if (extended) {
    const raw = extended[1].trim().replace(/^"|"$/g, "");
    const match = /^([\w-]+)'[^']*'(.*)$/.exec(raw);
    const [charset, encoded] = match
      ? [match[1].toLowerCase(), match[2]]
      : ["utf-8", raw];
    if (charset === "utf-8") {
      try {
        const decoded = sanitizeFilename(decodeURIComponent(encoded));
        if (decoded) return decoded;
      } catch {
        // Malformed escape: fall back to the plain form.
      }
    }
  }

  const quoted = /filename\s*=\s*"((?:[^"\\]|\\.)*)"/i.exec(header);
  if (quoted) {
    const value = sanitizeFilename(quoted[1].replace(/\\(.)/g, "$1"));
    if (value) return value;
  }

  const bare = /filename\s*=\s*([^;"\s][^;]*)/i.exec(header);
  if (bare) {
    const value = sanitizeFilename(bare[1].trim());
    if (value) return value;
  }

  return null;
}

function kindForStatus(status: number): DownloadErrorKind {
  if (status === 401) return "unauthorized";
  if (status === 403) return "forbidden";
  if (status === 404) return "notFound";
  if (status === 429) return "rate_limited";
  if (status === 503) return "busy";
  return "failed";
}

async function toDownloadError(response: Response): Promise<DownloadError> {
  let code: string | null = null;
  let meta: Record<string, unknown> | null = null;
  try {
    const body = (await response.json()) as { code?: unknown; meta?: unknown };
    if (typeof body.code === "string") code = body.code;
    if (body.meta && typeof body.meta === "object") {
      meta = body.meta as Record<string, unknown>;
    }
  } catch {
    // Not JSON.
  }
  const retryAfter = Number(response.headers.get("retry-after"));
  return new DownloadError(
    kindForStatus(response.status),
    response.status,
    code,
    meta,
    Number.isFinite(retryAfter) && retryAfter > 0 ? retryAfter : null,
  );
}

/**
 * A `data:` URL (e.g. a canvas or html-to-image capture) as a Blob,
 * decoded in place: `fetch(dataUrl)` would need `data:` in the CSP's
 * `connect-src`.
 */
export function dataUrlToBlob(dataUrl: string): Blob {
  const match = /^data:([^;,]*)(;base64)?,([\s\S]*)$/.exec(dataUrl);
  if (!match) throw new Error("Not a data URL");
  const [, type, base64, payload] = match;
  if (!base64) {
    return new Blob([decodeURIComponent(payload)], { type });
  }
  const binary = atob(payload);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i += 1) bytes[i] = binary.charCodeAt(i);
  return new Blob([bytes], { type });
}

/** Hands a Blob to the browser as a file download. */
export function saveBlob(blob: Blob, filename: string): void {
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = filename;
  anchor.rel = "noopener";
  anchor.style.display = "none";
  document.body.appendChild(anchor);
  anchor.click();
  anchor.remove();
  // Revoking in the same tick cancels the download in Safari and Firefox.
  window.setTimeout(() => URL.revokeObjectURL(url), 1_000);
}

/**
 * Downloads `url` (a same-origin route handler) and saves it under the
 * name from its `Content-Disposition`, or `fallbackName`.
 *
 * Throws a `DownloadError`; use `describeDownloadError` in
 * lib/download-toast.ts to show it.
 */
export async function downloadFile(
  url: string,
  fallbackName: string,
  init?: RequestInit,
): Promise<string> {
  let response: Response;
  try {
    response = await fetch(url, { credentials: "same-origin", ...init });
  } catch {
    throw new DownloadError("network");
  }

  if (!response.ok) throw await toDownloadError(response);

  const filename =
    parseContentDisposition(response.headers.get("content-disposition")) ??
    (sanitizeFilename(fallbackName) || "download");
  const blob = await response.blob();
  saveBlob(blob, filename);
  return filename;
}
