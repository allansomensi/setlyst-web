import { afterAll, beforeAll, describe, expect, it } from "vitest";
import {
  announcementToPayload,
  audienceKey,
  buildAnnouncementPatch,
  editableFields,
  emptyAnnouncementForm,
  formToPayload,
  isExternalCta,
  isValidCtaUrl,
  lockedFieldsIn,
  validateAnnouncementForm,
} from "@/lib/announcements";
import {
  centsToReais,
  generatePromoCode,
  PROMO_CODE_PATTERN,
  promoCodeStatus,
  promotionStatus,
  reaisToCents,
} from "@/lib/billing-admin";
import {
  isBeforeUtc,
  localInputToUtcNaive,
  utcNaiveToLocalInput,
} from "@/lib/datetime-local";
import { pickLocalized } from "@/lib/localized";
import {
  actionsForFlag,
  canActOnFlag,
  moderationQueueHref,
  parseModerationTab,
  parseModerationUserFilter,
} from "@/lib/moderation";
import {
  describeNotification,
  formatPlanCode,
} from "@/lib/notification-messages";
import {
  emptyReleaseNoteForm,
  formToReleasePayload,
  hasUnseenRelease,
  latestReleaseId,
  moveItem,
  validateReleaseNoteForm,
} from "@/lib/release-note-editor";
import { hasStaffCapability } from "@/lib/staff-permissions";
import type { Announcement } from "@/types/communication";
import type { ModerationFlag } from "@/types/staff";

describe("datetime-local conversion", () => {
  const originalTz = process.env.TZ;
  beforeAll(() => {
    // UTC-3 all year (no daylight saving since 2019).
    process.env.TZ = "America/Sao_Paulo";
  });
  afterAll(() => {
    process.env.TZ = originalTz;
  });

  it("turns local input into naive UTC and back", () => {
    expect(localInputToUtcNaive("2026-10-01T21:30")).toBe(
      "2026-10-02T00:30:00",
    );
    expect(utcNaiveToLocalInput("2026-10-02T00:30:00")).toBe(
      "2026-10-01T21:30",
    );
    expect(utcNaiveToLocalInput("2026-10-02T00:30:00.123456")).toBe(
      "2026-10-01T21:30",
    );
  });

  it("treats empty and malformed values as unset", () => {
    expect(localInputToUtcNaive("")).toBeNull();
    expect(localInputToUtcNaive("tomorrow")).toBeNull();
    expect(localInputToUtcNaive(null)).toBeNull();
    expect(utcNaiveToLocalInput(null)).toBe("");
    expect(utcNaiveToLocalInput("garbage")).toBe("");
  });

  it("compares naive UTC timestamps", () => {
    expect(isBeforeUtc("2026-01-01T00:00:00", "2026-01-01T00:00:01")).toBe(
      true,
    );
    expect(isBeforeUtc("2026-01-01T00:00:00", "2026-01-01T00:00:00")).toBe(
      false,
    );
  });
});

