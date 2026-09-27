import type { SetlistItem } from "@/types/api";

/** Where a song sits inside its block, for Live Mode's block bar. */
export interface LiveBlockPosition {
  name: string;
  /** 1-based position of the song within the block. */
  index: number;
  /** Songs in the block. */
  total: number;
  /** 1-based number of the block among the setlist's blocks. */
  blockNumber: number;
  blockCount: number;
}

/** What comes between a song and the next one in the running order. */
export interface LiveTransition {
  /** The next song opens this block. */
  nextBlock: string | null;
  /** A break comes first. */
  hasBreak: boolean;
}

export interface LiveBlocks {
  /** By song id; absent for songs before the first block. */
  positions: Map<string, LiveBlockPosition>;
  /** By song id; absent when the next song simply follows. */
  transitions: Map<string, LiveTransition>;
}

const EMPTY: LiveBlocks = { positions: new Map(), transitions: new Map() };

/**
 * Reads the blocks out of a setlist's running order (`/setlists/{id}/items`)
 * so Live Mode can say "Block 2 · 3/5" and warn when the next song opens a
 * new block or comes after a break.
 *
 * A block runs until the next block header; a break doesn't end it (same
 * rule as the setlist analytics, see blockDurations in setlist-insights.ts).
 * Songs before the first block belong to no block. Keyed by song id — a
 * song appears at most once in a setlist — so a running order that is a
 * little out of step with the songs on screen still lines up.
 */
export function liveBlocksFrom(
  items: SetlistItem[] | null | undefined,
): LiveBlocks {
  if (!items?.some((item) => item.item_type === "block")) return EMPTY;

  const blocks: { name: string; songIds: string[] }[] = [];
  const transitions = new Map<string, LiveTransition>();
  let current: { name: string; songIds: string[] } | null = null;
  let lastSongId: string | null = null;
  let pending: LiveTransition = { nextBlock: null, hasBreak: false };

  for (const item of items) {
    if (item.item_type === "block") {
      current = { name: item.name, songIds: [] };
      blocks.push(current);
      pending = { ...pending, nextBlock: item.name };
    } else if (item.item_type === "break") {
      pending = { ...pending, hasBreak: true };
    } else {
      if (lastSongId && (pending.nextBlock || pending.hasBreak)) {
        transitions.set(lastSongId, pending);
      }
      current?.songIds.push(item.song.id);
      lastSongId = item.song.id;
      pending = { nextBlock: null, hasBreak: false };
    }
  }

  const positions = new Map<string, LiveBlockPosition>();
  blocks.forEach((block, blockIndex) => {
    block.songIds.forEach((songId, index) => {
      positions.set(songId, {
        name: block.name,
        index: index + 1,
        total: block.songIds.length,
        blockNumber: blockIndex + 1,
        blockCount: blocks.length,
      });
    });
  });

  return { positions, transitions };
}
