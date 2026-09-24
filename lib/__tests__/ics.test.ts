import { describe, expect, it } from "vitest";
import { escapeIcsText, foldIcsLine, gigToIcs } from "@/lib/ics";

const gig = {
  id: "3f2a",
  venue: "Bar do Zé; Palco 2",
  location: "Rua A, 10, São Paulo",
  scheduled_at: "2026-10-03T21:00:00",
  status: "confirmed" as const,
  notes: "Passagem de som às 19h\nLevar cabos",
};

describe("gigToIcs", () => {
  it("writes a floating start and a default two-hour end", () => {
    const ics = gigToIcs(gig, { now: new Date("2026-09-01T12:00:00Z") })!;
    expect(ics).toContain("DTSTART:20261003T210000\r\n");
    expect(ics).toContain("DTEND:20261003T230000\r\n");
    expect(ics).toContain("DTSTAMP:20260901T120000Z\r\n");
    expect(ics).toContain("UID:gig-3f2a@setlyst");
    expect(ics.endsWith("END:VCALENDAR\r\n")).toBe(true);
  });

  it("rolls the end over midnight", () => {
    const ics = gigToIcs(
      { ...gig, scheduled_at: "2026-12-31T23:30:00" },
      { durationMinutes: 90 },
    )!;
    expect(ics).toContain("DTEND:20270101T010000");
  });

  it("escapes text and marks cancelled gigs", () => {
    const ics = gigToIcs({ ...gig, status: "cancelled" })!;
    expect(ics).toContain("SUMMARY:Bar do Zé\; Palco 2");
    expect(ics).toContain("LOCATION:Rua A\\, 10\\, São Paulo");
    expect(ics).toContain("STATUS:CANCELLED");
  });

  it("returns null for an unreadable date", () => {
    expect(gigToIcs({ ...gig, scheduled_at: "soon" })).toBeNull();
  });
});

describe("ICS helpers", () => {
  it("escapes backslashes, separators and newlines", () => {
    expect(escapeIcsText("a\\b;c,d\ne")).toBe("a\\\\b\;c\\,d\\ne");
  });

  it("folds long lines at 75 octets without splitting characters", () => {
    const folded = foldIcsLine("DESCRIPTION:" + "ç".repeat(60));
    const lines = folded.split("\r\n");
    expect(lines.length).toBeGreaterThan(1);
    for (const line of lines) {
      expect(new TextEncoder().encode(line).length).toBeLessThanOrEqual(75);
    }
    expect(lines.slice(1).every((line) => line.startsWith(" "))).toBe(true);
  });
});
