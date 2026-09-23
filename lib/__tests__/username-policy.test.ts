import { describe, expect, it } from "vitest";
import { usernameIssue } from "@/lib/username-policy";

describe("usernameIssue", () => {
  it.each([
    ["alice", null],
    ["john.doe", null],
    ["dj_mike-2", null],
    ["ab", "length"],
    ["a".repeat(21), "length"],
    ["joão", "characters"],
    ["has space", "characters"],
    ["1alice", "start"],
    ["_alice", "start"],
    ["alice.", "end"],
    ["al..ice", "consecutive"],
    ["al._ice", "consecutive"],
    ["admin", "reserved"],
    ["Ad.Min", "reserved"],
    ["setlyst_team", "reserved"],
  ])("%s → %s", (username, expected) => {
    expect(usernameIssue(username)).toBe(expected);
  });
});
