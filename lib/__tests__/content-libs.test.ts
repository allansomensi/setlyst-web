import { describe, expect, it } from "vitest";
import {
  checkLinkUrl,
  detectProvider,
  draftsToLinks,
  newLinkDraft,
  providerForHost,
} from "@/lib/content-links";
import { CSV_BOM, escapeCsvCell, safeFileName, toCsv } from "@/lib/csv";
import { checkChordProFile, utf8Size } from "@/lib/chordpro-file";
import { groupTours, tourLengthDays, tourPhase } from "@/lib/tours";
import { repertoireFirst, setlistDisplayTitle } from "@/lib/repertoire";
import { repertoireStats } from "@/lib/repertoire-stats";
import {
  canAdministerBand,
  canExportBandPdf,
  canManageBandSetlists,
  canManageBandSongs,
  canModerateBand,
} from "@/lib/band-permissions";
import type { Song } from "@/types/api";
import {
  DEFAULT_PDF_OPTIONS,
  DEFAULT_SONG_PDF_OPTIONS,
  SONG_PDF_QUERY_KEYS,
  songPdfAdvancedKeys,
  songPdfOptionsFrom,
  songPdfOptionsToQuery,
  withoutAdvancedSongOptions,
} from "@/lib/pdf-export-options";

describe("content links", () => {
  it("detects every provider", () => {
    expect(detectProvider("https://www.youtube.com/watch?v=x")).toBe("youtube");
    expect(detectProvider("https://youtu.be/abc")).toBe("youtube");
    expect(detectProvider("https://music.youtube.com/watch?v=1")).toBe(
      "youtube",
    );
    expect(detectProvider("https://open.spotify.com/track/1")).toBe("spotify");
    expect(detectProvider("https://drive.google.com/file/d/1")).toBe(
      "google_drive",
    );
    expect(detectProvider("https://docs.google.com/document/d/1")).toBe(
      "google_drive",
    );
    expect(detectProvider("https://music.apple.com/br/album/x")).toBe(
      "apple_music",
    );
    expect(detectProvider("https://www.deezer.com/track/1")).toBe("deezer");
    expect(detectProvider("https://soundcloud.com/a/b")).toBe("soundcloud");
    expect(detectProvider("https://www.dropbox.com/s/x")).toBe("dropbox");
    expect(detectProvider("https://1drv.ms/u/s!x")).toBe("onedrive");
  });

  it("refuses lookalikes, other schemes and hosts", () => {
    expect(providerForHost("youtube.com.evil.com")).toBeNull();
    expect(providerForHost("evilyoutube.com")).toBeNull();
    expect(checkLinkUrl("http://youtube.com/x")).toEqual({
      ok: false,
      issue: "not_https",
    });
    expect(checkLinkUrl("youtube.com/watch")).toEqual({
      ok: false,
      issue: "not_https",
    });
    expect(checkLinkUrl("javascript:alert(1)").ok).toBe(false);
    expect(checkLinkUrl("https://example.com/x")).toEqual({
      ok: false,
      issue: "not_allowed",
    });
    expect(checkLinkUrl("https://user:pw@youtube.com/x").ok).toBe(false);
    expect(checkLinkUrl("https://youtube.com:8443/x").ok).toBe(false);
    expect(checkLinkUrl("https://1.2.3.4/x").ok).toBe(false);
    expect(checkLinkUrl("https://you​tube.com/x").ok).toBe(false);
    expect(checkLinkUrl("https://yоutube.com/x").ok).toBe(false);
    expect(checkLinkUrl("https://youtube.com/a b").ok).toBe(false);
    expect(checkLinkUrl(`https://youtu.be/${"a".repeat(500)}`)).toEqual({
      ok: false,
      issue: "too_long",
    });
  });

  it("validates editor rows", () => {
    const a = {
      ...newLinkDraft(),
      url: "https://youtu.be/a",
      label: " Ao vivo ",
    };
    const b = { ...newLinkDraft(), url: "", label: "" };
    const ok = draftsToLinks([a, b]);
    expect(ok).toEqual({
      ok: true,
      links: [{ url: "https://youtu.be/a", label: "Ao vivo" }],
    });

    const dup = { ...newLinkDraft(), url: "https://youtu.be/a", label: "" };
    const bad = { ...newLinkDraft(), url: "https://evil.com", label: "" };
    const long = {
      ...newLinkDraft(),
      url: "https://youtu.be/b",
      label: "x".repeat(61),
    };
    const result = draftsToLinks([a, dup, bad, long]);
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.issues).toEqual({
        [dup.key]: "duplicate",
        [bad.key]: "not_allowed",
        [long.key]: "label_too_long",
      });
    }
  });
});

