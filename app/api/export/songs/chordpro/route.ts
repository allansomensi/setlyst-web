import { forwardToApi } from "@/lib/server/api-route";

/** `GET /api/export/songs/chordpro` — the whole personal library as ChordPro. */
export async function GET() {
  return forwardToApi("/songs/export/chordpro", { timeoutMs: 60_000 });
}
