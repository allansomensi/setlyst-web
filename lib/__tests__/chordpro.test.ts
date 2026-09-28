import { describe, expect, it } from "vitest";
import { normalizeChordPro, parseChordPro } from "@/lib/music/chordpro";

describe("lone A, E and Em over the lyrics", () => {
  it("reads them as chords in a chart that has chords", () => {
    const chart = [
      "        E",
      "Quando eu te vi",
      "   A",
      "Tudo mudou",
      "C#m     B",
      "E o mundo parou",
      "Em",
    ].join("\n");

    expect(normalizeChordPro(chart).split("\n")).toEqual([
      "Quando e[E]u te vi",
      "Tud[A]o mudou",
      "[C#m]E o mund[B]o parou",
      "[Em]",
    ]);
  });

  it("renders a lone chord line as chords, not as lyrics", () => {
    const blocks = parseChordPro("A\n\nG  D\nLá vou eu\nE");
    expect(blocks[0]).toMatchObject({ type: "chords" });
    expect(blocks[blocks.length - 1]).toMatchObject({ type: "chords" });
  });

  it("keeps them as words in plain lyrics", () => {
    const lyrics = "Hoje eu vou\nE\nvolto amanhã";
    expect(normalizeChordPro(lyrics)).toBe(lyrics);
    expect(parseChordPro(lyrics)[1]).toMatchObject({
      type: "lyric",
      hasChords: false,
    });
  });

  it("counts bracketed chords as a chart with chords", () => {
    expect(normalizeChordPro("[G]Olá\nA\nmundo")).toBe("[G]Olá\n[A]mundo");
  });
});

describe("spaces before the lyric", () => {
  const chart = [
    "D#m      B     F#           C#",
    "    Till now, I always got by on my own",
    "  F#/A#         B       C#",
    "    How do I get you alone",
  ].join("\n");

  /** The first word of a lyric line, as [chord, text] pairs. */
  const lead = (index: number) => {
    const block = parseChordPro(chart)[index];
    if (block.type !== "lyric") throw new Error(`not a lyric: ${block.type}`);
    return block.words
      .slice(0, 2)
      .map((word) => word.map((s) => [s.chord, s.text]));
  };

  it("keeps the gap when the chord comes in before the singing", () => {
    // D#m over four spaces, then the lyric: the chord leads in.
    expect(lead(0)).toEqual([[["D#m", "    "]], [[null, "Till "]]]);
  });

  it("keeps the indentation of a chord that leads in", () => {
    expect(lead(1)).toEqual([[[null, "  "]], [["F#/A#", "  "]]]);
  });

  it("still tidies indentation when the chord falls on the lyric", () => {
    const [block] = parseChordPro("   [G]Hello old [D]friend");
    expect(block.type === "lyric" && block.words[0][0]).toEqual({
      chord: "G",
      text: "Hello ",
    });
  });

  it("still moves a chord typed a column early onto its word", () => {
    const [block] = parseChordPro("[G]Hello my[D] old friend");
    expect(
      block.type === "lyric" && block.words.map((w) => w.map((s) => s.text)),
    ).toEqual([["Hello "], ["my "], ["old "], ["friend"]]);
  });
});
