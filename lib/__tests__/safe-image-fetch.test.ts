import { describe, expect, it } from "vitest";
import {
  ImageFetchError,
  isBlockedAddress,
  mediaType,
  sniffImageType,
  validateImageUrl,
} from "@/lib/server/safe-image-fetch";

describe("isBlockedAddress", () => {
  it.each([
    "0.0.0.0",
    "10.1.2.3",
    "100.64.0.1",
    "100.127.255.254",
    "127.0.0.1",
    "127.255.255.255",
    "169.254.169.254",
    "172.16.0.1",
    "172.31.255.255",
    "192.0.0.8",
    "192.0.2.10",
    "192.168.1.1",
    "198.18.0.1",
    "198.51.100.7",
    "203.0.113.9",
    "224.0.0.1",
    "239.255.255.250",
    "240.0.0.1",
    "255.255.255.255",
  ])("blocks IPv4 %s", (address) => {
    expect(isBlockedAddress(address)).toBe(true);
  });

  it.each([
    "::",
    "::1",
    "[::1]",
    "::ffff:127.0.0.1",
    "::ffff:10.0.0.1",
    "::ffff:8.8.8.8",
    "::127.0.0.1",
    "64:ff9b::a00:1",
    "2001:db8::1",
    "2002:c0a8:101::1",
    "fc00::1",
    "fd12:3456:789a::1",
    "fe80::1",
    "fe80::1%eth0",
    "fec0::1",
    "ff02::1",
  ])("blocks IPv6 %s", (address) => {
    expect(isBlockedAddress(address)).toBe(true);
  });

  it.each([
    "8.8.8.8",
    "1.1.1.1",
    "172.32.0.1",
    "100.128.0.1",
    "192.169.0.1",
    "2606:4700:4700::1111",
    "2001:4860:4860::8888",
  ])("allows public %s", (address) => {
    expect(isBlockedAddress(address)).toBe(false);
  });

  it("treats anything that isn't an IP as blocked", () => {
    expect(isBlockedAddress("example.com")).toBe(true);
    expect(isBlockedAddress("")).toBe(true);
    expect(isBlockedAddress("999.1.1.1")).toBe(true);
  });
});

describe("validateImageUrl", () => {
  const reason = (url: string) => {
    try {
      validateImageUrl(url);
      return "ok";
    } catch (error) {
      return (error as ImageFetchError).reason;
    }
  };

  it("accepts a public https URL", () => {
    expect(reason("https://images.example.com/a.png")).toBe("ok");
  });

  it("refuses other schemes, credentials and ports", () => {
    expect(reason("http://example.com/a.png")).toBe("invalid_url");
    expect(reason("file:///etc/passwd")).toBe("invalid_url");
    expect(reason("https://user:pass@example.com/a.png")).toBe("invalid_url");
    expect(reason("https://example.com:8443/a.png")).toBe("invalid_url");
    expect(reason("not a url")).toBe("invalid_url");
  });

  it("refuses local hosts and private IP literals", () => {
    expect(reason("https://localhost/a.png")).toBe("blocked_address");
    expect(reason("https://printer.local/a.png")).toBe("blocked_address");
    expect(reason("https://metadata.internal/a.png")).toBe("blocked_address");
    expect(reason("https://169.254.169.254/latest")).toBe("blocked_address");
    expect(reason("https://[::1]/a.png")).toBe("blocked_address");
  });

  it("refuses SVG paths", () => {
    expect(reason("https://example.com/logo.SVG")).toBe("not_an_image");
  });
});

describe("sniffImageType", () => {
  const bytes = (...values: number[]) => new Uint8Array(values);
  const text = (value: string) => new TextEncoder().encode(value);

  it("recognizes PNG, JPEG and GIF", () => {
    expect(
      sniffImageType(bytes(0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, 0)),
    ).toBe("image/png");
    expect(sniffImageType(bytes(0xff, 0xd8, 0xff, 0xe0, 0, 0x10))).toBe(
      "image/jpeg",
    );
    expect(sniffImageType(text("GIF89a\x01\x00"))).toBe("image/gif");
    expect(sniffImageType(text("GIF87a\x01\x00"))).toBe("image/gif");
  });

  it("recognizes WebP", () => {
    expect(sniffImageType(text("RIFF\x10\x00\x00\x00WEBPVP8 "))).toBe(
      "image/webp",
    );
    expect(sniffImageType(text("RIFF\x10\x00\x00\x00WAVEfmt "))).toBeNull();
  });

  it("recognizes AVIF by major or compatible brand", () => {
    const major = new Uint8Array([
      0,
      0,
      0,
      20,
      ...text("ftypavif"),
      0,
      0,
      0,
      0,
      ...text("mif1"),
    ]);
    expect(sniffImageType(major)).toBe("image/avif");
    const compatible = new Uint8Array([
      0,
      0,
      0,
      24,
      ...text("ftypmif1"),
      0,
      0,
      0,
      0,
      ...text("mif1avif"),
    ]);
    expect(sniffImageType(compatible)).toBe("image/avif");
    const heic = new Uint8Array([
      0,
      0,
      0,
      20,
      ...text("ftypheic"),
      0,
      0,
      0,
      0,
      ...text("mif1"),
    ]);
    expect(sniffImageType(heic)).toBeNull();
  });

  it("never accepts SVG, HTML or empty bodies", () => {
    expect(
      sniffImageType(text('<svg xmlns="http://www.w3.org/2000/svg">')),
    ).toBeNull();
    expect(sniffImageType(text("<?xml version='1.0'?><svg/>"))).toBeNull();
    expect(sniffImageType(text("<!doctype html><script>"))).toBeNull();
    expect(sniffImageType(new Uint8Array())).toBeNull();
  });
});

describe("mediaType", () => {
  it("strips parameters and case", () => {
    expect(mediaType("Image/PNG; charset=binary")).toBe("image/png");
    expect(mediaType(undefined)).toBe("");
  });
});