describe("csv", () => {
  it("quotes, doubles quotes and neutralizes formulas", () => {
    expect(escapeCsvCell('Ele disse "oi"')).toBe('"Ele disse ""oi"""');
    expect(escapeCsvCell("=SUM(A1)")).toBe(`"'=SUM(A1)"`);
    expect(escapeCsvCell("@cmd")).toBe(`"'@cmd"`);
    expect(escapeCsvCell("-12")).toBe('"-12"');
    expect(escapeCsvCell(-3)).toBe('"-3"');
    expect(escapeCsvCell(null)).toBe('""');
  });

  it("builds a document with BOM and CRLF", () => {
    const csv = toCsv(
      ["Tom", "Músicas"],
      [
        ["Am", 3],
        ["C, maior", 1],
      ],
    );
    expect(csv.startsWith(CSV_BOM)).toBe(true);
    expect(csv).toBe(
      `${CSV_BOM}"Tom","Músicas"\r\n"Am","3"\r\n"C, maior","1"\r\n`,
    );
  });

  it("makes safe file names", () => {
    expect(safeFileName("Estatísticas: Repertório / 2026", "csv")).toBe(
      "estatisticas-repertorio-2026.csv",
    );
    expect(safeFileName("***", "png")).toBe("setlyst.png");
  });
});

describe("chordpro file checks", () => {
  it("accepts the known extensions within 64 KiB", () => {
    expect(checkChordProFile({ name: "Song.CHO", size: 10 })).toBeNull();
    expect(checkChordProFile({ name: "a.chordpro", size: 65536 })).toBeNull();
    expect(checkChordProFile({ name: "a.txt", size: 65537 })).toBe("size");
    expect(checkChordProFile({ name: "a.pdf", size: 10 })).toBe("type");
    expect(checkChordProFile({ name: "a.cho", size: 0 })).toBe("empty");
  });

  it("measures UTF-8 size", () => {
    expect(utf8Size("ação")).toBe(6);
  });
});

describe("tours", () => {
  const tour = (start: string, end: string) => ({
    start_date: start,
    end_date: end,
  });

  it("classifies phases with inclusive ends", () => {
    expect(tourPhase(tour("2026-09-23", "2026-09-30"), "2026-09-23")).toBe(
      "current",
    );
    expect(tourPhase(tour("2026-09-01", "2026-09-23"), "2026-09-23")).toBe(
      "current",
    );
    expect(tourPhase(tour("2026-09-24", "2026-09-30"), "2026-09-23")).toBe(
      "upcoming",
    );
    expect(tourPhase(tour("2026-09-01", "2026-09-22"), "2026-09-23")).toBe(
      "past",
    );
  });

  it("groups and sorts", () => {
    const groups = groupTours(
      [
        tour("2026-12-01", "2026-12-10"),
        tour("2026-10-01", "2026-10-10"),
        tour("2026-01-01", "2026-01-10"),
        tour("2026-05-01", "2026-05-10"),
      ],
      "2026-09-23",
    );
    expect(groups.upcoming.map((t) => t.start_date)).toEqual([
      "2026-10-01",
      "2026-12-01",
    ]);
    expect(groups.past.map((t) => t.start_date)).toEqual([
      "2026-05-01",
      "2026-01-01",
    ]);
  });

  it("counts days", () => {
    expect(tourLengthDays(tour("2026-02-27", "2026-03-02"))).toBe(4);
    expect(tourLengthDays(tour("2026-02-27", "2026-02-27"))).toBe(1);
  });
});

describe("repertoire", () => {
  it("always shows the translated name", () => {
    expect(
      setlistDisplayTitle(
        { title: "Repertoire", is_repertoire: true },
        "Repertório",
      ),
    ).toBe("Repertório");
    expect(setlistDisplayTitle({ title: "Show" }, "Repertório")).toBe("Show");
    expect(
      repertoireFirst([{ id: 1 }, { id: 2, is_repertoire: true }]).map(
        (s) => s.id,
      ),
    ).toEqual([2, 1]);
  });
});

