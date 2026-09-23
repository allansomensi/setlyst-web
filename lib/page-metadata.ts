import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";
import { fetchServerApi } from "@/lib/api-server";

/**
 * Browser-tab titles. Every page names where the person is; the root
 * layout appends "· Setlyst". Entity pages show the entity's own name
 * (a setlist title, a band name), fetched with the same request the page
 * makes — Next.js memoizes identical GETs within one render.
 */

/** A static title from the `metadata` namespace. */
export async function staticTitle(key: string): Promise<Metadata> {
  const t = await getTranslations("metadata");
  return { title: t(key) };
}

/**
 * `template` (a `metadata.*` key with a `{name}` placeholder) filled with
 * a field of the entity at `endpoint`; falls back to `fallbackKey` when
 * the entity can't be loaded (the page itself then shows the error).
 */
export async function entityTitle<T>(
  endpoint: string,
  pick: (entity: T) => string | null | undefined,
  template: string,
  fallbackKey: string,
): Promise<Metadata> {
  const t = await getTranslations("metadata");
  try {
    const name = pick(await fetchServerApi<T>(endpoint));
    return { title: name ? t(template, { name }) : t(fallbackKey) };
  } catch {
    return { title: t(fallbackKey) };
  }
}
