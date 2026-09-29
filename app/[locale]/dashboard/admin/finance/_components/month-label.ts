/**
 * "set. de 2026" / "Sep 26" for an API month ("2026-09"). Its own module
 * (no "use client") so both the chart and the server-rendered table use
 * it: a function exported from a client module can't be called on the
 * server.
 */
export function monthLabel(
  month: string,
  locale: string,
  style: "short" | "long",
) {
  const [year, m] = month.split("-").map(Number);
  // Mid-month UTC: the label never slips to a neighbouring month.
  const date = new Date(Date.UTC(year, (m ?? 1) - 1, 15));
  return new Intl.DateTimeFormat(locale, {
    month: style,
    year: style === "long" ? "numeric" : "2-digit",
    timeZone: "UTC",
  }).format(date);
}
