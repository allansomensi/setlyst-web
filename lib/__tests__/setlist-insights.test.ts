import { describe, expect, it } from "vitest";
import {
  analyzeSetlist,
  blockDurations,
  dataCoverage,
  entriesFromItems,
  keyChanges,
  type FlowEntry,
  type Insight,
  type InsightCode,
} from "@/lib/setlist-insights";
import type { SetlistItem, SetlistSong } from "@/types/api";

type SongSpec = {
  energy?: number | null;
  tempo?: number | null;
  key?: string | null;
  duration?: number | null;
  title?: string;
};

let counter = 0;
const song = (spec: SongSpec = {}): FlowEntry => ({
  kind: "song",
  title: spec.title ?? `Song ${++counter}`,
  energy: spec.energy === undefined ? 3 : spec.energy,
  tempo: spec.tempo === undefined ? 110 : spec.tempo,
  tonality: spec.key === undefined ? null : spec.key,
  duration: spec.duration === undefined ? 240 : spec.duration,
});
const brk = (minutes: number | null = 15): FlowEntry => ({
  kind: "break",
  label: null,
  durationMinutes: minutes,
});
const block = (name: string): FlowEntry => ({ kind: "block", name });

const codes = (insights: Insight[]) => insights.map((i) => i.code);
const find = (insights: Insight[], code: InsightCode) =>
  insights.filter((i) => i.code === code);

const slow = { energy: 1, tempo: 70 };
const fast = { energy: 5, tempo: 150 };

describe("analyzeSetlist: edge cases", () => {
  it("returns nothing for an empty setlist", () => {
    expect(analyzeSetlist([])).toEqual([]);
  });

  it("returns nothing for a setlist with only markers", () => {
    expect(analyzeSetlist([block("Abertura"), brk()])).toEqual([]);
  });

  it("does not judge opener or closer of a single song", () => {
    const result = analyzeSetlist([song(slow)]);
    expect(codes(result)).not.toContain("weak_opener");
    expect(codes(result)).not.toContain("weak_closer");
  });

  it("reports missing data for a single song without energy", () => {
    const result = analyzeSetlist([song({ energy: null })]);
    expect(codes(result)).toEqual(["missing_data"]);
    expect(result[0].values).toMatchObject({
      missing: 1,
      missingEnergy: 1,
      missingTempo: 0,
      total: 1,
      percent: 100,
    });
    expect(result[0].severity).toBe("high");
  });

  it("praises complete data only from three songs on", () => {
    expect(codes(analyzeSetlist([song(), song()]))).not.toContain(
      "complete_data",
    );
    expect(codes(analyzeSetlist([song(), song(), song()]))).toContain(
      "complete_data",
    );
  });
});

describe("analyzeSetlist: low-energy stretches", () => {
  it("flags three slow, low-energy songs in a row", () => {
    const result = analyzeSetlist([
      song(),
      song(slow),
      song(slow),
      song(slow),
      song(),
    ]);
    const [stretch] = find(result, "low_energy_stretch");
    expect(stretch.range).toEqual([1, 3]);
    expect(stretch.values.count).toBe(3);
    expect(stretch.kind).toBe("improvement");
  });

  it("ignores two slow songs in a row", () => {
    const result = analyzeSetlist([song(), song(slow), song(slow), song()]);
    expect(find(result, "low_energy_stretch")).toHaveLength(0);
  });

  it("needs both low energy and a slow tempo", () => {
    const result = analyzeSetlist([
      song({ energy: 1, tempo: 120 }),
      song({ energy: 1, tempo: 120 }),
      song({ energy: 1, tempo: 120 }),
    ]);
    expect(find(result, "low_energy_stretch")).toHaveLength(0);
  });

  it("is split by a break", () => {
    const result = analyzeSetlist([
      song(slow),
      song(slow),
      brk(),
      song(slow),
      song(slow),
    ]);
    expect(find(result, "low_energy_stretch")).toHaveLength(0);
  });

  it("is not split by a block", () => {
    const result = analyzeSetlist([
      song(),
      song(slow),
      block("Acústico"),
      song(slow),
      song(slow),
    ]);
    expect(find(result, "low_energy_stretch")[0].range).toEqual([1, 3]);
  });

  it("is interrupted by a song with missing data", () => {
    const result = analyzeSetlist([
      song(slow),
      song(slow),
      song({ energy: null, tempo: 70 }),
      song(slow),
    ]);
    expect(find(result, "low_energy_stretch")).toHaveLength(0);
  });

  it("gets high severity when five or more songs long", () => {
    const result = analyzeSetlist([
      song(),
      ...Array.from({ length: 5 }, () => song(slow)),
    ]);
    expect(find(result, "low_energy_stretch")[0].severity).toBe("high");
  });
});

