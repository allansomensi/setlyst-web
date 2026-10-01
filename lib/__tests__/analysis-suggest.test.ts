import { describe, expect, it } from "vitest";
import {
  emptyAnalysis,
  formatDegree,
  parseDegree,
  setEntry,
  setKeyMark,
  type SheetSection,
} from "@/lib/music/analysis";
import {
  applySuggestions,
  detectKey,
  suggestAnalysis,
  suggestKeyChanges,
} from "@/lib/music/analysis-suggest";

const read = (chords: string[], key: string) => {
  const result = suggestAnalysis(chords, emptyAnalysis(chords), key);
  return {
    degrees: result.chords.map((s) => formatDegree(s.degree)),
    reasons: result.chords.map((s) => s.reason),
    badges: result.chords.map((s) => s.badges),
    fns: result.chords.map((s) => s.fn),
    connections: result.connections.map((c) => `${c.kind}:${c.from}-${c.to}`),
  };
};

describe("detecting the key", () => {
  it("finds the key of a plain progression", () => {
    expect(detectKey(["C", "G", "Am", "F", "C", "G", "F", "C"])[0].key).toBe(
      "C",
    );
    expect(detectKey(["G", "D/F#", "Em", "C", "Am7", "D7", "G"])[0].key).toBe(
      "G",
    );
  });

  it("tells a minor key from its relative major", () => {
    const [best] = detectKey([
      "Am",
      "Dm",
      "E7",
      "Am",
      "F",
      "G",
      "C",
      "E7",
      "Am",
    ]);
    expect(best.key).toBe("Am");
    expect(best.confidence).toBeGreaterThan(0.5);
  });

  it("suggests where a section moves to another key and back", () => {
    const chords = [
      ...["C", "Am", "Dm", "G7", "C"],
      ...["E", "A", "B7", "E", "C#m", "F#m", "B7", "E"],
      ...["C", "F", "G7", "C"],
    ];
    const sections: SheetSection[] = [
      { section: "verse", heading: null, raw: "", chords: [0, 1, 2, 3, 4] },
      {
        section: "chorus",
        heading: null,
        raw: "",
        chords: [5, 6, 7, 8, 9, 10, 11, 12],
      },
      { section: "verse", heading: null, raw: "", chords: [13, 14, 15, 16] },
    ];
    expect(suggestKeyChanges(sections, chords, "C")).toEqual([
      { at: 5, key: "E", from: "C", section: 1 },
      { at: 13, key: "C", from: "E", section: 2 },
    ]);
  });
});

describe("suggesting degrees in context", () => {
  it("reads dominants by where they resolve", () => {
    const { degrees, reasons, connections } = read(
      ["C7M", "A7", "Dm7", "G7", "C7M", "Gm7", "C7", "F7M", "Db7", "C7M"],
      "C",
    );
    expect(degrees).toEqual([
      "I7M",
      "V7/II",
      "IIm7",
      "V7",
      "I7M",
      "IIm7/IV",
      "V7/IV",
      "IV7M",
      "SubV7",
      "I7M",
    ]);
    expect(reasons[5]).toBe("relatedTwo");
    expect(read(["Em7", "A7", "Dm7"], "C").fns[0]).toBe("SD");
    expect(connections).toEqual([
      "dominant:1-2",
      "twoFive:2-3",
      "dominant:3-4",
      "twoFive:5-6",
      "dominant:6-7",
      "subV:8-9",
    ]);
  });

  it("tells diminished chords apart by how they move", () => {
    const { degrees, badges } = read(
      ["C", "C#°", "Dm7", "G7", "C", "C°", "C", "Eb°", "Dm7"],
      "C",
    );
    expect(degrees[1]).toBe("#I°");
    expect(badges[1]).toEqual(["dimAsc"]);
    expect(degrees[5]).toBe("I°");
    expect(badges[5]).toEqual(["dimAux"]);
    expect(degrees[7]).toBe("bIII°");
    expect(badges[7]).toEqual(["dimDesc"]);
  });

  it("marks borrowed chords, clichés and pedals", () => {
    const borrowed = read(["C", "Fm6", "C", "Ab", "Bb7", "C"], "C");
    expect(borrowed.badges[1]).toEqual(["aem"]);
    expect(borrowed.badges[3]).toEqual(["aem"]);
    expect(borrowed.reasons[4]).toBe("backdoor");

    const cliche = read(["Am", "Am7M", "Am7", "Am6"], "Am");
    expect(cliche.badges.every((b) => b.includes("cliche"))).toBe(true);

    const pedal = read(["C", "F/C", "G/C", "C"], "C");
    expect(pedal.badges[1]).toContain("pedal");
    expect(pedal.badges[2]).toContain("pedal");
  });

  it("reads a minor key's own degrees", () => {
    const { degrees, fns } = read(
      ["Am", "Dm", "E7", "Am", "F", "G", "C"],
      "Am",
    );
    expect(degrees).toEqual(["Im", "IVm", "V7", "Im", "bVI", "bVII", "bIII"]);
    expect(fns).toEqual(["T", "SD", "D", "T", "SD", "SD", "T"]);
  });

  it("follows the key marks", () => {
    const chords = ["C", "G7", "C", "D", "A7", "D"];
    const analysis = setKeyMark(emptyAnalysis(chords), 3, "D");
    const result = suggestAnalysis(chords, analysis, "C");
    expect(result.chords.map((s) => formatDegree(s.degree))).toEqual([
      "I",
      "V7",
      "I",
      "I",
      "V7",
      "I",
    ]);
  });
});

describe("applying suggestions", () => {
  const chords = ["Dm7", "G7", "C7M"];

  it("fills only what's empty unless told to overwrite", () => {
    let analysis = emptyAnalysis(chords);
    analysis = setEntry(analysis, 0, { degree: parseDegree("IIm9")! });
    const suggestions = suggestAnalysis(chords, analysis, "C");
    const options = {
      overwrite: false,
      degrees: true,
      functions: true,
      marks: true,
      connections: true,
    };
    const { analysis: filled, counts } = applySuggestions(
      analysis,
      suggestions,
      options,
    );
    expect(formatDegree(filled.entries["0"].degree)).toBe("IIm9");
    expect(formatDegree(filled.entries["1"].degree)).toBe("V7");
    expect(counts.degrees).toBe(2);
    expect(counts.connections).toBe(2);

    const { analysis: overwritten } = applySuggestions(analysis, suggestions, {
      ...options,
      overwrite: true,
    });
    expect(formatDegree(overwritten.entries["0"].degree)).toBe("IIm7");
  });

  it("keeps to a range and never doubles a line", () => {
    const analysis = emptyAnalysis(chords);
    const suggestions = suggestAnalysis(chords, analysis, "C");
    const options = {
      overwrite: false,
      degrees: true,
      functions: false,
      marks: false,
      connections: true,
      range: [1, 2] as [number, number],
    };
    const once = applySuggestions(analysis, suggestions, options).analysis;
    expect(Object.keys(once.entries)).toEqual(["1", "2"]);
    expect(once.connections).toHaveLength(1);
    const twice = applySuggestions(once, suggestions, options);
    expect(twice.counts.connections).toBe(0);
  });
});