describe("band permissions", () => {
  const perms = (
    manage_setlists: boolean,
    manage_songs = false,
    export_pdf = true,
  ) => ({ my_permissions: { manage_setlists, manage_songs, export_pdf } });

  it("reads content permissions from the API", () => {
    expect(canManageBandSetlists(perms(false))).toBe(false);
    expect(canManageBandSetlists(perms(true))).toBe(true);
    expect(canManageBandSongs(perms(true, false))).toBe(false);
    expect(canManageBandSongs(perms(false, true))).toBe(true);
    expect(canExportBandPdf(perms(false, false, false))).toBe(false);
    expect(canExportBandPdf(perms(false))).toBe(true);
  });

  it("follows roles for administration", () => {
    expect(canAdministerBand({ my_role: "moderator" })).toBe(false);
    expect(canAdministerBand({ my_role: "admin" })).toBe(true);
    expect(canModerateBand({ my_role: "member" })).toBe(false);
    expect(canModerateBand({ my_role: "moderator" })).toBe(true);
  });
});

describe("repertoire stats", () => {
  const song = (over: Partial<Song>): Song => ({
    id: Math.random().toString(),
    title: "x",
    artist_id: "a1",
    user_id: "u",
    band_id: null,
    forked_from: null,
    tags: [],
    created_at: "",
    updated_at: "",
    ...over,
  });

  it("computes breakdowns and coverage", () => {
    const stats = repertoireStats(
      [
        song({
          tempo: 65,
          energy: 1,
          tonality: "Am",
          duration: 200,
          lyrics: "x",
        }),
        song({ tempo: 120, energy: 4, tonality: "Am", genre: "Rock" }),
        song({ tempo: 150, tonality: "C", artist_id: "a2" }),
        song({}),
      ],
      new Map([
        ["a1", "Elis"],
        ["a2", "Tim"],
      ]),
    );
    expect(stats.totalSongs).toBe(4);
    expect(stats.totalDuration).toBe(200);
    expect(stats.averageBpm).toBe(112);
    expect(stats.averageEnergy).toBe(2.5);
    expect(stats.keys).toEqual([
      { key: "Am", count: 2 },
      { key: "C", count: 1 },
    ]);
    expect(stats.bpmRanges.find((r) => r.key === "under70")?.count).toBe(1);
    expect(stats.bpmRanges.find((r) => r.key === "150plus")?.count).toBe(1);
    expect(stats.energy.find((e) => e.key === 4)?.count).toBe(1);
    expect(stats.artists[0]).toEqual({ key: "Elis", count: 3 });
    expect(stats.coverage.lyrics).toBe(1);
    expect(stats.missing).toEqual({ key: 1, bpm: 1, energy: 2 });
  });

  it("handles an empty library", () => {
    const stats = repertoireStats([], new Map());
    expect(stats.averageBpm).toBeNull();
    expect(stats.averageEnergy).toBeNull();
    expect(stats.keys).toEqual([]);
  });
});

describe("song pdf options", () => {
  it("only sends keys the route forwards", () => {
    const query = new URLSearchParams(
      songPdfOptionsToQuery(DEFAULT_SONG_PDF_OPTIONS, "pt-BR"),
    );
    for (const key of query.keys()) {
      expect(SONG_PDF_QUERY_KEYS.has(key)).toBe(true);
    }
    expect(query.get("chord_mode")).toBe("above");
    expect(query.get("lang")).toBe("pt-BR");
  });

  it("detects and strips the advanced options", () => {
    expect(songPdfAdvancedKeys(DEFAULT_SONG_PDF_OPTIONS)).toEqual([]);
    const advanced = {
      ...DEFAULT_SONG_PDF_OPTIONS,
      columns: 2 as const,
      watermark: false,
      margins: "wide" as const,
    };
    expect(songPdfAdvancedKeys(advanced)).toEqual([
      "columns",
      "watermark",
      "margins",
    ]);
    expect(songPdfAdvancedKeys(withoutAdvancedSongOptions(advanced))).toEqual(
      [],
    );
  });

  it("starts from the saved setlist defaults", () => {
    const options = songPdfOptionsFrom({
      ...DEFAULT_PDF_OPTIONS,
      paper: "letter",
      chords: "inline",
    });
    expect(options.paper).toBe("letter");
    expect(options.chord_mode).toBe("inline");
    expect(options.show_key).toBe(true);
  });
});