describe("analyzeSetlist: tiring stretches", () => {
  it("flags four fast, high-energy songs in a row", () => {
    const result = analyzeSetlist([
      song(),
      song(fast),
      song(fast),
      song(fast),
      song(fast),
      song(),
    ]);
    const [stretch] = find(result, "tiring_stretch");
    expect(stretch.range).toEqual([1, 4]);
    expect(stretch.values.count).toBe(4);
  });

  it("does not flag three", () => {
    const result = analyzeSetlist([song(fast), song(fast), song(fast)]);
    expect(find(result, "tiring_stretch")).toHaveLength(0);
  });

  it("resets after a break", () => {
    const result = analyzeSetlist([
      song(fast),
      song(fast),
      brk(),
      song(fast),
      song(fast),
    ]);
    expect(find(result, "tiring_stretch")).toHaveLength(0);
  });

  it("counts 130 BPM as fast and energy 4 as high", () => {
    const edge = { energy: 4, tempo: 130 };
    const result = analyzeSetlist([
      song(edge),
      song(edge),
      song(edge),
      song(edge),
    ]);
    expect(find(result, "tiring_stretch")).toHaveLength(1);
  });
});

describe("analyzeSetlist: opener and closer", () => {
  it("flags a weak opener and a weak closer", () => {
    const result = analyzeSetlist([
      song({ energy: 2 }),
      song({ energy: 4 }),
      song({ energy: 1 }),
    ]);
    expect(find(result, "weak_opener")[0].range).toEqual([0, 0]);
    expect(find(result, "weak_closer")[0].range).toEqual([2, 2]);
  });

  it("praises a strong opener and closer", () => {
    const result = analyzeSetlist([
      song({ energy: 5 }),
      song({ energy: 3 }),
      song({ energy: 4 }),
    ]);
    expect(codes(result)).toContain("strong_opener");
    expect(codes(result)).toContain("strong_closer");
    expect(codes(result)).not.toContain("weak_opener");
  });

  it("says nothing when the opener has no energy", () => {
    const result = analyzeSetlist([song({ energy: null }), song(), song()]);
    expect(codes(result)).not.toContain("weak_opener");
    expect(codes(result)).not.toContain("strong_opener");
  });
});

describe("analyzeSetlist: BPM jumps", () => {
  it("flags a jump above 40 BPM between neighbours", () => {
    const result = analyzeSetlist([
      song({ tempo: 80 }),
      song({ tempo: 125 }),
      song({ tempo: 120 }),
    ]);
    const [jump] = find(result, "bpm_jump");
    expect(jump.range).toEqual([0, 1]);
    expect(jump.values).toEqual({ from: 80, to: 125, delta: 45 });
    expect(jump.severity).toBe("low");
  });

  it("does not flag exactly 40 BPM", () => {
    const result = analyzeSetlist([song({ tempo: 80 }), song({ tempo: 120 })]);
    expect(find(result, "bpm_jump")).toHaveLength(0);
  });

  it("accepts a jump across a break or a block", () => {
    expect(
      find(
        analyzeSetlist([song({ tempo: 70 }), brk(), song({ tempo: 160 })]),
        "bpm_jump",
      ),
    ).toHaveLength(0);
    expect(
      find(
        analyzeSetlist([
          song({ tempo: 70 }),
          block("Rock"),
          song({ tempo: 160 }),
        ]),
        "bpm_jump",
      ),
    ).toHaveLength(0);
  });

  it("gives large jumps a higher severity", () => {
    const result = analyzeSetlist([song({ tempo: 70 }), song({ tempo: 150 })]);
    expect(find(result, "bpm_jump")[0].severity).toBe("medium");
  });

  it("ignores songs without BPM", () => {
    const result = analyzeSetlist([
      song({ tempo: 70 }),
      song({ tempo: null }),
      song({ tempo: 160 }),
    ]);
    expect(find(result, "bpm_jump")).toHaveLength(0);
  });

  it("praises smooth transitions when nothing jumps", () => {
    const result = analyzeSetlist(
      [100, 110, 105, 120, 118].map((tempo) => song({ tempo })),
    );
    expect(codes(result)).toContain("smooth_transitions");
  });
});

describe("analyzeSetlist: keys", () => {
  it("flags the same key four times in a row", () => {
    const result = analyzeSetlist([
      song({ key: "G" }),
      song({ key: "D" }),
      song({ key: "D" }),
      song({ key: "D" }),
      song({ key: "D" }),
    ]);
    const [run] = find(result, "same_key_run");
    expect(run.range).toEqual([1, 4]);
    expect(run.values).toEqual({ count: 4, key: "D" });
  });

  it("does not flag three in a row", () => {
    const result = analyzeSetlist([
      song({ key: "D" }),
      song({ key: "D" }),
      song({ key: "D" }),
      song({ key: "E" }),
    ]);
    expect(find(result, "same_key_run")).toHaveLength(0);
  });

  it("praises key variety", () => {
    const result = analyzeSetlist(
      ["C", "G", "Am", "E", "D"].map((key) => song({ key })),
    );
    expect(find(result, "key_variety")[0].values.count).toBe(5);
  });
});