describe("announcement form", () => {
  const valid = {
    ...emptyAnnouncementForm(),
    title: "Maintenance tonight",
    body: "We will be back soon.\nThanks.",
  };

  it("accepts a complete form", () => {
    expect(validateAnnouncementForm(valid)).toEqual([]);
  });

  it("mirrors the API rules", () => {
    expect(validateAnnouncementForm({ ...valid, title: "Hi" })).toContain(
      "titleLength",
    );
    expect(validateAnnouncementForm({ ...valid, body: "   " })).toContain(
      "bodyLength",
    );
    expect(
      validateAnnouncementForm({
        ...valid,
        show_banner: false,
        send_notification: false,
      }),
    ).toContain("noChannel");
    expect(validateAnnouncementForm({ ...valid, cta_label: "Open" })).toContain(
      "ctaIncomplete",
    );
    expect(
      validateAnnouncementForm({
        ...valid,
        cta_label: "Open",
        cta_url: "//evil.example",
      }),
    ).toContain("ctaUrl");
    expect(
      validateAnnouncementForm({
        ...valid,
        starts_at: "2026-10-02T10:00",
        ends_at: "2026-10-01T10:00",
      }),
    ).toContain("windowOrder");
  });

  it("forces the modal when acknowledgement is required", () => {
    const payload = formToPayload({
      ...valid,
      show_modal: false,
      dismissible: true,
      requires_acknowledgement: true,
    });
    expect(payload.show_modal).toBe(true);
    expect(payload.dismissible).toBe(false);
  });

  it("normalizes the audience (empty = everyone)", () => {
    const payload = formToPayload({
      ...valid,
      audience_roles: [],
      audience_plans: ["pro", "pro", " trial "],
    });
    expect(payload.audience_roles).toBeNull();
    expect(payload.audience_plans).toEqual(["pro", "trial"]);
    expect(
      audienceKey({
        audience_roles: ["user", "admin"],
        audience_plans: null,
        audience_locales: null,
      }),
    ).toBe(
      audienceKey({
        audience_roles: ["admin", "user"],
        audience_plans: null,
        audience_locales: null,
      }),
    );
  });

  it("validates call-to-action links", () => {
    expect(isValidCtaUrl("/dashboard/settings")).toBe(true);
    expect(isValidCtaUrl("https://setlyst.app/pricing")).toBe(true);
    expect(isValidCtaUrl("//evil.example")).toBe(false);
    expect(isValidCtaUrl("/\\evil.example")).toBe(false);
    expect(isValidCtaUrl("http://setlyst.app")).toBe(false);
    expect(isValidCtaUrl("javascript:alert(1)")).toBe(false);
    expect(isValidCtaUrl("https://user:pw@setlyst.app")).toBe(false);
    expect(isValidCtaUrl("/with space")).toBe(false);
    expect(isExternalCta("https://setlyst.app")).toBe(true);
    expect(isExternalCta("/dashboard")).toBe(false);
  });
});

describe("announcement status rules", () => {
  const announcement: Announcement = {
    id: "a",
    title: "Title",
    body: "Body",
    level: "info",
    show_modal: false,
    show_banner: true,
    send_notification: true,
    send_email: false,
    dismissible: true,
    requires_acknowledgement: false,
    cta_label: null,
    cta_url: null,
    audience_roles: null,
    audience_plans: null,
    audience_locales: null,
    starts_at: null,
    ends_at: null,
    published_at: "2026-09-01T00:00:00",
    archived_at: null,
    delivered_at: null,
    created_by_username: null,
    updated_by_username: null,
    created_at: "2026-09-01T00:00:00",
    updated_at: "2026-09-01T00:00:00",
    status: "active",
  };

  it("builds a patch with only the changed fields", () => {
    const original = announcementToPayload(announcement);
    const patch = buildAnnouncementPatch(original, {
      ...original,
      title: "New title",
      audience_roles: null,
    });
    expect(patch).toEqual({ title: "New title" });
  });

  it("knows what an active announcement still accepts", () => {
    expect(editableFields("draft")).toBe("all");
    expect(editableFields("scheduled")).toBe("all");
    expect(editableFields("ended")).toBe("none");
    expect(editableFields("archived")).toBe("none");
    expect(lockedFieldsIn({ title: "x", ends_at: null }, "active")).toEqual([]);
    expect(lockedFieldsIn({ level: "warning", title: "x" }, "active")).toEqual([
      "level",
    ]);
    expect(lockedFieldsIn({ title: "x" }, "ended")).toEqual(["title"]);
  });
});

