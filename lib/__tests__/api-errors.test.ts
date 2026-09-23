import { describe, expect, it } from "vitest";
import { describeApiError, weakPasswordIssues } from "@/lib/api-errors";

/** Echoes the key and its values so assertions can see what was chosen. */
const t = (key: string, values?: Record<string, string | number>) =>
  values ? `${key}(${JSON.stringify(values)})` : key;

describe("describeApiError", () => {
  it("returns null for codes without a translation", () => {
    expect(describeApiError("SOMETHING_NEW", null, t, "en")).toBeNull();
    expect(describeApiError(null, null, t, "en")).toBeNull();
  });

  it("explains a temporary suspension with its end date and reason", () => {
    const message = describeApiError(
      "ACCOUNT_BANNED",
      { until: "2026-10-01T12:00:00", reason: "spam" },
      t,
      "en",
    );
    expect(message).toContain("ACCOUNT_BANNED_UNTIL");
    expect(message).toContain("reason");
    expect(message).toContain("spam");
  });

  it("explains a permanent suspension", () => {
    expect(describeApiError("ACCOUNT_BANNED", {}, t, "en")).toBe(
      "ACCOUNT_BANNED_PERMANENT",
    );
  });

  it("names the exhausted resource and its limit", () => {
    const message = describeApiError(
      "QUOTA_EXCEEDED",
      { resource: "songs", limit: 500 },
      t,
      "en",
    );
    expect(message).toContain('"limit":500');
    expect(message).toContain("resources.songs");
  });

  it("falls back to a generic resource for unknown ones", () => {
    const message = describeApiError(
      "QUOTA_EXCEEDED",
      { resource: "nope" },
      t,
      "en",
    );
    expect(message).toContain("resources.generic");
  });

  it("lists weak-password issues", () => {
    const meta = { issues: ["too_short", "bogus", "missing_digit"] };
    expect(weakPasswordIssues(meta)).toEqual(["too_short", "missing_digit"]);
    const message = describeApiError("WEAK_PASSWORD", meta, t, "en");
    expect(message).toContain("passwordIssues.too_short");
    expect(message).toContain("passwordIssues.missing_digit");
    expect(message).not.toContain("bogus");
  });
});
