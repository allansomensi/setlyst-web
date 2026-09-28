import { describe, expect, it } from "vitest";
import { parseChordPro } from "@/lib/music/chordpro";
import {
  addConnection,
  addRangeNote,
  alignChords,
  buildSheet,
  compactAnalysis,
  copyDegree,
  emptyAnalysis,
  footnotes,
  formatDegree,
  keyAt,
  normalizeAnalysis,
  parseDegree,
  reconcile,
  sameChordTargets,
  setEntry,
  setKeyMark,
} from "@/lib/music/analysis";

const chart = [
  "[Verse]",
  "[Dm7]Hello [G7]old [C7M]friend",
  "[A7]here we [Dm7]go",
  "",
  "[Chorus]",
  "[Fm6] [C7M]",
].join("\n");

const sheetOf = (content: string) => buildSheet(parseChordPro(content));

describe("buildSheet", () => {
  it("numbers every chord in reading order", () => {
    const { chords, lines } = sheetOf(chart);
    expect(chords.map((c) => c.symbol)).toEqual([
      "Dm7",
      "G7",
      "C7M",
      "A7",
      "Dm7",
      "Fm6",
      "C7M",
    ]);
    expect(chords.map((c) => c.index)).toEqual([0, 1, 2, 3, 4, 5, 6]);
    expect(chords[0].lyric).toBe("Hello ");
    expect(lines[0]).toMatchObject({ kind: "heading", section: "verse" });
    expect(lines.at(-1)).toMatchObject({ kind: "chords", bare: true });
  });
});

describe("degrees", () => {
  it("parses and formats what musicians type", () => {
    expect(parseDegree("V7/II")).toEqual({
      sub: false,
      accidental: "",
      numeral: "V",
      quality: "7",
      target: "II",
    });
    expect(parseDegree("SubV7/IIm")).toMatchObject({
      sub: true,
      numeral: "V",
      target: "IIm",
    });
    expect(parseDegree("bVII7")).toMatchObject({
      accidental: "b",
      numeral: "VII",
      quality: "7",
    });
    expect(parseDegree("♭VI7M")).toMatchObject({
      accidental: "b",
      numeral: "VI",
      quality: "7M",
    });
    expect(parseDegree("IIm7(b5)")).toMatchObject({
      numeral: "II",
      quality: "m7(b5)",
    });
    expect(parseDegree("IV")).toMatchObject({ numeral: "IV", quality: "" });
    expect(parseDegree("VII°")).toMatchObject({ numeral: "VII", quality: "°" });
    expect(parseDegree("hello")).toBeNull();
    expect(formatDegree(parseDegree("subv7/ii"))).toBe("SubV7/II");
  });
});

describe("normalizeAnalysis", () => {
  it("keeps a valid document and drops everything malformed", () => {
    const analysis = normalizeAnalysis({
      schema: 1,
      chords: ["G7", 3],
      entries: {
        "0": {
          degree: { numeral: "V", quality: "7" },
          fn: "D",
          badges: ["aem", "bogus", "aem"],
        },
        "1": { degree: { numeral: "IX" } },
        "-1": { note: "x" },
        abc: { note: "x" },
      },
      connections: [
        { id: "a", from: 0, to: 1, kind: "dominant" },
        { from: 1, to: 1, kind: "dominant" },
        { from: 0, to: "2" },
      ],
      keys: [
        { at: 0, key: "G" },
        { at: 3, key: "H" },
      ],
      notes: [{ id: "n", from: 3, to: 1, text: "cadence", color: "sky" }],
      display: { showLyrics: false, twoFiveStyle: "zigzag" },
    });
    expect(analysis.chords).toEqual(["G7", ""]);
    expect(Object.keys(analysis.entries)).toEqual(["0"]);
    expect(analysis.entries["0"]).toMatchObject({ fn: "D", badges: ["aem"] });
    expect(analysis.connections).toEqual([
      { id: "a", from: 0, to: 1, kind: "dominant" },
    ]);
    expect(analysis.keys).toEqual([{ at: 0, key: "G" }]);
    expect(analysis.notes[0]).toMatchObject({ from: 1, to: 3, color: "sky" });
    expect(analysis.display).toEqual({
      showLyrics: false,
      showChords: true,
      showFunctions: false,
      twoFiveStyle: "bracket",
    });
    expect(normalizeAnalysis("nope")).toEqual(emptyAnalysis());
  });
});

