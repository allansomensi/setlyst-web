import { describe, expect, it } from "vitest";
import { parseDegree, styleQuality } from "@/lib/music/analysis";
import {
  chordForDegree,
  chordScale,
  chordShape,
  degreeQuality,
  fieldsFor,
  harmonicField,
  identifyScale,
  plainSpelling,
  spellInterval,
} from "@/lib/music/analysis-theory";

const d = (text: string) => parseDegree(text)!;
const shape = (symbol: string) => chordShape(symbol)!;

describe("chord shapes", () => {
  it("reads the family of what's written", () => {
    expect(shape("G7").family).toBe("dominant");
    expect(shape("G7sus4").family).toBe("dominant");
    expect(shape("C7M").family).toBe("major");
    expect(shape("Cmaj7").family).toBe("major");
    expect(shape("Am7").family).toBe("minor");
    expect(shape("Bm7(b5)").family).toBe("halfDiminished");
    expect(shape("C#°").family).toBe("diminished");
    expect(shape("C+").family).toBe("augmented");
    expect(chordShape("N.C.")).toBeNull();
  });

  it("writes degree qualities the Brazilian way", () => {
    expect(degreeQuality(shape("Cmaj7"))).toBe("7M");
    expect(degreeQuality(shape("Am7M"))).toBe("m7M");
    expect(degreeQuality(shape("Bm7b5"))).toBe("m7(b5)");
    expect(degreeQuality(shape("Fm6"))).toBe("m6");
    expect(degreeQuality(shape("G7(b9)"), "written", { tensions: true })).toBe(
      "7(b9)",
    );
    expect(degreeQuality(shape("G7(b9)"))).toBe("7");
    expect(degreeQuality(shape("C"), "tetrads")).toBe("7M");
    expect(degreeQuality(shape("G"), "tetrads", { seventhHint: "minor" })).toBe(
      "7",
    );
    expect(degreeQuality(shape("Dm7"), "triads")).toBe("m");
  });

  it("prints qualities in either notation", () => {
    expect(styleQuality("7M", "intl")).toBe("maj7");
    expect(styleQuality("m7(b5)", "intl")).toBe("m7b5");
    expect(styleQuality("°", "intl")).toBe("°7");
    expect(styleQuality("7M", "br")).toBe("7M");
  });
});

describe("spelling", () => {
  it("spells intervals by letter", () => {
    expect(spellInterval("E", 2, 4)).toBe("G#");
    expect(spellInterval("Eb", 6, 10)).toBe("Db");
    expect(plainSpelling("Fb", true)).toBe("E");
    expect(plainSpelling("Bbb", true)).toBe("A");
    expect(plainSpelling("Eb", true)).toBe("Eb");
  });

  it("finds the chord a degree stands for", () => {
    expect(chordForDegree(d("V7/II"), "C")).toBe("A7");
    expect(chordForDegree(d("SubV7/II"), "C")).toBe("Eb7");
    expect(chordForDegree(d("SubV7"), "Eb")).toBe("E7");
    expect(chordForDegree(d("bVII7"), "Eb")).toBe("Db7");
    expect(chordForDegree(d("IIm7/IV"), "C")).toBe("Gm7");
    expect(chordForDegree(d("VII°"), "F#m")).toBe("E#°");
  });
});

describe("harmonic fields", () => {
  it("lists the major field with chords, functions and scales", () => {
    const field = harmonicField("C", "major");
    expect(field.map((c) => c.symbol)).toEqual([
      "C7M",
      "Dm7",
      "Em7",
      "F7M",
      "G7",
      "Am7",
      "Bm7(b5)",
    ]);
    expect(field.map((c) => c.fn)).toEqual([
      "T",
      "SD",
      "T",
      "SD",
      "D",
      "T",
      "D",
    ]);
    expect(field.map((c) => c.scale)).toEqual([
      "ionian",
      "dorian",
      "phrygian",
      "lydian",
      "mixolydian",
      "aeolian",
      "locrian",
    ]);
  });

  it("offers the minor fields in a minor key", () => {
    expect(fieldsFor(true)).toContain("harmonicMinor");
    expect(fieldsFor(false)).not.toContain("harmonicMinor");
    const harmonic = harmonicField("Am", "harmonicMinor");
    expect(harmonic.find((c) => c.degree === "V7")?.symbol).toBe("E7");
    expect(harmonic.find((c) => c.degree === "V7")?.scale).toBe(
      "mixolydianB9B13",
    );
    const melodic = harmonicField("Am", "melodicMinor");
    expect(melodic.find((c) => c.degree === "IV7")?.scale).toBe(
      "lydianDominant",
    );
  });

  it("spells secondary dominants and substitutes in the key", () => {
    expect(
      harmonicField("Bb", "secondaryDominants").map((c) => c.symbol),
    ).toEqual(["G7", "A7", "Bb7", "C7", "D7"]);
    expect(harmonicField("C", "substitutes")[0].symbol).toBe("Db7");
  });
});

describe("chord scales", () => {
  const scale = (symbol: string, degree: string, key: string) =>
    chordScale(shape(symbol), d(degree), key)!;

  it("follows the chord-scale method of the harmony books", () => {
    expect(scale("E7", "V7/VI", "C").id).toBe("mixolydianB9B13");
    expect(scale("A7", "V7/II", "C").id).toBe("mixolydianB13");
    expect(scale("D7", "V7/V", "C").id).toBe("mixolydian");
    expect(scale("Db7", "SubV7", "C").id).toBe("lydianDominant");
    expect(scale("Bb7", "bVII7", "C").id).toBe("lydianDominant");
    expect(scale("Fm6", "IVm6", "C").id).toBe("dorian");
    expect(scale("Ab7M", "bVI7M", "C").id).toBe("lydian");
    expect(scale("G7", "V7", "Cm").id).toBe("mixolydianB9B13");
    expect(scale("C#°", "#I°", "C").id).toBe("diminished");
  });

  it("tells chord tones, tensions and avoid notes apart", () => {
    const tones = scale("C7M", "I7M", "C").tones;
    expect(tones.map((t) => t.name)).toEqual([
      "C",
      "D",
      "E",
      "F",
      "G",
      "A",
      "B",
    ]);
    expect(tones.find((t) => t.name === "F")?.role).toBe("avoid");
    expect(tones.find((t) => t.name === "D")?.role).toBe("tension");
    expect(tones.find((t) => t.name === "E")?.role).toBe("chord");
    // A dominant's altered tensions are its colour, not avoid notes.
    const e7 = scale("E7", "V7/VI", "C").tones;
    expect(e7.find((t) => t.label === "b9")?.role).toBe("tension");
    expect(e7.find((t) => t.label === "11")?.role).toBe("avoid");
  });

  it("names scales by their intervals", () => {
    expect(identifyScale([0, 2, 4, 5, 7, 9, 11])).toBe("ionian");
    expect(identifyScale([0, 1, 3, 4, 6, 8, 10])).toBe("altered");
    expect(identifyScale([0, 1, 2])).toBeNull();
  });
});
