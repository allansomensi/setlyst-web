import { describe, expect, it } from "vitest";
import fs from "node:fs";
import path from "node:path";
import en from "@/messages/en.json";
import {
  CLIENT_NAMESPACES,
  pickMessages,
  type ClientMessagesArea,
} from "@/i18n/client-messages";

const ROOT = path.resolve(__dirname, "../..");
const EXTENSIONS = ["", ".ts", ".tsx", "/index.ts", "/index.tsx"];

function resolveImport(from: string, spec: string): string | null {
  let base: string;
  if (spec.startsWith("@/")) base = path.join(ROOT, spec.slice(2));
  else if (spec.startsWith(".")) base = path.resolve(path.dirname(from), spec);
  else return null;
  for (const ext of EXTENSIONS) {
    const candidate = base + ext;
    if (fs.existsSync(candidate) && fs.statSync(candidate).isFile()) {
      return /\.tsx?$/.test(candidate) ? candidate : null;
    }
  }
  return null;
}

function sourceFiles(dir: string, skip: string[] = []): string[] {
  const full = path.join(ROOT, dir);
  if (fs.statSync(full).isFile()) return [full];
  return fs
    .readdirSync(full, { recursive: true, encoding: "utf8" })
    .map((file) => path.join(full, file))
    .filter((file) => /\.tsx?$/.test(file))
    .filter((file) => !skip.some((s) => file.startsWith(path.join(ROOT, s))));
}

/** Every namespace `useTranslations` reads in `entries` and what they import. */
function namespacesReachedFrom(entries: string[]): Set<string> {
  const seen = new Set<string>();
  const namespaces = new Set<string>();
  const visit = (file: string) => {
    if (seen.has(file)) return;
    seen.add(file);
    const source = fs.readFileSync(file, "utf8");
    for (const m of source.matchAll(/useTranslations\(\s*"([^"]+)"/g)) {
      namespaces.add(m[1]);
    }
    // ShareDialog takes its namespace as a prop.
    for (const m of source.matchAll(/namespace="([^"]+)"/g)) {
      namespaces.add(m[1]);
    }
    const imports =
      /(?:import|export)[^'"]*?from\s*["']([^"']+)["']|import\(\s*["']([^"']+)["']\)/g;
    for (const m of source.matchAll(imports)) {
      const resolved = resolveImport(file, m[1] ?? m[2]);
      if (resolved) visit(resolved);
    }
  };
  entries.forEach(visit);
  return namespaces;
}

const AREAS: Record<ClientMessagesArea, string[]> = {
  shell: [
    "app/[locale]/layout.tsx",
    "app/[locale]/error.tsx",
    "app/[locale]/not-found.tsx",
    "app/[locale]/[...rest]",
    "app/[locale]/(site)",
    "app/[locale]/login",
    "app/[locale]/register",
    "app/[locale]/forgot-password",
    "app/[locale]/change-password",
  ].flatMap((dir) => sourceFiles(dir)),
  dashboard: sourceFiles("app/[locale]/dashboard", [
    "app/[locale]/dashboard/admin",
    "app/[locale]/dashboard/users",
  ]),
  staff: [
    ...sourceFiles("app/[locale]/dashboard/admin"),
    ...sourceFiles("app/[locale]/dashboard/users"),
  ],
  live: sourceFiles("app/[locale]/(live)"),
  publicShare: [
    ...sourceFiles("app/s/[token]/page.tsx"),
    ...sourceFiles("app/s/[token]/_components"),
    ...sourceFiles("app/g/[token]/page.tsx"),
    ...sourceFiles("app/g/[token]/_components"),
  ],
};

function covered(namespace: string, declared: readonly string[]): boolean {
  return declared.some(
    (entry) => namespace === entry || namespace.startsWith(`${entry}.`),
  );
}

describe("client messages", () => {
  for (const area of Object.keys(AREAS) as ClientMessagesArea[]) {
    it(`sends every namespace the ${area} area reads`, () => {
      const missing = [...namespacesReachedFrom(AREAS[area])].filter(
        (ns) => !covered(ns, CLIENT_NAMESPACES[area]),
      );
      expect(missing, `add to CLIENT_NAMESPACES.${area}`).toEqual([]);
    });
  }

  it("only names namespaces that exist", () => {
    for (const namespaces of Object.values(CLIENT_NAMESPACES)) {
      const picked = pickMessages(en, namespaces);
      for (const ns of namespaces) {
        const value = ns
          .split(".")
          .reduce<unknown>(
            (node, key) => (node as Record<string, unknown>)?.[key],
            picked,
          );
        expect(value, ns).toBeDefined();
      }
    }
  });

  it("picks nested paths without the rest of the namespace", () => {
    const picked = pickMessages({ a: { b: { c: "x" }, d: "y" }, e: "z" }, [
      "a.b",
    ]);
    expect(picked).toEqual({ a: { b: { c: "x" } } });
  });
});
