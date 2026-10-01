import { describe, expect, it, vi } from "vitest";
import {
  expectedEnd,
  isStaffRole,
  maintenanceFromError,
  maintenanceView,
  parsePlatformStatus,
  resolveMaintenance,
  signInRestricted,
  signUpState,
} from "@/lib/maintenance";
import {
  countFailedSignIns,
  isWrongSecondFactor,
  signInMethodParts,
} from "@/lib/sign-in-activity";
import {
  parseSignInError,
  parseUrlSignInError,
  sanitizeSignInMeta,
} from "@/lib/sign-in-errors";
import type {
  MaintenanceSettings,
  PublicPlatformStatus,
  SignInEvent,
} from "@/types/operations";

vi.mock("server-only", () => ({}));
vi.mock("next/navigation", () => ({ redirect: vi.fn() }));
vi.mock("next-intl/server", () => ({
  getLocale: async () => "en",
  getTimeZone: async () => "UTC",
  getTranslations: async () => (key: string) => `t:${key}`,
}));
vi.mock("@/lib/server/session", () => ({ getSession: async () => null }));
vi.mock("@/lib/server/api-token", () => ({ getApiToken: async () => "t" }));
vi.mock("@/lib/server/internal-api", () => ({
  getInternalApiHeaders: async () => ({}),
}));

function settings(
  overrides: Partial<MaintenanceSettings> = {},
): MaintenanceSettings {
  return {
    mode: "off",
    message: null,
    ends_at: null,
    started_at: null,
    ...overrides,
  };
}

function status(
  maintenance: Partial<MaintenanceSettings> = {},
  registrationsOpen = true,
): PublicPlatformStatus {
  return {
    maintenance: settings(maintenance),
    registrations_open: registrationsOpen,
  };
}

describe("parsePlatformStatus", () => {
  it("keeps a well-formed answer", () => {
    expect(
      parsePlatformStatus({
        maintenance: {
          mode: "read_only",
          message: "  Importing the catalogue  ",
          ends_at: "2026-10-01T18:00:00",
          started_at: "2026-10-01T16:00:00.123456",
        },
        registrations_open: false,
      }),
    ).toEqual({
      maintenance: {
        mode: "read_only",
        message: "Importing the catalogue",
        ends_at: "2026-10-01T18:00:00",
        started_at: "2026-10-01T16:00:00.123456",
      },
      registrations_open: false,
    });
  });

  it("refuses anything malformed", () => {
    for (const bad of [
      null,
      "off",
      {},
      { maintenance: { mode: "panic" }, registrations_open: true },
      { maintenance: { mode: "off" } },
      { maintenance: { mode: "off" }, registrations_open: "yes" },
    ]) {
      expect(parsePlatformStatus(bad)).toBeNull();
    }
  });

  it("drops a malformed end date and a blank message", () => {
    const parsed = parsePlatformStatus({
      maintenance: { mode: "full", message: "   ", ends_at: "<script>" },
      registrations_open: true,
    });
    expect(parsed?.maintenance.message).toBeNull();
    expect(parsed?.maintenance.ends_at).toBeNull();
  });
});

describe("maintenanceFromError", () => {
  it("reads a MAINTENANCE_MODE refusal", () => {
    expect(
      maintenanceFromError({
        code: "MAINTENANCE_MODE",
        meta: {
          mode: "full",
          message: "Back soon",
          ends_at: "2026-10-01T18:00:00",
          retry_after_seconds: 60,
        },
      }),
    ).toEqual({
      mode: "full",
      message: "Back soon",
      ends_at: "2026-10-01T18:00:00",
      started_at: null,
    });
  });

  it("assumes the platform is closed when the mode is missing", () => {
    expect(maintenanceFromError({ code: "MAINTENANCE_MODE" })?.mode).toBe(
      "full",
    );
  });

  it("ignores every other error", () => {
    expect(maintenanceFromError(null)).toBeNull();
    expect(maintenanceFromError(new Error("boom"))).toBeNull();
    expect(
      maintenanceFromError({ code: "SERVICE_BUSY", meta: { mode: "full" } }),
    ).toBeNull();
  });
});

describe("resolveMaintenance", () => {
  it("prefers the API's refusal over the cached status", () => {
    const refusal = settings({ mode: "full", message: "now" });
    expect(resolveMaintenance(settings({ mode: "off" }), refusal)).toBe(
      refusal,
    );
  });

  it("falls back to the status, and to nothing when it's off", () => {
    const cached = settings({ mode: "read_only" });
    expect(resolveMaintenance(cached, null)).toBe(cached);
    expect(resolveMaintenance(settings(), null)).toBeNull();
    expect(resolveMaintenance(null, undefined)).toBeNull();
  });
});

