import { describe, expect, it, vi } from "vitest";
import {
  LEGAL_VERSION,
  controllerProblems,
  formatTaxId,
  isValidCnpj,
  isValidCpf,
  isValidTaxId,
  resolveController,
} from "@/lib/legal";
import {
  LEGAL_UPDATED,
  LEGAL_VERSIONS,
  getArchivedLegalText,
  getLegalText,
  type LegalBlock,
} from "@/lib/legal-content";
import { LEGAL_DOCUMENTS } from "@/lib/links";

const LOCALES = ["pt-BR", "en", "es"] as const;

/** The shape of a block: clause, lettered list (with its length) or note. */
function shape(block: LegalBlock): string {
  if (typeof block === "string") return "clause";
  if ("list" in block) return `list:${block.list.length}`;
  return "note";
}

/** Every number in a text, ignoring thousands separators and ordinals. */
function numbers(block: LegalBlock): string[] {
  const text =
    typeof block === "string"
      ? block
      : "list" in block
        ? block.list.join(" | ")
        : block.note;
  return (text.match(/\d+/g) ?? []).sort();
}

describe("legal texts: structure parity across languages", () => {
  it("has the same sections, blocks, lists and numbers in every language", () => {
    for (const doc of LEGAL_DOCUMENTS) {
      const reference = getLegalText(doc, "pt-BR");
      for (const locale of LOCALES) {
        const text = getLegalText(doc, locale);
        expect(
          text.sections.map((s) => s.id),
          `${doc}/${locale}`,
        ).toEqual(reference.sections.map((s) => s.id));
        text.sections.forEach((section, index) => {
          const ref = reference.sections[index];
          const where = `${doc}/${locale}#${section.id}`;
          expect(section.blocks.map(shape), where).toEqual(
            ref.blocks.map(shape),
          );
          section.blocks.forEach((block, b) => {
            expect(numbers(block), `${where} block ${b + 1}`).toEqual(
              numbers(ref.blocks[b]),
            );
          });
        });
      }
    }
  });

  it("leaves no unfilled markers besides the controller placeholders", () => {
    for (const doc of LEGAL_DOCUMENTS) {
      for (const locale of LOCALES) {
        const json = JSON.stringify(getLegalText(doc, locale));
        expect(json, `${doc}/${locale}`).not.toMatch(/TODO|FIXME|\{\{|\{N\}/);
        const brackets = json.match(/\[[A-ZÀ-Ú ]+\]/g) ?? [];
        for (const placeholder of brackets) {
          expect([
            "[NOME COMPLETO]",
            "[RAZÃO SOCIAL]",
            "[CPF]",
            "[CNPJ]",
            "[ENDEREÇO]",
          ]).toContain(placeholder);
        }
      }
    }
  });

  it("no longer names an encarregado nor the MCI art. 15 obligation", () => {
    const privacy = JSON.stringify(getLegalText("privacy", "pt-BR"));
    expect(privacy).not.toContain("nosso Encarregado");
    expect(privacy).not.toContain("obrigação legal (art. 7º, II, e art. 15");
    expect(privacy).toContain("pequeno porte");
  });

  it("describes public links without lyrics or chords", () => {
    for (const locale of LOCALES) {
      const terms = getLegalText("terms", locale);
      const links = terms.sections.find((s) => s.id === "public-links");
      expect(JSON.stringify(links)).not.toMatch(
        /inclusive letras e cifras|including lyrics and chords|incluidas letras y acordes/,
      );
    }
  });

  it("keeps the copyright notice checklist the contact page reuses", () => {
    for (const locale of LOCALES) {
      const notice = getLegalText("copyright", locale).sections.find(
        (s) => s.id === "notice",
      );
      expect(
        notice?.blocks.some((b) => typeof b === "object" && "list" in b),
      ).toBe(true);
    }
  });
});

describe("legal versions", () => {
  it("gives every document a dated history, newest first", () => {
    for (const doc of LEGAL_DOCUMENTS) {
      const versions = LEGAL_VERSIONS[doc];
      expect(versions.length, doc).toBeGreaterThan(0);
      const dates = versions.map((v) => v.version);
      expect([...dates].sort().reverse()).toEqual(dates);
      for (const entry of versions) {
        expect(entry.version).toMatch(/^\d{4}-\d{2}-\d{2}$/);
        for (const locale of LOCALES) {
          expect(entry.summary[locale], `${doc} ${entry.version}`).toBeTruthy();
        }
      }
      // The version in force is read from the live text, never an archive.
      expect(versions[0].archived).toBeUndefined();
      versions.slice(1).forEach((entry) => {
        expect(entry.archived, `${doc} ${entry.version}`).toBeTypeOf(
          "function",
        );
      });
      expect(LEGAL_UPDATED[doc]).toBe(versions[0].version);
    }
  });

  it("keeps the acceptance version in step with the Terms and the Privacy Policy", () => {
    const latest = [LEGAL_UPDATED.terms, LEGAL_UPDATED.privacy].sort().at(-1);
    expect(LEGAL_VERSION).toBe(latest);
  });

  it("has no archive for the version in force or an unknown one", async () => {
    await expect(
      getArchivedLegalText("terms", LEGAL_UPDATED.terms, "pt-BR"),
    ).resolves.toBeNull();
    await expect(
      getArchivedLegalText("terms", "1999-01-01", "pt-BR"),
    ).resolves.toBeNull();
  });
});

describe("controller identification", () => {
  it("validates CPF check digits", () => {
    expect(isValidCpf("123.456.789-09")).toBe(true);
    expect(isValidCpf("12345678900")).toBe(false);
    expect(isValidCpf("111.111.111-11")).toBe(false);
    expect(isValidCpf("1234567890")).toBe(false);
  });

  it("validates numeric and alphanumeric CNPJ check digits", () => {
    expect(isValidCnpj("11.222.333/0001-81")).toBe(true);
    expect(isValidCnpj("11.222.333/0001-80")).toBe(false);
    expect(isValidCnpj("00000000000000")).toBe(false);
    // Example from the Receita Federal (IN RFB nº 2.229/2024).
    expect(isValidCnpj("12.ABC.345/01DE-35")).toBe(true);
    expect(isValidCnpj("12.ABC.345/01DE-36")).toBe(false);
    expect(formatTaxId("12abc34501de35")).toBe("12.ABC.345/01DE-35");
    expect(resolveController({ taxId: "12ABC34501DE35" }).kind).toBe("company");
  });

  it("dispatches on length", () => {
    expect(isValidTaxId("123.456.789-09")).toBe(true);
    expect(isValidTaxId("11222333000181")).toBe(true);
    expect(isValidTaxId("123")).toBe(false);
  });

  it("lists what blocks a production build", () => {
    expect(controllerProblems({})).toHaveLength(3);
    expect(
      controllerProblems({
        name: "Ana Souza",
        taxId: "123.456.789-00",
        address: "Rua A, 1, Caxias do Sul/RS",
      }),
    ).toEqual([
      "NEXT_PUBLIC_CONTROLLER_TAX_ID is not a CPF or CNPJ with valid check digits",
    ]);
    expect(
      controllerProblems({
        name: "Ana Souza",
        taxId: "123.456.789-09",
        address: "Rua A, 1, Caxias do Sul/RS",
      }),
    ).toEqual([]);
    expect(
      controllerProblems({
        name: "[NOME COMPLETO]",
        taxId: "[CPF]",
        address: "[ENDEREÇO]",
      }),
    ).toHaveLength(3);
  });
});

describe("production build guard", () => {
  const KEYS = [
    "NEXT_PHASE",
    "ALLOW_PLACEHOLDER_CONTROLLER",
    "NEXT_PUBLIC_CONTROLLER_NAME",
    "NEXT_PUBLIC_CONTROLLER_TAX_ID",
    "NEXT_PUBLIC_CONTROLLER_ADDRESS",
  ] as const;

  async function loadWith(env: Partial<Record<(typeof KEYS)[number], string>>) {
    const saved = Object.fromEntries(
      KEYS.map((key) => [key, process.env[key]]),
    );
    for (const key of KEYS) delete process.env[key];
    Object.assign(process.env, env);
    vi.resetModules();
    try {
      return await import("@/lib/legal");
    } finally {
      for (const key of KEYS) {
        if (saved[key] === undefined) delete process.env[key];
        else process.env[key] = saved[key];
      }
      vi.resetModules();
    }
  }

  it("refuses placeholders when building for production", async () => {
    await expect(
      loadWith({ NEXT_PHASE: "phase-production-build" }),
    ).rejects.toThrow(/NEXT_PUBLIC_CONTROLLER_NAME/);
    await expect(
      loadWith({
        NEXT_PHASE: "phase-production-build",
        NEXT_PUBLIC_CONTROLLER_NAME: "Ana Souza",
        NEXT_PUBLIC_CONTROLLER_TAX_ID: "123.456.789-00",
        NEXT_PUBLIC_CONTROLLER_ADDRESS: "Rua A, 1, Caxias do Sul/RS",
      }),
    ).rejects.toThrow(/check digits/);
  });

  it("builds with real values, in development or with the CI opt-out", async () => {
    const legal = await loadWith({
      NEXT_PHASE: "phase-production-build",
      NEXT_PUBLIC_CONTROLLER_NAME: "Ana Souza",
      NEXT_PUBLIC_CONTROLLER_TAX_ID: "12345678909",
      NEXT_PUBLIC_CONTROLLER_ADDRESS: "Rua A, 1, Caxias do Sul/RS",
    });
    expect(legal.CONTROLLER.taxId).toBe("123.456.789-09");
    await expect(loadWith({})).resolves.toBeTruthy();
    await expect(
      loadWith({
        NEXT_PHASE: "phase-production-build",
        ALLOW_PLACEHOLDER_CONTROLLER: "true",
      }),
    ).resolves.toBeTruthy();
  });
});
