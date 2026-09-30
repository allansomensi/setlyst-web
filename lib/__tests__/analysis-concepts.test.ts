import { describe, expect, it } from "vitest";
import {
  emptyAnalysis,
  parseDegree,
  setEntry,
  setKeyMark,
  type HarmonicAnalysis,
} from "@/lib/music/analysis";
import {
  describeDegree,
  findPatterns,
  qualityOf,
  resolutionOf,
  roleInPatterns,
  rootOf,
} from "@/lib/music/analysis-concepts";

const d = (text: string) => parseDegree(text)!;

/** An analysis of `degrees`, one chord each ("" leaves a chord blank). */
function analysed(degrees: string[]): HarmonicAnalysis {
  let analysis = emptyAnalysis(degrees.map((_, i) => `X${i}`));
  degrees.forEach((text, i) => {
    if (text) analysis = setEntry(analysis, i, { degree: d(text) });
  });
  return analysis;
}

describe("reading a degree", () => {
  it("tells chord qualities apart", () => {
    expect(qualityOf("")).toBe("major");
    expect(qualityOf("7M")).toBe("major");
    expect(qualityOf("6")).toBe("major");
    expect(qualityOf("m7")).toBe("minor");
    expect(qualityOf("m")).toBe("minor");
    expect(qualityOf("m7(b5)")).toBe("halfDiminished");
    expect(qualityOf("m(b5)")).toBe("halfDiminished");
    expect(qualityOf("°")).toBe("diminished");
    expect(qualityOf("7(b9)")).toBe("dominant");
    expect(qualityOf("7sus4")).toBe("dominant");
    expect(qualityOf("+")).toBe("augmented");
    expect(qualityOf("sus4")).toBe("suspended");
  });

  it("places roots and resolutions above the tonic", () => {
    expect(rootOf(d("V7/IV"))).toBe(0);
    expect(rootOf(d("IIm7/IV"))).toBe(7);
    expect(rootOf(d("SubV7/II"))).toBe(3);
    expect(rootOf(d("SubV7"))).toBe(1);
    expect(rootOf(d("bVII7"))).toBe(10);
    expect(resolutionOf(d("V7/II"))).toBe(2);
    expect(resolutionOf(d("V7"))).toBe(0);
    expect(resolutionOf(d("SubV7/bVI"))).toBe(8);
    expect(resolutionOf(d("IIm7"))).toBeNull();
  });

  it("names degrees in a major key", () => {
    const name = (text: string) => describeDegree(d(text), false);
    expect(name("I7M")).toEqual({ id: "tonic", fn: "T" });
    expect(name("I")).toEqual({ id: "tonic", fn: "T" });
    expect(name("VIm7")?.id).toBe("tonicRelative");
    expect(name("IIIm")?.id).toBe("tonicAntiRelative");
    expect(name("IIm7")?.id).toBe("subdominantRelative");
    expect(name("IVm6")?.id).toBe("subdominantMinor");
    expect(name("V7")?.id).toBe("dominant");
    expect(name("V")?.id).toBe("dominant");
    expect(name("VIIm7(b5)")?.id).toBe("dominantNoRoot");
    expect(name("V7/VI")).toEqual({
      id: "secondaryDominant",
      target: "VI",
      fn: "D",
    });
    expect(name("IIm7/IV")).toEqual({
      id: "relatedTwo",
      target: "IV",
      fn: "SD",
    });
    expect(name("SubV7")?.id).toBe("substituteDominant");
    expect(name("SubV7/II")?.id).toBe("secondarySubstitute");
    expect(name("VII°/II")?.id).toBe("secondaryLeadingTone");
    expect(name("#I°")).toEqual({
      id: "diminishedAscending",
      target: "II",
      fn: "D",
    });
    expect(name("bIII°")?.id).toBe("diminishedDescending");
    expect(name("I°")?.id).toBe("diminishedAuxiliary");
    expect(name("bVII7")?.id).toBe("modalBorrowing");
    expect(name("bVI7M")?.id).toBe("modalBorrowing");
    expect(name("bII7M")?.id).toBe("neapolitan");
    expect(name("VI7")).toEqual({
      id: "secondaryDominant",
      target: "II",
      fn: "D",
    });
    expect(name("I7")?.target).toBe("IV");
    expect(name("bII7")?.id).toBe("substituteDominant");
  });

  it("names degrees in a minor key", () => {
    const name = (text: string) => describeDegree(d(text), true);
    expect(name("Im7")?.id).toBe("tonic");
    expect(name("bIII7M")?.id).toBe("relativeMajor");
    expect(name("IIm7(b5)")?.id).toBe("subdominantRelative");
    expect(name("IVm")?.id).toBe("subdominant");
    expect(name("V7")?.id).toBe("dominantMinorKey");
    expect(name("Vm7")?.id).toBe("minorFive");
    expect(name("bVII7")?.id).toBe("subtonic");
    expect(name("VII°")?.id).toBe("dominantNoRoot");
  });
});

