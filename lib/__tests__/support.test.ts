import { describe, expect, it } from "vitest";
import { describeNotification } from "@/lib/notification-messages";
import {
  SUPPORT_CONTEXT_MAX_BYTES,
  TICKET_STATUS_STYLES,
  canCloseTicket,
  canRateTicket,
  canReplyToTicket,
  formatTicketNumber,
  isTicketCategory,
  supportContext,
  supportTextLength,
  supportTicketHref,
  validateSupportMessage,
  validateTicketDraft,
} from "@/lib/support";
import {
  SUPPORT_MESSAGE_MAX,
  SUPPORT_SUBJECT_MAX,
  TICKET_STATUSES,
} from "@/types/operations";

describe("support request actions", () => {
  it("takes replies and closing until the request is closed", () => {
    for (const status of ["open", "pending", "resolved"] as const) {
      expect(canReplyToTicket(status)).toBe(true);
      expect(canCloseTicket(status)).toBe(true);
    }
    expect(canReplyToTicket("closed")).toBe(false);
    expect(canCloseTicket("closed")).toBe(false);
  });

  it("is rated once, after it was resolved or closed", () => {
    expect(canRateTicket({ status: "resolved", rating: null })).toBe(true);
    expect(canRateTicket({ status: "closed", rating: null })).toBe(true);
    expect(canRateTicket({ status: "resolved", rating: 4 })).toBe(false);
    expect(canRateTicket({ status: "open", rating: null })).toBe(false);
    expect(canRateTicket({ status: "pending", rating: null })).toBe(false);
  });

  it("styles every status and links by id", () => {
    for (const status of TICKET_STATUSES) {
      expect(TICKET_STATUS_STYLES[status]).toBeTruthy();
    }
    expect(formatTicketNumber(1042)).toBe("#1042");
    expect(supportTicketHref("a b")).toBe("/dashboard/support/a%20b");
  });
});

describe("new request form", () => {
  const valid = { subject: "Can't export", category: "bug", body: "Hi" };

  it("accepts a complete draft", () => {
    expect(validateTicketDraft(valid)).toEqual({});
  });

  it("checks the subject's length after trimming", () => {
    expect(validateTicketDraft({ ...valid, subject: "  ab  " })).toEqual({
      subject: "subjectTooShort",
    });
    expect(
      validateTicketDraft({
        ...valid,
        subject: "x".repeat(SUPPORT_SUBJECT_MAX + 1),
      }),
    ).toEqual({ subject: "subjectTooLong" });
  });

  it("needs a known category and a message within the limit", () => {
    expect(validateTicketDraft({ ...valid, category: "" })).toEqual({
      category: "categoryRequired",
    });
    expect(validateTicketDraft({ ...valid, category: "spam" })).toEqual({
      category: "categoryRequired",
    });
    expect(validateSupportMessage("   ")).toBe("messageRequired");
    expect(validateSupportMessage("x".repeat(SUPPORT_MESSAGE_MAX))).toBeNull();
    expect(validateSupportMessage("x".repeat(SUPPORT_MESSAGE_MAX + 1))).toBe(
      "messageTooLong",
    );
    expect(isTicketCategory("billing")).toBe(true);
    expect(isTicketCategory(42)).toBe(false);
  });

  it("counts characters like the API (an emoji is one)", () => {
    expect(supportTextLength(" 🎸ab ")).toBe(3);
  });

  it("sends a small context, user agent shortened", () => {
    const context = supportContext("/dashboard/support", "x".repeat(500));
    expect(context.page).toBe("/dashboard/support");
    expect(context.user_agent).toHaveLength(200);
    expect(supportContext("/dashboard/support", null)).toEqual({
      page: "/dashboard/support",
    });
    const huge = supportContext("é".repeat(5000), "ü".repeat(5000));
    expect(
      new TextEncoder().encode(JSON.stringify(huge)).length,
    ).toBeLessThanOrEqual(SUPPORT_CONTEXT_MAX_BYTES);
  });
});

describe("support reply notification", () => {
  it("names the request and links to it", () => {
    expect(
      describeNotification({
        type: "support_reply",
        data: { ticket_id: "t1", ticket_number: 1042, subject: " Export " },
      }),
    ).toMatchObject({
      key: "supportReply",
      values: { number: "1042" },
      href: "/dashboard/support/t1",
      detail: "Export",
      icon: "support",
    });
  });

  it("falls back to the list without an id or number", () => {
    expect(
      describeNotification({
        type: "support_reply",
        data: {} as never,
      }),
    ).toMatchObject({
      key: "supportReplyUnnumbered",
      href: "/dashboard/support",
      detail: null,
    });
  });
});
