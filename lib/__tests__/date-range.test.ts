import { describe, expect, it } from "vitest";
import {
  dayRangeToUtc,
  dayStartUtc,
  nextDay,
  parseDay,
} from "@/lib/date-range";

describe("date ranges", () => {
  it("accepts only real days", () => {
    expect(parseDay("2026-09-30")).toBe("2026-09-30");
    expect(parseDay(" 2026-02-28 ")).toBe("2026-02-28");
    expect(parseDay("2026-02-30")).toBeNull();
    expect(parseDay("2026-9-1")).toBeNull();
    expect(parseDay("yesterday")).toBeNull();
    expect(parseDay(undefined)).toBeNull();
  });

  it("finds where a day starts in a time zone, in UTC", () => {
    expect(dayStartUtc("2026-09-30", "America/Sao_Paulo")).toBe(
      "2026-09-30T03:00:00",
    );
    expect(dayStartUtc("2026-09-30", "UTC")).toBe("2026-09-30T00:00:00");
    expect(dayStartUtc("2026-09-30", "Asia/Tokyo")).toBe("2026-09-29T15:00:00");
    // Across a daylight-saving change (New York springs forward on 8 March).
    expect(dayStartUtc("2026-03-08", "America/New_York")).toBe(
      "2026-03-08T05:00:00",
    );
    expect(dayStartUtc("2026-03-09", "America/New_York")).toBe(
      "2026-03-09T04:00:00",
    );
  });

  it("turns a day range into API bounds, the last day included", () => {
    expect(nextDay("2026-12-31")).toBe("2027-01-01");
    expect(
      dayRangeToUtc("2026-09-01", "2026-09-30", "America/Sao_Paulo"),
    ).toEqual({ from: "2026-09-01T03:00:00", to: "2026-10-01T03:00:00" });
    // Swapped ends, an open end, garbage.
    expect(dayRangeToUtc("2026-09-30", "2026-09-01", "UTC")).toEqual({
      from: "2026-09-01T00:00:00",
      to: "2026-10-01T00:00:00",
    });
    expect(dayRangeToUtc("2026-09-01", null, "UTC")).toEqual({
      from: "2026-09-01T00:00:00",
      to: null,
    });
    expect(dayRangeToUtc("nope", "", "UTC")).toEqual({ from: null, to: null });
  });
});
