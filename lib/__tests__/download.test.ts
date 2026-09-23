import { describe, expect, it } from "vitest";
import {
  dataUrlToBlob,
  parseContentDisposition,
  sanitizeFilename,
} from "@/lib/download";

describe("parseContentDisposition", () => {
  it("returns null without a header or a file name", () => {
    expect(parseContentDisposition(null)).toBeNull();
    expect(parseContentDisposition("")).toBeNull();
    expect(parseContentDisposition("attachment")).toBeNull();
  });

  it("reads a quoted file name", () => {
    expect(parseContentDisposition('attachment; filename="setlist.pdf"')).toBe(
      "setlist.pdf",
    );
  });

  it("reads an unquoted file name", () => {
    expect(parseContentDisposition("attachment; filename=songs.cho")).toBe(
      "songs.cho",
    );
  });

  it("prefers the RFC 5987 form and decodes it", () => {
    const header =
      "attachment; filename=\"Cancao.pdf\"; filename*=UTF-8''Can%C3%A7%C3%A3o%20ao%20vivo.pdf";
    expect(parseContentDisposition(header)).toBe("Canção ao vivo.pdf");
  });

  it("handles filename* before filename and a language tag", () => {
    const header =
      "attachment; filename*=utf-8'pt-BR'Repert%C3%B3rio.cho; filename=\"Repertorio.cho\"";
    expect(parseContentDisposition(header)).toBe("Repertório.cho");
  });

  it("falls back to the plain name when filename* is malformed", () => {
    const header =
      "attachment; filename*=UTF-8''%E0%A4%A; filename=\"fallback.pdf\"";
    expect(parseContentDisposition(header)).toBe("fallback.pdf");
  });

  it("does not split on semicolons inside quotes", () => {
    expect(
      parseContentDisposition('attachment; filename="a;b.pdf"; size=10'),
    ).toBe("a;b.pdf");
  });

  it("strips path separators and control characters", () => {
    expect(
      parseContentDisposition('attachment; filename="../../etc/passwd"'),
    ).toBe("_.._etc_passwd");
    expect(
      parseContentDisposition("attachment; filename*=UTF-8''a%0Ab%2Fc.pdf"),
    ).toBe("ab_c.pdf");
  });
});

describe("sanitizeFilename", () => {
  it("keeps accents and spaces", () => {
    expect(sanitizeFilename("Ensaio de sábado.pdf")).toBe(
      "Ensaio de sábado.pdf",
    );
  });

  it("removes leading dots and reserved characters", () => {
    expect(sanitizeFilename("..hidden")).toBe("hidden");
    expect(sanitizeFilename('a<b>:c"d|e?f*g')).toBe("a_b__c_d_e_f_g");
  });

  it("caps the length", () => {
    expect(sanitizeFilename("x".repeat(500))).toHaveLength(200);
  });
});

describe("dataUrlToBlob", () => {
  it("decodes base64 and plain data URLs", async () => {
    const png = dataUrlToBlob("data:image/png;base64,iVBORw0K");
    expect(png.type).toBe("image/png");
    expect(Array.from(new Uint8Array(await png.arrayBuffer()))).toEqual([
      0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a,
    ]);
    const text = dataUrlToBlob("data:text/plain,a%20b");
    expect(await text.text()).toBe("a b");
    expect(() => dataUrlToBlob("https://example.com")).toThrow();
  });
});
