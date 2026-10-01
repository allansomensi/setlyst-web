import { describe, expect, it } from "vitest";
import {
  canCancelEmail,
  canRetryEmail,
  formatDomainList,
  hourlyCapUsage,
  initialIncidentStatuses,
  isIncidentActive,
  isValidIncidentText,
  isValidIncidentTitle,
  latestIncidentUpdate,
  normalizeDomain,
  parseDomainList,
  updateIncidentStatuses,
} from "@/lib/platform-admin";

describe("blocked e-mail domains", () => {
  it("normalizes like the API", () => {
    expect(normalizeDomain(" @Mailinator.com ")).toBe("mailinator.com");
    expect(normalizeDomain(".tempmail.io")).toBe("tempmail.io");
    expect(normalizeDomain("@.Mail.Example.co.uk.")).toBe("mail.example.co.uk");
    expect(normalizeDomain("xn--bcher-kva.example")).toBe(
      "xn--bcher-kva.example",
    );
  });

  it("refuses what isn't a host name", () => {
    for (const bad of [
      "localhost",
      "a..b",
      "-x.com",
      "x-.com",
      "exa mple.com",
      "",
      "@",
      "user@example.com",
      "exämple.com",
      `${"a".repeat(64)}.com`,
      `${"a.".repeat(127)}com`,
    ]) {
      expect(normalizeDomain(bad), bad).toBeNull();
    }
  });

  it("parses one domain per line, deduplicated and sorted", () => {
    expect(
      parseDomainList(
        "tempmail.io\n\n @Mailinator.com \nTEMPMAIL.IO\nnot a domain, b.org;",
      ),
    ).toEqual({
      domains: ["b.org", "mailinator.com", "tempmail.io"],
      invalid: ["not", "a", "domain"],
    });
    expect(parseDomainList("   \n")).toEqual({ domains: [], invalid: [] });
    expect(parseDomainList("localhost\nlocalhost").invalid).toEqual([
      "localhost",
    ]);
  });

  it("formats the stored list back for the textarea", () => {
    expect(formatDomainList(["a.com", "b.org"])).toBe("a.com\nb.org");
    expect(
      parseDomainList(formatDomainList(["a.com", "b.org"])).domains,
    ).toEqual(["a.com", "b.org"]);
  });
});

describe("incidents", () => {
  it("only lets maintenance be scheduled", () => {
    expect(initialIncidentStatuses("maintenance")).toEqual(["scheduled"]);
    expect(initialIncidentStatuses("incident")).not.toContain("scheduled");
    expect(initialIncidentStatuses("incident")).not.toContain("resolved");
    expect(updateIncidentStatuses("incident")).not.toContain("scheduled");
    expect(updateIncidentStatuses("incident")).toContain("resolved");
    expect(updateIncidentStatuses("maintenance")).toContain("scheduled");
  });

  it("checks lengths as the API counts them (trimmed characters)", () => {
    expect(isValidIncidentTitle("  ab  ")).toBe(false);
    expect(isValidIncidentTitle("abc")).toBe(true);
    expect(isValidIncidentTitle("é".repeat(150))).toBe(true);
    expect(isValidIncidentTitle("a".repeat(151))).toBe(false);
    expect(isValidIncidentText("   ")).toBe(false);
    expect(isValidIncidentText("x")).toBe(true);
    expect(isValidIncidentText("x".repeat(2001))).toBe(false);
  });

  it("knows what is still active and the latest update", () => {
    expect(isIncidentActive({ status: "monitoring" })).toBe(true);
    expect(isIncidentActive({ status: "scheduled" })).toBe(true);
    expect(isIncidentActive({ status: "resolved" })).toBe(false);
    expect(latestIncidentUpdate({ updates: [] })).toBeNull();
    const update = {
      id: "u1",
      incident_id: "i1",
      status: "identified" as const,
      body: "Found it",
      created_at: "2026-10-01T10:00:00",
    };
    expect(latestIncidentUpdate({ updates: [update] })).toBe(update);
  });
});

describe("e-mail console", () => {
  it("retries only failed or skipped e-mails that can be rebuilt", () => {
    expect(canRetryEmail({ status: "failed", retryable: true })).toBe(true);
    expect(canRetryEmail({ status: "skipped", retryable: true })).toBe(true);
    expect(canRetryEmail({ status: "failed", retryable: false })).toBe(false);
    expect(canRetryEmail({ status: "sent", retryable: true })).toBe(false);
  });

  it("cancels only pending e-mails", () => {
    expect(canCancelEmail({ status: "pending" })).toBe(true);
    expect(canCancelEmail({ status: "sending" })).toBe(false);
  });

  it("measures the hourly cap", () => {
    expect(hourlyCapUsage(250, 500)).toBe(50);
    expect(hourlyCapUsage(900, 500)).toBe(100);
    expect(hourlyCapUsage(3, 0)).toBeNull();
  });
});
