/**
 * Shared helpers for the server-rendered staff listings
 * (`/dashboard/admin/*`), which page and filter on the API side.
 */

export type ListSearchParams = Promise<
  Record<string, string | string[] | undefined>
>;

export const ADMIN_PAGE_SIZE = 25;

function first(value: string | string[] | undefined): string | undefined {
  return Array.isArray(value) ? value[0] : value;
}

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/**
 * Builds the API query string from the page's search params, keeping only
 * the known filters (and only well-formed ones), so a hand-edited URL can
 * never smuggle anything else upstream.
 */
export function adminListQuery(
  raw: Record<string, string | string[] | undefined>,
  allowed: readonly string[] = ["q"],
): { query: string; page: number } {
  const params = new URLSearchParams();
  const page = Math.max(1, Number.parseInt(first(raw.page) ?? "1", 10) || 1);
  params.set("page", String(page));
  params.set("per_page", String(ADMIN_PAGE_SIZE));

  for (const key of allowed) {
    const value = first(raw[key])?.trim();
    if (!value) continue;
    if ((key.endsWith("_id") || key === "user_id") && !UUID.test(value))
      continue;
    if (key === "shared" && value !== "true" && value !== "false") continue;
    params.set(key, value.slice(0, 100));
  }
  return { query: params.toString(), page };
}