describe("release note editor", () => {
  const filled = () => {
    const form = emptyReleaseNoteForm("2026-09-23");
    form.version = "0.12.0";
    form.title = {
      "pt-BR": "Turnês e avisos",
      en: "Tours and announcements",
      es: "",
    };
    form.items[0].text = {
      "pt-BR": "Crie turnês.",
      en: "Create tours.",
      es: "",
    };
    return form;
  };

  it("accepts a complete note and drops empty optional locales", () => {
    const form = filled();
    expect(validateReleaseNoteForm(form)).toEqual([]);
    const payload = formToReleasePayload(form);
    expect(payload.title).toEqual({
      "pt-BR": "Turnês e avisos",
      en: "Tours and announcements",
    });
    expect(payload.items[0]).toEqual({
      kind: "new",
      text: { "pt-BR": "Crie turnês.", en: "Create tours." },
    });
  });

  it("mirrors the API validation", () => {
    const form = filled();
    form.version = "v1.2";
    form.title.en = "";
    form.items[0].text.es = "ok";
    const codes = validateReleaseNoteForm(form).map(
      (i) => `${i.field}:${i.locale ?? ""}:${i.code}`,
    );
    expect(codes).toContain("version::version");
    expect(codes).toContain("title:en:required");
    expect(codes).toContain("items.0:es:tooShort");

    const empty = filled();
    empty.items = [];
    expect(validateReleaseNoteForm(empty).map((i) => i.code)).toContain(
      "noItems",
    );
    for (const version of ["1.2.3", "10.0.0-rc.1"]) {
      expect(validateReleaseNoteForm({ ...filled(), version })).toEqual([]);
    }
  });

  it("reorders items", () => {
    expect(moveItem(["a", "b", "c"], 0, 1)).toEqual(["b", "a", "c"]);
    expect(moveItem(["a", "b", "c"], 2, 0)).toEqual(["c", "a", "b"]);
    expect(moveItem(["a", "b"], 1, 5)).toEqual(["a", "b"]);
  });

  it("finds the newest published release for the unseen dot", () => {
    const notes = [
      {
        id: "old",
        released_on: "2026-08-20",
        published_at: "2026-08-20T00:00:00",
      },
      { id: "draft", released_on: "2026-12-01", published_at: null },
      {
        id: "new",
        released_on: "2026-09-22",
        published_at: "2026-09-22T00:00:00",
      },
    ];
    expect(latestReleaseId(notes)).toBe("new");
    expect(latestReleaseId([])).toBeNull();
    expect(hasUnseenRelease("new", "old")).toBe(true);
    expect(hasUnseenRelease("new", "new")).toBe(false);
    expect(hasUnseenRelease(null, null)).toBe(false);
  });
});

describe("localized fallback", () => {
  it("falls back to English, then Portuguese, then anything", () => {
    expect(pickLocalized({ en: "Hi", "pt-BR": "Oi" }, "es")).toBe("Hi");
    expect(pickLocalized({ "pt-BR": "Oi", es: "" }, "es")).toBe("Oi");
    expect(pickLocalized({ es: "Hola" }, "en")).toBe("Hola");
    expect(pickLocalized(null, "en")).toBe("");
  });
});

