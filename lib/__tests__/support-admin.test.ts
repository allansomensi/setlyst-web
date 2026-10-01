import { describe, expect, it } from "vitest";
import {
  contextEntries,
  defaultStatusAfterSend,
  hasInboxFilters,
  inboxApiQuery,
  isAwaitingStaff,
  isHighPriority,
  parseInboxFilters,
  parseTicketTab,
  priorityRank,
  roundRating,
  splitMinutes,
  ticketLabel,
} from "@/lib/support-admin";

const ME = "0b6d3f2e-6a4c-4d8e-9a51-2f7c1e4b9d10";
const OTHER = "6f1c2a3b-4d5e-4f60-8a7b-9c0d1e2f3a4b";

describe("support inbox filters", () => {
  it("defaults to the active tab", () => {
    expect(parseTicketTab(undefined)).toBe("active");
    expect(parseTicketTab("bogus")).toBe("active");
    expect(parseTicketTab("closed")).toBe("closed");
    expect(parseTicketTab("all")).toBe("all");
  });

  it("keeps only well-formed filters", () => {
    const filters = parseInboxFilters({
      status: "pending",
      priority: "urgent",
      category: "nope",
      assignee: "someone",
      user_id: "not-a-uuid",
      q: "  #1042 ",
      page: "-3",
    });
    expect(filters).toEqual({
      tab: "pending",
      priority: "urgent",
      category: null,
      assignee: null,
      userId: null,
      q: "#1042",
      page: 1,
    });
  });

  it("reads array params and caps the search", () => {
    const filters = parseInboxFilters({
      category: ["billing", "bug"],
      user_id: OTHER,
      q: "x".repeat(300),
      page: "4",
    });
    expect(filters.category).toBe("billing");
    expect(filters.userId).toBe(OTHER);
    expect(filters.q).toHaveLength(100);
    expect(filters.page).toBe(4);
  });

  it("turns 'mine' into the viewer's id and 'none' into unassigned", () => {
    const mine = new URLSearchParams(
      inboxApiQuery(parseInboxFilters({ assignee: "me" }), ME, 25),
    );
    expect(mine.get("assignee_id")).toBe(ME);
    expect(mine.get("unassigned")).toBeNull();
    expect(mine.get("status")).toBe("active");
    expect(mine.get("per_page")).toBe("25");

    const none = new URLSearchParams(
      inboxApiQuery(parseInboxFilters({ assignee: "none" }), ME),
    );
    expect(none.get("unassigned")).toBe("true");
    expect(none.get("assignee_id")).toBeNull();
  });

  it("passes the other filters through", () => {
    const query = new URLSearchParams(
      inboxApiQuery(
        parseInboxFilters({
          status: "all",
          priority: "high",
          category: "bug",
          user_id: OTHER,
          q: "crash",
          page: "2",
        }),
        ME,
      ),
    );
    expect(Object.fromEntries(query)).toMatchObject({
      status: "all",
      priority: "high",
      category: "bug",
      user_id: OTHER,
      q: "crash",
      page: "2",
    });
  });

  it("says whether the inbox is narrowed beyond its tab", () => {
    expect(hasInboxFilters(parseInboxFilters({ status: "closed" }))).toBe(
      false,
    );
    expect(hasInboxFilters(parseInboxFilters({ assignee: "none" }))).toBe(true);
    expect(hasInboxFilters(parseInboxFilters({ q: "refund" }))).toBe(true);
  });
});

describe("ticket helpers", () => {
  it("orders priorities", () => {
    expect(priorityRank("urgent")).toBeGreaterThan(priorityRank("high"));
    expect(priorityRank("high")).toBeGreaterThan(priorityRank("normal"));
    expect(priorityRank("normal")).toBeGreaterThan(priorityRank("low"));
    expect(isHighPriority("urgent")).toBe(true);
    expect(isHighPriority("high")).toBe(true);
    expect(isHighPriority("normal")).toBe(false);
  });

  it("flags active tickets where the requester spoke last", () => {
    expect(isAwaitingStaff({ status: "open", last_from_requester: true })).toBe(
      true,
    );
    expect(
      isAwaitingStaff({ status: "pending", last_from_requester: true }),
    ).toBe(true);
    expect(
      isAwaitingStaff({ status: "resolved", last_from_requester: true }),
    ).toBe(false);
    expect(
      isAwaitingStaff({ status: "open", last_from_requester: false }),
    ).toBe(false);
  });

  it("labels tickets by number", () => {
    expect(ticketLabel({ number: 1042 })).toBe("#1042");
  });

  it("starts replies on pending and notes on unchanged", () => {
    expect(defaultStatusAfterSend("reply")).toBe("pending");
    expect(defaultStatusAfterSend("note")).toBe("");
  });
});

describe("summary formatting", () => {
  it("splits a response time into its best unit", () => {
    expect(splitMinutes(0.4)).toEqual({ unit: "lessThanMinute", value: 0 });
    expect(splitMinutes(12.4)).toEqual({ unit: "minutes", value: 12 });
    expect(splitMinutes(59.4)).toEqual({ unit: "minutes", value: 59 });
    expect(splitMinutes(59.6)).toEqual({ unit: "hours", value: 1 });
    expect(splitMinutes(95)).toEqual({ unit: "hours", value: 1.6 });
    expect(splitMinutes(60 * 30)).toEqual({ unit: "hours", value: 30 });
    expect(splitMinutes(60 * 60)).toEqual({ unit: "days", value: 2.5 });
    expect(splitMinutes(60 * 24 * 12.4)).toEqual({ unit: "days", value: 12 });
    expect(splitMinutes(-1)).toBeNull();
    expect(splitMinutes(Number.NaN)).toBeNull();
  });

  it("rounds the average rating", () => {
    expect(roundRating(4.26)).toBe(4.3);
    expect(roundRating(null)).toBeNull();
    expect(roundRating(Number.NaN)).toBeNull();
  });
});

describe("ticket context", () => {
  it("flattens nested objects into dotted keys", () => {
    expect(
      contextEntries({
        page: "/dashboard/songs",
        app: { version: "web", online: true },
        ids: [1, 2, 3],
        missing: null,
      }),
    ).toEqual([
      { key: "page", value: "/dashboard/songs" },
      { key: "app.version", value: "web" },
      { key: "app.online", value: "true" },
      { key: "ids", value: "1, 2, 3" },
      { key: "missing", value: "—" },
    ]);
  });

  it("ignores non-objects and cuts long or deep values", () => {
    expect(contextEntries(null)).toEqual([]);
    expect(contextEntries(["a"])).toEqual([]);
    const [long] = contextEntries({ ua: "x".repeat(500) });
    expect(long.value.length).toBe(300);
    expect(long.value.endsWith("…")).toBe(true);
    expect(contextEntries({ a: { b: { c: { d: 1 } } } })).toEqual([
      { key: "a.b.c", value: '{"d":1}' },
    ]);
  });
});
