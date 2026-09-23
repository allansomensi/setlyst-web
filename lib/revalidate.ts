import { revalidatePath } from "next/cache";

export type RevalidateType = "page" | "layout";

/**
 * The route pattern `revalidatePath` needs for a dashboard route.
 *
 * Every dashboard page lives under the `[locale]` segment, so a bare
 * `revalidatePath("/dashboard/songs")` matches nothing at all: the real
 * URLs are `/pt-BR/dashboard/songs`, `/en/dashboard/songs`... Revalidating
 * by route pattern covers every locale (and, for `[id]` segments, every
 * id) in one call.
 *
 * `path` is relative to `/dashboard` and written as a route pattern:
 * `""` (the home page), `"/songs"`, `"/setlists/[id]"`,
 * `"/bands/[id]/gigs"`. Use the `[param]` names of the folders under
 * `app/[locale]/dashboard`.
 */
export function dashboardRoute(path: string): string {
  if (path !== "" && !path.startsWith("/")) {
    throw new Error(`revalidateDashboard: "${path}" must start with "/"`);
  }
  return `/[locale]/dashboard${path}`;
}

/**
 * Revalidates a dashboard route in every locale. `"layout"` also covers
 * every page nested below it, e.g. `revalidateDashboard("", "layout")`
 * refreshes the whole dashboard after a backup import.
 */
export function revalidateDashboard(
  path: string,
  type: RevalidateType = "page",
): void {
  revalidatePath(dashboardRoute(path), type);
}
