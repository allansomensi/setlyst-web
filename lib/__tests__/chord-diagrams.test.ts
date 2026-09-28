import { describe, expect, it } from "vitest";
import { chordNotes } from "@/lib/music/chord-theory";
import {
  formatFrets,
  frettedVoicings,
  keyboardVoicings,
  type StringInstrument,
} from "@/lib/music/voicings";

const notes = (symbol: string) => chordNotes(symbol)?.noteNames.join(" ");
const intervals = (symbol: string) =>
  chordNotes(symbol)?.intervalNames.join(" ");
const first = (symbol: string, instrument: StringInstrument = "guitar") =>
  formatFrets(frettedVoicings(chordNotes(symbol)!, instrument, 1)[0].frets);

describe("chordNotes", () => {
  it("spells triads and sevenths from the root", () => {
    expect(notes("C")).toBe("C E G");
    expect(notes("Am")).toBe("A C E");
    expect(notes("G7")).toBe("G B D F");
    expect(notes("Bb7M")).toBe("Bb D F A");
    expect(notes("F#m7")).toBe("F# A C# E");
    expect(notes("Eb")).toBe("Eb G Bb");
  });

  it("reads Brazilian chord symbols", () => {
    expect(intervals("C7M")).toBe("1 3 5 7");
    expect(intervals("C7+")).toBe("1 3 5 7");
    expect(intervals("Bm7(b5)")).toBe("1 b3 b5 b7");
    expect(intervals("E7(9)")).toBe("1 3 5 b7 9");
    expect(intervals("E7/9")).toBe("1 3 5 b7 9");
    expect(intervals("E7(9-)")).toBe("1 3 5 b7 b9");
    expect(intervals("D4")).toBe("1 4 5");
    expect(intervals("A7/4")).toBe("1 4 5 b7");
    expect(intervals("C6/9")).toBe("1 3 5 6 9");
    // A bare 9 is an added ninth: "C com nona".
    expect(intervals("C9")).toBe("1 3 5 9");
    // "°" alone is the four-note diminished chord.
    expect(notes("C°")).toBe("C Eb Gb Bbb");
    expect(intervals("Gdim")).toBe("1 b3 b5");
  });

  it("reads international chord symbols", () => {
    expect(intervals("Cmaj7")).toBe("1 3 5 7");
    expect(intervals("Cm7b5")).toBe("1 b3 b5 b7");
    expect(intervals("Csus4")).toBe("1 4 5");
    expect(intervals("Dsus2")).toBe("1 2 5");
    expect(intervals("C5")).toBe("1 5");
    expect(intervals("Caug")).toBe("1 3 #5");
    expect(intervals("G13")).toBe("1 3 5 b7 13");
    expect(intervals("Cm(maj7)")).toBe("1 b3 5 7");
  });

  it("keeps the bass of slash chords and ignores non-chords", () => {
    const chord = chordNotes("D/F#")!;
    expect(chord.bassName).toBe("F#");
    expect(chord.bassPitchClass).toBe(6);
    expect(chordNotes("(G7)")?.symbol).toBe("G7");
    expect(chordNotes("N.C.")).toBeNull();
    expect(chordNotes("Bridge")).toBeNull();
  });
});

describe("frettedVoicings", () => {
  it("finds the familiar open and barre guitar shapes first", () => {
    expect(first("C")).toBe("x32010");
    expect(first("G")).toBe("320003");
    expect(first("D")).toBe("xx0232");
    expect(first("A")).toBe("x02220");
    expect(first("E")).toBe("022100");
    expect(first("Am")).toBe("x02210");
    expect(first("Em")).toBe("022000");
    expect(first("F")).toBe("133211");
    expect(first("Bm")).toBe("x24432");
    expect(first("G7")).toBe("320001");
    expect(first("E7")).toBe("020100");
    expect(first("Am7")).toBe("x02010");
    expect(first("C7M")).toBe("x32000");
    expect(first("Bm7(b5)")).toBe("x20201");
  });

  it("puts the written bass of a slash chord at the bottom", () => {
    expect(first("D/F#")).toBe("200232");
    expect(first("C/E")).toBe("032010");
    expect(first("G/B")).toBe("x20003");
  });

  it("works for the ukulele and the cavaquinho", () => {
    expect(first("C", "ukulele")).toBe("0003");
    expect(first("G", "ukulele")).toBe("0232");
    expect(first("Am", "ukulele")).toBe("2000");
    expect(first("C", "cavaquinho")).toBe("2012");
    expect(first("G", "cavaquinho")).toBe("0000");
  });

  it("only returns voicings that contain the chord", () => {
    const chord = chordNotes("E7(9)")!;
    const strings = [40, 45, 50, 55, 59, 64];
    for (const voicing of frettedVoicings(chord, "guitar", 8)) {
      const pcs = new Set(
        voicing.frets.flatMap((fret, s) =>
          fret === null ? [] : [(strings[s] + fret) % 12],
        ),
      );
      // E G# D F# — the fifth may go.
      for (const pc of [4, 8, 2, 6]) expect(pcs.has(pc)).toBe(true);
    }
  });
});

describe("keyboardVoicings", () => {
  it("stacks the chord in close position over the bass, with inversions", () => {
    const voicings = keyboardVoicings(chordNotes("C/E")!);
    expect(voicings[0].bass % 12).toBe(4);
    expect(voicings[0].notes).toEqual([60, 64, 67]);
    expect(voicings[1].notes).toEqual([64, 67, 72]);
    expect(voicings).toHaveLength(3);
  });
});
