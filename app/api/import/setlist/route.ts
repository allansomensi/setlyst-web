import { forwardJsonUpload } from "@/lib/server/json-upload";
import { revalidateDashboard } from "@/lib/revalidate";

/**
 * `POST /api/import/setlist` — imports a setlist file (from "Export →
 * Setlist file"), with the songs and artists it brings. See
 * `forwardJsonUpload` for the limits.
 */

export const maxDuration = 150;

export async function POST(request: Request) {
  const response = await forwardJsonUpload(request, "/setlists/import");
  if (response.ok) {
    // A new setlist, and possibly new songs, artists and tags.
    revalidateDashboard("", "layout");
  }
  return response;
}