describe("naming passages", () => {
  it("finds a secondary II–V and names its II", () => {
    // In C: Gm7 C7 F7M — a II–V to the IV, resolved.
    const analysis = analysed(["I7M", "IIm7/IV", "V7/IV", "IV7M"]);
    const patterns = findPatterns(analysis, 4);
    expect(patterns).toContainEqual({
      id: "twoFiveSecondary",
      chords: [1, 2, 3],
      target: "IV",
      resolved: true,
    });
    expect(roleInPatterns(patterns, 1)).toEqual({
      id: "relatedTwo",
      target: "IV",
      fn: "SD",
    });
  });

  it("recognises the same II–V however it was spelled", () => {
    // IIIm7 → VI7 → IIm7 is a II–V to the II, like IIm7/II → V7/II.
    expect(findPatterns(analysed(["IIIm7", "VI7", "IIm7"]), 3)[0]).toEqual({
      id: "twoFiveSecondary",
      chords: [0, 1, 2],
      target: "II",
      resolved: true,
    });
    const written = findPatterns(analysed(["IIIm7", "V7/II", "IIm7"]), 3);
    expect(written[0]).toMatchObject({
      id: "twoFiveSecondary",
      chords: [0, 1, 2],
      target: "II",
    });
  });

  it("finds the primary II–V–I", () => {
    const patterns = findPatterns(analysed(["IIm7", "V7", "I7M"]), 3);
    // The V → I isn't listed again as a perfect cadence.
    expect(patterns.map((p) => p.id)).toEqual(["twoFive"]);
    expect(patterns[0]).toMatchObject({ chords: [0, 1, 2], resolved: true });
  });

  it("finds II–SubV and extended dominants", () => {
    const sub = findPatterns(analysed(["IIm7", "SubV7", "I7M"]), 3);
    expect(sub[0]).toMatchObject({ id: "twoSubV", chords: [0, 1, 2] });

    const chain = findPatterns(
      analysed(["V7/VI", "V7/II", "V7/V", "V7", "I"]),
      5,
    );
    expect(chain).toContainEqual({
      id: "extendedDominants",
      chords: [0, 1, 2, 3],
    });
  });

  it("finds deceptive, plagal and backdoor cadences", () => {
    const ids = (degrees: string[]) =>
      findPatterns(analysed(degrees), degrees.length).map((p) => p.id);
    expect(ids(["V7", "VIm7"])).toEqual(["deceptiveCadence"]);
    expect(ids(["IV7M", "I7M"])).toEqual(["plagalCadence"]);
    expect(ids(["IVm6", "I7M"])).toEqual(["plagalCadence"]);
    expect(ids(["bVII7", "I7M"])).toEqual(["backdoorCadence"]);
  });

  it("reads past blank chords but not across a key change", () => {
    expect(findPatterns(analysed(["IIm7", "", "V7", "I"]), 4)[0]).toMatchObject(
      { id: "twoFive", chords: [0, 2, 3] },
    );
    const changed = setKeyMark(analysed(["IIm7", "V7", "I"]), 1, "G");
    expect(findPatterns(changed, 3)).toEqual([
      { id: "perfectCadence", chords: [1, 2] },
    ]);
  });
});
