import { describe, expect, it } from "vitest";
import { parseChordPro } from "@/lib/music/chordpro";
import {
  addConnection,
  buildSheet,
  emptyAnalysis,
  parseDegree,
  setEntry,
  sheetSections,
  type HarmonicAnalysis,
} from "@/lib/music/analysis";
import {
  analysisStats,
  analysisToMarkdown,
  progressionBySection,
  readChords,
  recurringProgressions,
  reviewAnalysis,
} from "@/lib/music/analysis-insights";
import { suggestAnalysis } from "@/lib/music/analysis-suggest";
import { findPatterns } from "@/lib/music/analysis-concepts";

function analysed(chords: string[], degrees: string[]): HarmonicAnalysis {
  let analysis = emptyAnalysis(chords);
  degrees.forEach((text, i) => {
    if (text) analysis = setEntry(analysis, i, { degree: parseDegree(text)! });
  });
  return analysis;
}

describe("sections", () => {
  it("groups the chart's chords by section", () => {
    const { lines } = buildSheet(
      parseChordPro("[G]Intro\n[Verse]\n[C]one [D]two\n[Chorus]\n[Em]three"),
    );
    const sections = sheetSections(lines);
    expect(sections.map((s) => [s.section, s.chords])).toEqual([
      [null, [0]],
      ["verse", [1, 2]],
      ["chorus", [3]],
    ]);
  });
});

describe("statistics", () => {
  it("doesn't call a chart with nothing categorised complex", () => {
    for (const chords of [[], ["N.C."]]) {
      const stats = analysisStats(emptyAnalysis(chords), chords, null);
      expect(stats.complexity.score).toBeLessThan(20);
    }
  });

  const chords = ["C7M", "A7", "Dm7", "G7", "C7M", "A7", "Dm7", "G7", "C7M"];

  it("counts functions, categories and progressions", () => {
    const analysis = analysed(chords, [
      "I7M",
      "V7/II",
      "IIm7",
      "V7",
      "I7M",
      "V7/II",
      "IIm7",
      "V7",
      "I7M",
    ]);
    const stats = analysisStats(analysis, chords, "C");
    expect(stats.analysed).toBe(9);
    expect(stats.functions).toEqual({ T: 3, SD: 2, D: 4, none: 0 });
    expect(stats.categories.secondaryDominant).toBe(2);
    expect(stats.categories.diatonic).toBe(7);
    expect(stats.degrees[0]).toEqual({ label: "I7M", count: 3 });
    expect(stats.transitions["D>SD"]).toBe(2);
    expect(stats.motions.fourthUp).toBe(6);
    // Occurrences never overlap: the I7M that ends one starts the next.
    expect(stats.progressions[0]).toEqual({
      labels: ["I7M", "V7/II", "IIm7", "V7"],
      starts: [0, 4],
    });
    expect(stats.regions).toEqual([{ key: "C", from: 0, to: 8 }]);
  });

  it("stands in the assistant's reading for chords not analysed", () => {
    const analysis = emptyAnalysis(chords);
    const { chords: suggestions } = suggestAnalysis(chords, analysis, "C");
    const readings = readChords(analysis, chords, "C", suggestions);
    expect(readings.every((r) => r.inferred)).toBe(true);
    const stats = analysisStats(analysis, chords, "C", suggestions);
    expect(stats.analysed).toBe(0);
    expect(stats.inferred).toBe(9);
  });

  it("finds repeated progressions, longest first", () => {
    const found = recurringProgressions([
      "I",
      "VIm",
      "IV",
      "V",
      "I",
      "VIm",
      "IV",
      "V",
      null,
      "IV",
      "V",
    ]);
    expect(found[0]).toEqual({
      labels: ["I", "VIm", "IV", "V"],
      starts: [0, 4],
    });
    // "IV V" is also heard on its own, so it is listed too.
    expect(found[1]).toEqual({ labels: ["IV", "V"], starts: [2, 6, 9] });
  });

  it("recognises turnarounds and Andalusian cadences", () => {
    const turnaround = analysed(
      ["C", "A7", "Dm7", "G7"],
      ["I", "V7/II", "IIm7", "V7"],
    );
    expect(findPatterns(turnaround, 4).map((p) => p.id)).toContain(
      "turnaround",
    );
    const andalusian = analysed(
      ["Am", "G", "F", "E7"],
      ["Im", "bVII", "bVI", "V7"],
    );
    expect(findPatterns(andalusian, 4).map((p) => p.id)).toContain(
      "andalusian",
    );
  });
});

