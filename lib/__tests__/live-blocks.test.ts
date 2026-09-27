import { describe, expect, it } from "vitest";
import { liveBlocksFrom } from "@/lib/live-blocks";
import type { SetlistItem, SetlistSong } from "@/types/api";

let position = 0;
const song = (id: string): SetlistItem => ({
  item_type: "song",
  position: position++,
  song: { id } as SetlistSong,
});
const block = (name: string): SetlistItem => ({
  item_type: "block",
  position: position++,
  id: `block-${name}`,
  name,
});
const pause = (): SetlistItem => ({
  item_type: "break",
  position: position++,
  id: `break-${position}`,
  label: null,
  duration_minutes: 15,
});

describe("liveBlocksFrom", () => {
  it("is empty without blocks", () => {
    const result = liveBlocksFrom([song("a"), pause(), song("b")]);
    expect(result.positions.size).toBe(0);
    expect(result.transitions.size).toBe(0);
    expect(liveBlocksFrom(null).positions.size).toBe(0);
  });

  it("places each song in its block", () => {
    const { positions } = liveBlocksFrom([
      song("intro"),
      block("Rock"),
      song("a"),
      song("b"),
      block("Forró"),
      song("c"),
    ]);
    expect(positions.get("intro")).toBeUndefined();
    expect(positions.get("a")).toEqual({
      name: "Rock",
      index: 1,
      total: 2,
      blockNumber: 1,
      blockCount: 2,
    });
    expect(positions.get("b")).toMatchObject({ index: 2, total: 2 });
    expect(positions.get("c")).toMatchObject({
      name: "Forró",
      index: 1,
      total: 1,
      blockNumber: 2,
    });
  });

  it("keeps a block going across a break", () => {
    const { positions } = liveBlocksFrom([
      block("Rock"),
      song("a"),
      pause(),
      song("b"),
    ]);
    expect(positions.get("b")).toMatchObject({ name: "Rock", index: 2 });
  });

  it("flags what comes before the next song", () => {
    const { transitions } = liveBlocksFrom([
      block("Rock"),
      song("a"),
      song("b"),
      pause(),
      song("c"),
      pause(),
      block("Forró"),
      song("d"),
      block("Samba"),
      song("e"),
    ]);
    expect(transitions.get("a")).toBeUndefined();
    expect(transitions.get("b")).toEqual({ nextBlock: null, hasBreak: true });
    expect(transitions.get("c")).toEqual({
      nextBlock: "Forró",
      hasBreak: true,
    });
    expect(transitions.get("d")).toEqual({
      nextBlock: "Samba",
      hasBreak: false,
    });
    // Markers after the last song lead nowhere.
    expect(transitions.get("e")).toBeUndefined();
  });
});
