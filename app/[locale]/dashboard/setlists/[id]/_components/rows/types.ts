import type { SetlistItem, SetlistSong } from "@/types/api";

/**
 * One row of the running order as the manager renders it: a song, a
 * block heading or a break.
 */
export type Row =
  | { kind: "song"; id: string; song: SetlistSong }
  | { kind: "block"; id: string; name: string }
  | {
      kind: "break";
      id: string;
      label: string | null;
      durationMinutes: number | null;
    };

export type SongRow = Extract<Row, { kind: "song" }>;
export type BlockRow = Extract<Row, { kind: "block" }>;
export type BreakRow = Extract<Row, { kind: "break" }>;

export function itemsToRows(items: SetlistItem[]): Row[] {
  return items.map((item) => {
    if (item.item_type === "song") {
      return { kind: "song", id: item.song.id, song: item.song };
    }
    if (item.item_type === "block") {
      return { kind: "block", id: item.id, name: item.name };
    }
    return {
      kind: "break",
      id: item.id,
      label: item.label,
      durationMinutes: item.duration_minutes,
    };
  });
}

/** 1-based position of each song, skipping blocks and breaks. */
export function songNumbersOf(rows: Row[]): Map<string, number> {
  const numbers = new Map<string, number>();
  let counter = 0;
  for (const row of rows) {
    if (row.kind === "song") numbers.set(row.id, ++counter);
  }
  return numbers;
}
