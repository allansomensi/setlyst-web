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
