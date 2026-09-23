/**
 * CSV export for the statistics pages.
 *
 * Format choices (documented because spreadsheet apps disagree):
 * - comma separator, every field quoted, quotes doubled (RFC 4180);
 * - CRLF line endings;
 * - a UTF-8 byte order mark, so Excel opens accents correctly instead of
 *   guessing a legacy code page. Excel in pt-BR expects `;` when opening
 *   a file by double click, but with the BOM and quoted fields it offers
 *   the right split in "Dados > De texto/CSV", Google Sheets and
 *   LibreOffice detect commas on their own, and a single separator keeps
 *   files identical across languages;
 * - cells starting with `=`, `+`, `-`, `@`, tab or CR get a leading `'`
 *   so a spreadsheet never runs them as formulas (CSV injection). Plain
 *   negative numbers are kept as numbers.
 */

export type CsvCell = string | number | null | undefined;

export const CSV_BOM = "﻿";

const FORMULA_START = /^[=+\-@\t\r]/;
const NUMBER = /^-?\d+([.,]\d+)?$/;

export function escapeCsvCell(value: CsvCell): string {
  if (value === null || value === undefined) return '""';
  let text = typeof value === "number" ? String(value) : value;
  if (
    typeof value === "string" &&
    FORMULA_START.test(text) &&
    !NUMBER.test(text)
  ) {
    text = `'${text}`;
  }
  return `"${text.replace(/"/g, '""')}"`;
}

/** A complete CSV document (BOM + header + rows). */
export function toCsv(header: CsvCell[], rows: CsvCell[][]): string {
  const lines = [header, ...rows].map((row) =>
    row.map(escapeCsvCell).join(","),
  );
  return CSV_BOM + lines.join("\r\n") + "\r\n";
}

/** A file name without characters that trip file systems. */
export function safeFileName(base: string, extension: string): string {
  const cleaned = base
    .normalize("NFKD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/[^a-zA-Z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .toLowerCase()
    .slice(0, 80);
  return `${cleaned || "setlyst"}.${extension}`;
}
