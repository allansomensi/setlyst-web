/**
 * Shared bits of the avatar components (components/user-avatar.tsx,
 * components/bands/band-avatar.tsx).
 */

/** Up to two initials: "Ana Lúcia Souza" → "AS", "setlyst" → "SE". */
export function getInitials(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return "?";
  if (parts.length === 1)
    return Array.from(parts[0]).slice(0, 2).join("").toUpperCase();
  const first = Array.from(parts[0])[0] ?? "";
  const last = Array.from(parts[parts.length - 1])[0] ?? "";
  return (first + last).toUpperCase();
}

/** A stable 32-bit hash (FNV-1a) of a string. */
export function hashString(value: string): number {
  let hash = 0x811c9dc5;
  for (let i = 0; i < value.length; i++) {
    hash ^= value.charCodeAt(i);
    hash = Math.imul(hash, 0x01000193);
  }
  return hash >>> 0;
}

/** Hue (0–359) for an entity's fallback avatar: same id, same color. */
export function avatarHue(id: string): number {
  return hashString(id) % 360;
}

/**
 * The same-origin proxy URL for an image. The version parameter changes
 * when the source URL does, so a new avatar isn't hidden by the browser
 * cache (the proxy answers with `max-age=3600`); it's a hash, so the
 * source URL itself never appears in our URLs or logs.
 */
export function proxiedImageSrc(route: string, sourceUrl: string): string {
  return `${route}?v=${hashString(sourceUrl).toString(36)}`;
}