describe("review", () => {
  it("flags degrees that don't match their chord", () => {
    const chords = ["C", "Am", "Dm7"];
    const analysis = analysed(chords, ["I", "IV", "II7"]);
    const issues = reviewAnalysis(analysis, chords, "C");
    expect(issues.map((i) => [i.id, i.at])).toEqual([
      ["rootMismatch", 1],
      ["qualityMismatch", 2],
    ]);
  });

  it("flags arrows that don't resolve as drawn", () => {
    const chords = ["G7", "Am", "Db7", "C"];
    let analysis = analysed(chords, ["V7", "VIm", "SubV7", "I"]);
    analysis = addConnection(analysis, 0, 1, "dominant", "a");
    analysis = addConnection(analysis, 2, 3, "subV", "b");
    const issues = reviewAnalysis(analysis, chords, "C");
    expect(issues.map((i) => i.id)).toEqual(["dominantTarget"]);
  });

  it("checks a dominant against the chord that follows it", () => {
    // Only the dominants analysed: A7 does resolve to Dm7, written or not.
    const chords = ["C", "A7", "Dm7", "G7", "C"];
    const analysis = analysed(chords, ["", "V7/II", "", "V7", ""]);
    const suggestions = suggestAnalysis(chords, analysis, "C").chords;
    expect(reviewAnalysis(analysis, chords, "C", suggestions)).toEqual([]);
    // A dominant held on for another bar resolves after it.
    for (const [held, degree] of [
      [["A7", "A7", "Dm7"], "V7/II"],
      [["E7", "E7(b9)", "Am"], "V7/VI"],
    ] as const) {
      const heldAnalysis = analysed([...held], [degree, "", ""]);
      const heldSuggestions = suggestAnalysis(
        [...held],
        heldAnalysis,
        "C",
      ).chords;
      expect(
        reviewAnalysis(heldAnalysis, [...held], "C", heldSuggestions).filter(
          (i) => i.id === "unresolved",
        ),
      ).toEqual([]);
    }
    // A real non-resolution is still flagged.
    const wrong = analysed(["A7", "C"], ["V7/II", "I"]);
    expect(
      reviewAnalysis(wrong, ["A7", "C"], "C").map((i) => [i.id, i.at]),
    ).toEqual([["unresolved", 0]]);
  });

  it("notices a missing key and empty passages", () => {
    const chords = ["C", "G"];
    let analysis = analysed(chords, ["I", "V"]);
    analysis = {
      ...analysis,
      notes: [{ id: "n", from: 0, to: 1, text: "", color: "amber" }],
    };
    expect(reviewAnalysis(analysis, chords, null).map((i) => i.id)).toEqual([
      "noKey",
      "emptyPassage",
    ]);
  });
});

describe("text export", () => {
  it("writes the progression section by section", () => {
    const { lines } = buildSheet(parseChordPro("[Verse]\n[Dm7]a [G7]b [C7M]c"));
    const chords = ["Dm7", "G7", "C7M"];
    const analysis = analysed(chords, ["IIm7", "V7", "I7M"]);
    const sections = progressionBySection(
      sheetSections(lines),
      readChords(analysis, chords, "C"),
    );
    const text = analysisToMarkdown(
      {
        title: "Song",
        artist: "Band",
        songKey: "C",
        sections,
        patternCount: 1,
        footnoteCount: 0,
        summary: "Bossa.",
      },
      {
        title: "Harmony",
        key: (k) => `Key ${k}`,
        section: () => "Verse",
        summary: "Summary",
        notes: "Notes",
        patterns: "Cadences",
        pattern: () => "II–V–I",
        footnote: () => "",
      },
    );
    expect(text).toContain("_Band · Key C_");
    expect(text).toContain(
      "### Verse\n\nDm7 → IIm7 (SD) · G7 → V7 (D) · C7M → I7M (T)",
    );
    expect(text).toContain("- II–V–I");
    expect(text).toContain("## Summary\n\nBossa.");
  });
});
