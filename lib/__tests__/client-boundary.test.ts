import { existsSync, readdirSync, readFileSync, statSync } from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";

/**
 * A Server Component that imports a plain function (or constant) from a
 * "use client" module gets a client reference, not the value: it compiles,
 * type-checks and only throws when the page renders ("Attempted to call
 * X() from the server but X is on the client"). Components (PascalCase)
 * are fine to import — they are rendered, not called.
 */

const ROOT = path.resolve(__dirname, "../..");
const SCANNED = ["app", "components", "hooks", "lib"];
const USE_CLIENT =
  /^\s*(?:\/\/[^\n]*\n\s*|\/\*[\s\S]*?\*\/\s*)*["']use client["']/;
const NAMED_IMPORT =
  /import\s+(type\s+)?\{([^}]*)\}\s+from\s+["']([^"']+)["']/g;

function sourceFiles(dir: string): string[] {
  return readdirSync(dir).flatMap((name) => {
    const full = path.join(dir, name);
    if (statSync(full).isDirectory()) {
      return name === "node_modules" || name === "__tests__"
        ? []
        : sourceFiles(full);
    }
    return /\.tsx?$/.test(name) ? [full] : [];
  });
}

function resolveImport(from: string, spec: string): string | null {
  let base: string;
  if (spec.startsWith("@/")) base = path.join(ROOT, spec.slice(2));
  else if (spec.startsWith(".")) base = path.resolve(path.dirname(from), spec);
  else return null;
  for (const ext of [".ts", ".tsx", "/index.ts", "/index.tsx"]) {
    if (existsSync(base + ext)) return base + ext;
  }
  return null;
}

const isClientModule = (file: string) =>
  USE_CLIENT.test(readFileSync(file, "utf8"));

describe("server/client module boundary", () => {
  it("server modules import only components from client modules", () => {
    const offenders: string[] = [];
    for (const file of SCANNED.flatMap((dir) =>
      sourceFiles(path.join(ROOT, dir)),
    )) {
      if (isClientModule(file)) continue;
      const source = readFileSync(file, "utf8");
      for (const [, typeOnly, names, spec] of source.matchAll(NAMED_IMPORT)) {
        if (typeOnly) continue;
        const target = resolveImport(file, spec);
        if (!target || !isClientModule(target)) continue;
        for (const raw of names.split(",")) {
          const name = raw.trim().split(/\s+as\s+/)[0];
          if (!name || name.startsWith("type ")) continue;
          if (/^[A-Z][a-z]/.test(name)) continue; // a component
          offenders.push(`${path.relative(ROOT, file)}: ${name} from ${spec}`);
        }
      }
    }
    expect(offenders).toEqual([]);
  });
});
