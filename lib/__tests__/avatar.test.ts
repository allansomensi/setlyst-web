import { describe, expect, it } from "vitest";
import { avatarHue, getInitials, proxiedImageSrc } from "@/lib/avatar";

describe("getInitials", () => {
  it("uses the first and last word", () => {
    expect(getInitials("Ana Lúcia Souza")).toBe("AS");
    expect(getInitials("  joão   silva ")).toBe("JS");
  });

  it("uses two letters of a single word", () => {
    expect(getInitials("setlyst")).toBe("SE");
    expect(getInitials("Ω")).toBe("Ω");
  });

  it("falls back to a question mark", () => {
    expect(getInitials("   ")).toBe("?");
  });
});

describe("avatarHue", () => {
  it("is stable and within range", () => {
    const id = "6f1c2c1e-6d1b-4b8e-9a53-0c1f3f9a1b2c";
    expect(avatarHue(id)).toBe(avatarHue(id));
    expect(avatarHue(id)).toBeGreaterThanOrEqual(0);
    expect(avatarHue(id)).toBeLessThan(360);
  });
});

describe("proxiedImageSrc", () => {
  it("changes with the source URL and never contains it", () => {
    const a = proxiedImageSrc("/api/images/avatar/x", "https://cdn.test/a.png");
    const b = proxiedImageSrc("/api/images/avatar/x", "https://cdn.test/b.png");
    expect(a).not.toBe(b);
    expect(a).not.toContain("cdn.test");
    expect(a.startsWith("/api/images/avatar/x?v=")).toBe(true);
  });
});