describe("notification messages", () => {
  it("maps every new type to a key, link and tone", () => {
    const announcement = describeNotification({
      type: "announcement",
      data: { announcement_id: "abc", title: "Maintenance", level: "warning" },
    });
    expect(announcement).toMatchObject({
      key: "announcement",
      href: "/dashboard/announcements#announcement-abc",
      tone: "warning",
    });
    expect(
      describeNotification({
        type: "release_published",
        data: { version: "0.12.0", release_id: "r" },
      }),
    ).toMatchObject({ key: "releasePublished", href: "/dashboard/whats-new" });
    expect(
      describeNotification({
        type: "band_suggestion_resolved",
        data: {
          band_id: "b1",
          band_name: "Band",
          suggestion_id: "s",
          song_title: "Song",
          status: "accepted",
        },
      }),
    ).toMatchObject({
      key: "bandSuggestionResolved.accepted",
      href: "/dashboard/bands/b1",
    });
    expect(
      describeNotification({
        type: "moderation_action",
        data: {
          action: "username_reset",
          note: " Pick another ",
          band_id: null,
          band_name: null,
        },
      }),
    ).toMatchObject({
      key: "moderationAction.username_reset",
      href: "/dashboard/profile",
      detail: "Pick another",
    });
    expect(
      describeNotification({
        type: "subscription_changed",
        data: {
          kind: "plan_granted",
          plan_code: "pro",
          status: "active",
          current_period_end: "2026-10-23T00:00:00",
        },
      }).key,
    ).toBe("subscriptionChanged.plan_grantedUntil");
    expect(
      describeNotification({
        type: "credits_granted",
        data: { amount: -10, reason: "admin_adjustment" },
      }),
    ).toMatchObject({ key: "creditsDebited", values: { amount: 10 } });
    expect(
      describeNotification({
        type: "security_alert",
        data: { event: "password_changed" },
      }),
    ).toMatchObject({
      key: "securityAlert.password_changed",
      tone: "critical",
    });
    expect(
      describeNotification({
        type: "security_alert",
        data: { event: "something_else" },
      }).key,
    ).toBe("securityAlert.other");
  });

  it("keeps the existing types", () => {
    expect(
      describeNotification({
        type: "share_link_revoked",
        data: {
          kind: "gig",
          target_id: "g1",
          title: "Show",
          reason: null,
          actor_id: "a",
        },
      }),
    ).toMatchObject({ key: "shareLinkRevoked", href: "/dashboard/gigs/g1" });
    expect(
      describeNotification({
        type: "band_role_changed",
        data: {
          band_id: "b",
          band_name: "B",
          old_role: "member",
          new_role: "admin",
          actor_id: "a",
        },
      }).values.role,
    ).toEqual({ ref: "bandRole", value: "admin" });
  });

  it("formats plan codes without a name", () => {
    expect(formatPlanCode("pro")).toBe("Pro");
    expect(formatPlanCode("studio_plus")).toBe("Studio Plus");
  });
});

describe("billing helpers", () => {
  it("parses prices in reais", () => {
    expect(reaisToCents("14,90")).toBe(1490);
    expect(reaisToCents("14.90")).toBe(1490);
    expect(reaisToCents("1.490,00")).toBe(149000);
    expect(reaisToCents("R$ 9")).toBe(900);
    expect(reaisToCents("0,5")).toBe(50);
    expect(reaisToCents("-1")).toBeNull();
    expect(reaisToCents("1,999")).toBeNull();
    expect(reaisToCents("")).toBeNull();
    expect(centsToReais(1490)).toBe("14,90");
    expect(centsToReais(5)).toBe("0,05");
  });

  it("generates valid, unambiguous promo codes", () => {
    const code = generatePromoCode("setlyst");
    expect(code).toMatch(/^SETLYST-[A-Z2-9]{4}-[A-Z2-9]{4}$/);
    expect(PROMO_CODE_PATTERN.test(code)).toBe(true);
    expect(generatePromoCode("", () => 0)).toBe("AAAA-AAAA");
  });

  it("derives promo code and promotion status", () => {
    const now = new Date("2026-09-23T12:00:00Z");
    const base = {
      disabled_at: null,
      starts_at: null,
      expires_at: null,
      max_redemptions: null,
      redemptions_count: 0,
    };
    expect(promoCodeStatus(base, now)).toBe("active");
    expect(
      promoCodeStatus({ ...base, disabled_at: "2026-09-01T00:00:00" }, now),
    ).toBe("disabled");
    expect(
      promoCodeStatus({ ...base, expires_at: "2026-09-23T11:00:00" }, now),
    ).toBe("expired");
    expect(
      promoCodeStatus(
        { ...base, max_redemptions: 2, redemptions_count: 2 },
        now,
      ),
    ).toBe("exhausted");
    expect(
      promoCodeStatus({ ...base, starts_at: "2026-10-01T00:00:00" }, now),
    ).toBe("scheduled");
    const promotion = {
      active: true,
      starts_at: "2026-09-01T00:00:00",
      ends_at: "2026-10-01T00:00:00",
    };
    expect(promotionStatus(promotion, now)).toBe("running");
    expect(promotionStatus({ ...promotion, active: false }, now)).toBe(
      "inactive",
    );
    expect(
      promotionStatus({ ...promotion, ends_at: "2026-09-02T00:00:00" }, now),
    ).toBe("ended");
  });
});

