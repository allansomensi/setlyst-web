import { describe, expect, it } from "vitest";
import {
  buildSearchIndex,
  filterByIndexedSearch,
  filterBySearch,
  foldForSearch,
} from "@/lib/search";

describe("foldForSearch", () => {
  it("drops accents and case", () => {
    expect(foldForSearch("Canção")).toBe("cancao");
    expect(foldForSearch("JOSÉ Ñandú")).toBe("jose nandu");
    expect(foldForSearch("Übermensch")).toBe("ubermensch");
  });

  it("keeps characters without a decomposition", () => {
    expect(foldForSearch("C#m7(b5)")).toBe("c#m7(b5)");
  });
});

describe("filterBySearch", () => {
  const rows = [
    { title: "Canção da América", artist: "Milton Nascimento" },
    { title: "Aquarela", artist: "Toquinho" },
    { title: "Garota de Ipanema", artist: "Tom Jobim", genre: null },
  ];

  it("matches without typing accents", () => {
    expect(filterBySearch(rows, ["title"], "cancao")).toEqual([rows[0]]);
    expect(filterBySearch(rows, ["title"], "AMERICA")).toEqual([rows[0]]);
  });

  it("matches accented input against plain text", () => {
    expect(filterBySearch(rows, ["title"], "aquarelá")).toEqual([rows[1]]);
  });

  it("searches every listed key and ignores non-string values", () => {
    expect(
      filterBySearch(rows, ["title", "artist", "genre"] as never, "jobim"),
    ).toEqual([rows[2]]);
  });

  it("keeps everything for a blank term", () => {
    expect(filterBySearch(rows, ["title"], "   ")).toHaveLength(3);
  });
});

describe("buildSearchIndex / filterByIndexedSearch", () => {
  const rows = [
    { title: "Canção da América", lyrics: "[G]Oh, [D]terra" },
    { title: "Aquarela", lyrics: null },
  ];

  it("matches through a prebuilt index like filterBySearch does", () => {
    const index = buildSearchIndex(rows, ["title", "lyrics"]);
    expect(index[0]).toEqual(["cancao da america", "[g]oh, [d]terra"]);
    expect(index[1]).toEqual(["aquarela"]);
    expect(filterByIndexedSearch(rows, index, "TERRA")).toEqual([rows[0]]);
    expect(filterByIndexedSearch(rows, index, "aquarelá")).toEqual([rows[1]]);
    expect(filterByIndexedSearch(rows, index, "  ")).toHaveLength(2);
  });
});
