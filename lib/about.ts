/**
 * Static facts shown on the About page (app/[locale]/dashboard/about).
 * Kept here, not in the page, so updating a link or adding a social
 * profile is a one-line change. Translatable prose lives in messages/*.json
 * under `about`.
 */

export const GITHUB_OWNER = "allansomensi";

export const REPOSITORIES = [
  { name: "setlyst-web", kind: "web" },
  { name: "setlyst-api", kind: "api" },
] as const;

export type RepositoryKind = (typeof REPOSITORIES)[number]["kind"];

export const repoUrl = (name: string) =>
  `https://github.com/${GITHUB_OWNER}/${name}`;

export const AUTHOR = {
  name: "Allan Somensi",
  initials: "AS",
} as const;

/**
 * The author's public profiles, in display order. `kind` picks the icon;
 * add Instagram, YouTube, LinkedIn… here as `{ kind: "instagram", … }`.
 */
export const AUTHOR_LINKS: ReadonlyArray<{
  kind: "github" | "website" | "instagram" | "youtube" | "linkedin";
  label: string;
  href: string;
}> = [
  {
    kind: "website",
    label: "allansomensi.com.br",
    href: "https://allansomensi.com.br",
  },
  {
    kind: "github",
    label: `github.com/${GITHUB_OWNER}`,
    href: `https://github.com/${GITHUB_OWNER}`,
  },
];

export const TECH_STACK = {
  web: ["Next.js", "React", "TypeScript", "Tailwind CSS", "next-intl"],
  api: ["Rust", "Axum", "PostgreSQL", "SQLx"],
} as const;
