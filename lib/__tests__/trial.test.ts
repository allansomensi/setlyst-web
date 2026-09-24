import { describe, expect, it } from "vitest";
import { trialInfo } from "@/lib/trial";
import type { BillingMe } from "@/types/billing";

const DAY = 24 * 60 * 60 * 1000;
const now = Date.parse("2026-09-01T12:00:00Z");

function billing(overrides: Partial<BillingMe> = {}): BillingMe {
  return {
    enforced: true,
    plan: null,
    subscription: {
      plan_code: "pro",
      status: "trialing",
      source: "trial",
      // Naive UTC, as the API sends it.
      started_at: "2026-09-01T12:00:00",
      current_period_end: "2026-10-01T12:00:00",
      trial_ends_at: "2026-10-01T12:00:00",
      cancel_at_period_end: false,
    },
    features: {},
    credits: { balance: 0 },
    referral: {
      code: null,
      link_path: null,
      rewarded_count: 0,
      pending_count: 0,
    },
    rewards: [],
    ...overrides,
  };
}

describe("trialInfo", () => {
  it("describes a running trial", () => {
    expect(trialInfo(billing(), "Pro", now)).toEqual({
      planCode: "pro",
      planName: "Pro",
      endsAt: "2026-10-01T12:00:00",
      daysLeft: 30,
      totalDays: 30,
    });
    expect(trialInfo(billing(), "Pro", now + 28.5 * DAY)?.daysLeft).toBe(2);
    expect(trialInfo(billing(), "Pro", now + 29.5 * DAY)?.daysLeft).toBe(0);
  });

  it("reads naive timestamps as UTC", () => {
    // 1 hour before the end, in any time zone: "ends today".
    const info = trialInfo(billing(), "", Date.parse("2026-10-01T11:00:00Z"));
    expect(info?.daysLeft).toBe(0);
    expect(info?.planName).toBe("pro");
  });

  it("is null when there's nothing to announce", () => {
    expect(trialInfo(null, "Pro", now)).toBeNull();
    expect(trialInfo(billing({ enforced: false }), "Pro", now)).toBeNull();
    expect(trialInfo(billing({ subscription: null }), "Pro", now)).toBeNull();
    const paid = billing();
    paid.subscription!.status = "active";
    expect(trialInfo(paid, "Pro", now)).toBeNull();
    expect(trialInfo(billing(), "Pro", now + 31 * DAY)).toBeNull();
  });
});
