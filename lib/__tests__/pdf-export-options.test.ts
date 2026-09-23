import { describe, expect, it } from "vitest";
import {
  DEFAULT_PDF_OPTIONS,
  MAX_SUBTITLE_LENGTH,
  normalizePdfOptions,
  pdfOptionsToQuery,
} from "@/lib/pdf-export-options";

describe("normalizePdfOptions", () => {
  it("fills everything from the defaults", () => {
    expect(normalizePdfOptions(null)).toEqual(DEFAULT_PDF_OPTIONS);
    expect(normalizePdfOptions("garbage")).toEqual(DEFAULT_PDF_OPTIONS);
  });

  it("keeps valid values and drops invalid ones", () => {
    const options = normalizePdfOptions({
      compact: true,
      chords: "inline",
      paper: "tabloid",
      columns: 3,
      font_scale: 999,
      show_key: "yes",
    });
    expect(options.compact).toBe(true);
    expect(options.chords).toBe("inline");
    expect(options.paper).toBe(DEFAULT_PDF_OPTIONS.paper);
    expect(options.columns).toBe(1);
    expect(options.font_scale).toBe(200);
    expect(options.show_key).toBe(DEFAULT_PDF_OPTIONS.show_key);
  });
});

describe("pdfOptionsToQuery", () => {
  it("serializes every option, the language and a trimmed subtitle", () => {
    const query = new URLSearchParams(
      pdfOptionsToQuery(DEFAULT_PDF_OPTIONS, {
        lang: "pt-BR",
        subtitle: `  ${"x".repeat(MAX_SUBTITLE_LENGTH + 10)}  `,
      }),
    );
    expect(query.get("lang")).toBe("pt-BR");
    expect(query.get("watermark")).toBe("true");
    expect(query.get("font_scale")).toBe("100");
    expect(query.get("subtitle")).toHaveLength(MAX_SUBTITLE_LENGTH);
  });

  it("omits a blank subtitle", () => {
    const query = new URLSearchParams(
      pdfOptionsToQuery(DEFAULT_PDF_OPTIONS, { lang: "en", subtitle: "   " }),
    );
    expect(query.has("subtitle")).toBe(false);
  });
});