describe("editing", () => {
  it("adds and removes marks, and compacts before saving", () => {
    let a = emptyAnalysis();
    a = setEntry(a, 1, { degree: parseDegree("V7"), fn: "D" });
    a = setEntry(a, 2, { note: "" });
    a = addConnection(a, 1, 2, "dominant");
    a = addConnection(a, 1, 2, "dominant");
    a = setKeyMark(a, 0, "C");
    a = setKeyMark(a, 0, null);
    expect(Object.keys(a.entries)).toEqual(["1"]);
    expect(a.connections).toHaveLength(1);
    expect(a.keys).toEqual([]);

    a = addConnection(a, 1, 9, "subV");
    const compact = compactAnalysis(a, 5);
    expect(compact.connections).toHaveLength(1);
  });

  it("copies a degree only to identical, unanalysed chords in the same key", () => {
    const chords = ["G7", "C", "G7", "G7", "G7"];
    let a = emptyAnalysis(chords);
    a = setEntry(a, 0, { degree: parseDegree("V7"), fn: "D" });
    a = setEntry(a, 3, { degree: parseDegree("V7/IV") });
    a = setKeyMark(a, 4, "F");
    const targets = sameChordTargets(a, chords, 0, "C");
    expect(targets).toEqual([2]);
    a = copyDegree(a, 0, targets);
    expect(formatDegree(a.entries["2"].degree)).toBe("V7");
    expect(a.entries["2"].fn).toBe("D");
  });

  it("tracks the key in force at each chord", () => {
    const a = setKeyMark(emptyAnalysis(), 4, "Em");
    expect(keyAt(a, 0, "G")).toBe("G");
    expect(keyAt(a, 4, "G")).toBe("Em");
    expect(keyAt(a, 9, "G")).toBe("Em");
  });

  it("numbers chord and passage notes together, in song order", () => {
    let a = emptyAnalysis();
    a = setEntry(a, 5, { note: "second" });
    a = addRangeNote(a, 1, 3, "amber", "p1").analysis;
    a = setEntry(a, 0, { note: "first" });
    expect(footnotes(a).map((n) => [n.number, n.kind, n.at])).toEqual([
      [1, "chord", 0],
      [2, "range", 1],
      [3, "chord", 5],
    ]);
  });
});

describe("reconcile", () => {
  it("aligns chord sequences on their longest common subsequence", () => {
    expect(
      alignChords(["A", "B", "C", "D"], ["A", "X", "B", "C", "D"]),
    ).toEqual([0, 2, 3, 4]);
    expect(alignChords(["A", "B", "C"], ["A", "C"])).toEqual([0, -1, 1]);
  });

  it("moves marks with their chords when the chart is edited", () => {
    let a = emptyAnalysis(["Dm7", "G7", "C7M"]);
    a = setEntry(a, 0, { degree: parseDegree("IIm7") });
    a = setEntry(a, 1, { degree: parseDegree("V7") });
    a = setEntry(a, 2, { degree: parseDegree("I7M") });
    a = addConnection(a, 1, 2, "dominant", "c1");
    a = addConnection(a, 0, 1, "twoFive", "c2");
    a = setKeyMark(a, 2, "C");
    a = addRangeNote(a, 0, 2, "sky", "n1").analysis;

    // An intro chord was added, and the Dm7 was rewritten as Dm9.
    const result = reconcile(a, ["Am7", "Dm9", "G7", "C7M"]);
    expect(result.changed).toBe(true);
    expect(result.lost).toBe(2); // Dm7's degree and the II–V bracket.
    const next = result.analysis;
    expect(formatDegree(next.entries["2"].degree)).toBe("V7");
    expect(formatDegree(next.entries["3"].degree)).toBe("I7M");
    expect(next.connections).toEqual([
      { id: "c1", from: 2, to: 3, kind: "dominant" },
    ]);
    expect(next.keys).toEqual([{ at: 3, key: "C" }]);
    expect(next.notes[0]).toMatchObject({ from: 2, to: 3 });
    expect(next.chords).toEqual(["Am7", "Dm9", "G7", "C7M"]);
  });

  it("leaves an unchanged chart alone", () => {
    const a = setEntry(emptyAnalysis(["C", "G"]), 1, { fn: "D" });
    const result = reconcile(a, ["C", "G"]);
    expect(result).toMatchObject({ changed: false, lost: 0 });
    expect(result.analysis.entries).toEqual(a.entries);
  });
});