describe("moderation helpers", () => {
  const flag = (overrides: Partial<ModerationFlag> = {}): ModerationFlag => ({
    id: "f",
    target_type: "avatar",
    user: {
      id: "u",
      username: "user",
      avatar_url: "https://x.example/a.png",
      role: "user",
      is_banned: false,
    },
    band: null,
    value: "https://x.example/a.png",
    current_value: "https://x.example/a.png",
    reasons: ["suspicious_url"],
    score: 0.6,
    details: {},
    source: "automatic",
    reported_by_username: null,
    report_note: null,
    status: "open",
    resolution: null,
    resolution_note: null,
    resolved_by_username: null,
    resolved_at: null,
    created_at: "2026-09-23T00:00:00",
    ...overrides,
  });

  it("offers the actions that fit the flag", () => {
    expect(actionsForFlag(flag())).toEqual(["remove_avatar"]);
    expect(actionsForFlag(flag({ current_value: null }))).toEqual([]);
    expect(actionsForFlag(flag({ target_type: "username" }))).toEqual([
      "reset_username",
    ]);
    expect(
      actionsForFlag(
        flag({ target_type: "band_logo", band: { id: "b", name: "B" } }),
      ),
    ).toEqual(["remove_band_logo"]);
  });

  it("follows the staff hierarchy", () => {
    const moderator = { id: "m", role: "moderator" as const };
    expect(canActOnFlag(moderator, flag())).toBe(true);
    expect(
      canActOnFlag(
        moderator,
        flag({ user: { ...flag().user, role: "moderator" } }),
      ),
    ).toBe(false);
    expect(
      canActOnFlag({ id: "u", role: "admin" }, flag(), "remove_avatar"),
    ).toBe(false);
    expect(canActOnFlag({ id: "u", role: "admin" }, flag(), "dismiss")).toBe(
      true,
    );
    expect(parseModerationTab("dismissed")).toBe("dismissed");
    expect(parseModerationTab("bogus")).toBe("open");
  });

  it("filters the queue by account", () => {
    const id = "0199A1B2-C3D4-7E5F-8A9B-0C1D2E3F4A5B";
    expect(parseModerationUserFilter(id)).toBe(id.toLowerCase());
    expect(parseModerationUserFilter(` ${id} `)).toBe(id.toLowerCase());
    expect(parseModerationUserFilter("admin")).toBeNull();
    expect(parseModerationUserFilter("1 OR 1=1")).toBeNull();
    expect(parseModerationUserFilter(undefined)).toBeNull();
    expect(moderationQueueHref("abc")).toBe(
      "/dashboard/admin/moderation?user_id=abc",
    );
  });

  it("gates staff screens by role", () => {
    expect(hasStaffCapability("moderator", "moderation")).toBe(true);
    expect(hasStaffCapability("moderator", "announcements")).toBe(true);
    expect(hasStaffCapability("moderator", "billing")).toBe(true);
    expect(hasStaffCapability("moderator", "billing.write")).toBe(false);
    expect(hasStaffCapability("moderator", "promoCodes")).toBe(false);
    expect(hasStaffCapability("moderator", "releaseNotes.write")).toBe(false);
    expect(hasStaffCapability("admin", "promoCodes")).toBe(true);
    expect(hasStaffCapability("user", "moderation")).toBe(false);
  });
});
