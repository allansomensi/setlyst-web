import { describe, expect, it } from "vitest";
import {
  describeApiError,
  isNoChangeError,
  weakPasswordIssues,
} from "@/lib/api-errors";

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

describe("describeApiError (v0.12 codes)", () => {
  it("translates every generic code instead of returning null", () => {
    for (const code of [
      "VALIDATION_ERROR",
      "BAD_REQUEST",
      "UNPROCESSABLE_ENTITY",
      "NOT_DISMISSIBLE",
      "ANNOUNCEMENT_LOCKED",
      "FLAG_ALREADY_RESOLVED",
      "EMAIL_TAKEN",
      "PROMO_CODE_EXPIRED",
      "REPERTOIRE_PROTECTED",
      "CHORDPRO_TOO_LARGE",
    ]) {
      expect(describeApiError(code, null, t, "en")).toBe(code);
    }
  });

  it("says how long to wait, in seconds or minutes", () => {
    expect(
      describeApiError(
        "TOO_MANY_ATTEMPTS",
        { retry_after_seconds: 42 },
        t,
        "en",
      ),
    ).toBe('TOO_MANY_ATTEMPTS wait.seconds({"seconds":42})');
    expect(
      describeApiError("SERVICE_BUSY", { retry_after_seconds: 125 }, t, "en"),
    ).toBe('SERVICE_BUSY wait.minutes({"minutes":3})');
    expect(describeApiError("TOO_MANY_ATTEMPTS", {}, t, "en")).toBe(
      "TOO_MANY_ATTEMPTS",
    );
  });

  it("shows when a locked account opens again", () => {
    expect(
      describeApiError(
        "ACCOUNT_LOCKED",
        { until: "2026-10-01T12:00:00" },
        t,
        "en",
      ),
    ).toContain("ACCOUNT_LOCKED_UNTIL");
    expect(describeApiError("ACCOUNT_LOCKED", null, t, "en")).toBe(
      "ACCOUNT_LOCKED",
    );
  });

  it("counts the attempts left for a code", () => {
    expect(
      describeApiError("INVALID_CODE", { attempts_left: 2 }, t, "en"),
    ).toBe('INVALID_CODE_ATTEMPTS({"count":2})');
    expect(describeApiError("INVALID_CODE", null, t, "en")).toBe(
      "INVALID_CODE",
    );
  });

  it("names the missing feature and the plan that has it", () => {
    const message = describeApiError(
      "FEATURE_NOT_IN_PLAN",
      { feature: "tours", plan: "pro" },
      t,
      "en",
    );
    expect(message).toContain("features.tours");
    expect(message).toContain("plans.pro");
    expect(
      describeApiError(
        "FEATURE_NOT_IN_PLAN",
        { feature: "hacking", plan: "gold" },
        t,
        "en",
      ),
    ).toBe('FEATURE_NOT_IN_PLAN availableFrom({"plan":"gold"})');
  });

  it("explains ChordPro rejections with reason and line", () => {
    expect(
      describeApiError(
        "CHORDPRO_INVALID",
        { reason: "line_too_long", line: 12 },
        t,
        "en",
      ),
    ).toBe(
      'CHORDPRO_INVALID chordproReasons.line_too_long atLine({"line":12})',
    );
    expect(
      describeApiError("CHORDPRO_INVALID", { reason: "<script>" }, t, "en"),
    ).toBe("CHORDPRO_INVALID");
  });

  it("names the conflicting item type on restore", () => {
    expect(
      describeApiError("RESTORE_CONFLICT", { type: "setlist" }, t, "en"),
    ).toBe('RESTORE_CONFLICT_TYPED({"type":"trashTypes.setlist"})');
  });

  it("knows the new quota resources", () => {
    for (const resource of ["tours", "band_tours", "band_notes", "pins"]) {
      expect(
        describeApiError("QUOTA_EXCEEDED", { resource, limit: 12 }, t, "en"),
      ).toContain(`resources.${resource}`);
    }
  });
});

describe("isNoChangeError", () => {
  it("recognizes a nothing-to-save failure only", () => {
    expect(
      isNoChangeError({
        success: false,
        error: "x",
        apiCode: "UNPROCESSABLE_ENTITY",
      }),
    ).toBe(true);
    expect(
      isNoChangeError({ success: false, error: "x", apiCode: "NOT_FOUND" }),
    ).toBe(false);
    expect(isNoChangeError({ success: true })).toBe(false);
    expect(isNoChangeError(null)).toBe(false);
  });
});