describe("maintenanceView", () => {
  it("shows nothing while the platform is open", () => {
    expect(maintenanceView("off", false)).toBe("none");
    expect(maintenanceView(null, true)).toBe("none");
  });

  it("only reminds staff", () => {
    expect(maintenanceView("read_only", true)).toBe("staff");
    expect(maintenanceView("full", true)).toBe("staff");
  });

  it("pauses changes or closes the dashboard for everyone else", () => {
    expect(maintenanceView("read_only", false)).toBe("readOnly");
    expect(maintenanceView("full", false)).toBe("screen");
  });

  it("knows who is staff", () => {
    expect(isStaffRole("admin")).toBe(true);
    expect(isStaffRole("moderator")).toBe(true);
    expect(isStaffRole("user")).toBe(false);
    expect(isStaffRole(undefined)).toBe(false);
  });
});

describe("sign-up and sign-in pages", () => {
  it("closes sign-ups during any maintenance or when switched off", () => {
    expect(signUpState(status())).toBe("open");
    expect(signUpState(status({}, false))).toBe("closed");
    expect(signUpState(status({ mode: "read_only" }))).toBe("maintenance");
    expect(signUpState(status({ mode: "full" }, false))).toBe("maintenance");
  });

  it("keeps the form when the status is unknown", () => {
    expect(signUpState(null)).toBe("open");
  });

  it("warns on the sign-in page during full maintenance only", () => {
    expect(signInRestricted(status({ mode: "full" }))).toBe(true);
    expect(signInRestricted(status({ mode: "read_only" }))).toBe(false);
    expect(signInRestricted(null)).toBe(false);
  });
});

describe("expectedEnd", () => {
  const now = Date.parse("2026-10-01T15:00:00Z");

  it("keeps an end still ahead (naive UTC)", () => {
    expect(expectedEnd({ ends_at: "2026-10-01T18:00:00" }, now)).toBe(
      "2026-10-01T18:00:00",
    );
  });

  it("drops a past or missing end", () => {
    expect(expectedEnd({ ends_at: "2026-10-01T14:00:00" }, now)).toBeNull();
    expect(expectedEnd({ ends_at: null }, now)).toBeNull();
    expect(expectedEnd(null, now)).toBeNull();
  });
});

describe("maintenance sign-in errors", () => {
  it("reach the login page with their code instead of 'invalid credentials'", () => {
    for (const code of [
      "MAINTENANCE_MODE",
      "REGISTRATION_CLOSED",
      "EMAIL_DOMAIN_BLOCKED",
    ]) {
      expect(parseSignInError(JSON.stringify({ code, meta: null })).code).toBe(
        code,
      );
      expect(parseUrlSignInError(code)?.code).toBe(code);
    }
  });

  it("keep the maintenance mode, never the staff message", () => {
    expect(
      sanitizeSignInMeta({
        mode: "full",
        message: "<b>hi</b>",
        retry_after_seconds: 60,
      }),
    ).toEqual({ mode: "full", retry_after_seconds: 60 });
    expect(sanitizeSignInMeta({ mode: "everything" })).toBeNull();
  });
});

describe("sign-in activity", () => {
  const event = (overrides: Partial<SignInEvent> = {}): SignInEvent => ({
    outcome: "succeeded",
    method: "password",
    second_factor: false,
    ip_address: "203.0.113.7",
    created_at: "2026-10-01T12:00:00",
    ...overrides,
  });

  it("splits a method into the parts the app names", () => {
    expect(signInMethodParts("password")).toEqual(["password"]);
    expect(signInMethodParts("google+two_factor")).toEqual([
      "google",
      "two_factor",
    ]);
    expect(signInMethodParts("password+passkey")).toEqual(["password"]);
    expect(signInMethodParts(null)).toEqual([]);
    expect(signInMethodParts("")).toEqual([]);
  });

  it("flags a wrong second factor on failures only", () => {
    expect(
      isWrongSecondFactor(event({ outcome: "failed", second_factor: true })),
    ).toBe(true);
    expect(
      isWrongSecondFactor(event({ outcome: "locked", second_factor: true })),
    ).toBe(true);
    expect(isWrongSecondFactor(event({ second_factor: true }))).toBe(false);
    expect(isWrongSecondFactor(event({ outcome: "failed" }))).toBe(false);
  });

  it("counts failed attempts and lockouts", () => {
    expect(
      countFailedSignIns([
        event(),
        event({ outcome: "failed" }),
        event({ outcome: "locked" }),
      ]),
    ).toBe(2);
  });
});

describe("server actions during maintenance", () => {
  it("translate MAINTENANCE_MODE (503) instead of 'unavailable'", async () => {
    const { ApiError } = await import("@/lib/api-server");
    const { toActionFailure } = await import("@/lib/action-guard");

    const full = await toActionFailure(
      new ApiError(503, "down", 60_000, "MAINTENANCE_MODE", { mode: "full" }),
    );
    expect(full).toMatchObject({
      success: false,
      apiCode: "MAINTENANCE_MODE",
      error: "t:MAINTENANCE_MODE",
    });

    const readOnly = await toActionFailure(
      new ApiError(503, "paused", 60_000, "MAINTENANCE_MODE", {
        mode: "read_only",
      }),
    );
    expect(readOnly.error).toBe("t:MAINTENANCE_MODE_READ_ONLY");

    // A bare 503 still says the service is unavailable.
    const bare = await toActionFailure(new ApiError(503, "down"));
    expect(bare.error).toBe("t:unavailable");
  });
});