describe("analyzeSetlist: long sets", () => {
  it("flags more than 60 minutes of music without a break", () => {
    const result = analyzeSetlist(
      Array.from({ length: 16 }, () => song({ duration: 240 })),
    );
    const [long] = find(result, "long_set_without_break");
    expect(long.values.minutes).toBe(64);
    expect(long.range).toEqual([0, 15]);
  });

  it("is satisfied by a break in the middle", () => {
    const entries = [
      ...Array.from({ length: 8 }, () => song({ duration: 240 })),
      brk(),
      ...Array.from({ length: 8 }, () => song({ duration: 240 })),
    ];
    expect(
      find(analyzeSetlist(entries), "long_set_without_break"),
    ).toHaveLength(0);
  });

  it("only flags the long part after a break", () => {
    const entries = [
      song({ duration: 600 }),
      brk(),
      ...Array.from({ length: 13 }, () => song({ duration: 300 })),
    ];
    const [long] = find(analyzeSetlist(entries), "long_set_without_break");
    expect(long.range).toEqual([1, 13]);
    expect(long.values.minutes).toBe(65);
  });
});

describe("analyzeSetlist: arc and variety", () => {
  it("detects a set that builds to a peak in the last third", () => {
    const result = analyzeSetlist(
      [2, 3, 3, 3, 4, 5].map((energy) => song({ energy, tempo: 110 })),
    );
    const [arc] = find(result, "good_arc");
    expect(arc.values.peak).toBe(5);
    expect(arc.kind).toBe("strength");
  });

  it("does not see an arc when the peak is early", () => {
    const result = analyzeSetlist(
      [5, 4, 3, 3, 2, 2].map((energy) => song({ energy })),
    );
    expect(find(result, "good_arc")).toHaveLength(0);
  });

  it("needs enough energy data to judge the arc", () => {
    const result = analyzeSetlist(
      [null, null, null, 3, 5].map((energy) => song({ energy })),
    );
    expect(find(result, "good_arc")).toHaveLength(0);
  });

  it("praises a wide tempo spread", () => {
    const result = analyzeSetlist(
      [70, 95, 110, 128, 140].map((tempo) => song({ tempo, energy: 3 })),
    );
    expect(find(result, "tempo_variety")[0].values).toEqual({
      min: 70,
      max: 140,
    });
  });
});

describe("analyzeSetlist: ordering", () => {
  it("lists improvements first, most severe first, then strengths", () => {
    const result = analyzeSetlist([
      song({ energy: 1, tempo: 70 }),
      song({ energy: null, tempo: null }),
      song({ energy: null, tempo: null }),
      song({ energy: 5, tempo: 150 }),
    ]);
    const kinds = result.map((i) => i.kind);
    const firstStrength = kinds.indexOf("strength");
    if (firstStrength >= 0) {
      expect(kinds.slice(firstStrength).every((k) => k === "strength")).toBe(
        true,
      );
    }
    expect(result[0].code).toBe("missing_data");
    expect(result[0].severity).toBe("high");
  });
});

describe("chart helpers", () => {
  it("lists key changes", () => {
    const entries = [
      song({ key: "G" }),
      song({ key: "G" }),
      song({ key: null }),
      song({ key: "D" }),
    ];
    expect(keyChanges(entries)).toEqual([
      { index: 0, key: "G" },
      { index: 3, key: "D" },
    ]);
  });

  it("sums durations per block", () => {
    const entries = [
      song({ duration: 200 }),
      block("Acústico"),
      song({ duration: 100 }),
      song({ duration: null }),
      brk(),
      block("Final"),
    ];
    expect(blockDurations(entries)).toEqual([
      { name: null, songCount: 1, seconds: 200, missing: 0 },
      { name: "Acústico", songCount: 2, seconds: 100, missing: 1 },
      { name: "Final", songCount: 0, seconds: 0, missing: 0 },
    ]);
  });

  it("counts data coverage", () => {
    expect(
      dataCoverage([
        song({ energy: null, key: "C" }),
        song({ tempo: null, duration: 0 }),
      ]),
    ).toEqual({ total: 2, energy: 1, tempo: 1, key: 1, duration: 1 });
  });

  it("converts API items", () => {
    const base = { title: "Asa Branca", energy: 4, tempo: 120 };
    const items = [
      { item_type: "song", position: 1, song: base as unknown as SetlistSong },
      { item_type: "block", position: 2, id: "b", name: "Forró" },
      {
        item_type: "break",
        position: 3,
        id: "c",
        label: null,
        duration_minutes: 10,
      },
    ] as SetlistItem[];
    expect(entriesFromItems(items)).toEqual([
      {
        kind: "song",
        title: "Asa Branca",
        energy: 4,
        tempo: 120,
        tonality: null,
        duration: null,
      },
      { kind: "block", name: "Forró" },
      { kind: "break", label: null, durationMinutes: 10 },
    ]);
  });
});
