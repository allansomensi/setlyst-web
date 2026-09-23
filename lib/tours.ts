/**
 * Tour dates: grouping for the tours page and the status badge.
 * Dates are calendar days ("YYYY-MM-DD"), compared as strings in the
 * caller's own calendar (no time zone conversion: a tour on 2026-10-01
 * is on that day wherever the band is).
 */

export type TourPhase = "upcoming" | "current" | "past";

/** Today as "YYYY-MM-DD" in local time. */
export function localToday(now: Date = new Date()): string {
  const y = now.getFullYear();
  const m = String(now.getMonth() + 1).padStart(2, "0");
  const d = String(now.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

export function tourPhase(
  tour: { start_date: string; end_date: string },
  today: string,
): TourPhase {
  if (tour.end_date < today) return "past";
  if (tour.start_date > today) return "upcoming";
  return "current";
}

/**
 * Tours by phase: current ones first (ending soonest), then upcoming
 * (starting soonest), then past (most recent first).
 */
export function groupTours<T extends { start_date: string; end_date: string }>(
  tours: T[],
  today: string,
): Record<TourPhase, T[]> {
  const groups: Record<TourPhase, T[]> = {
    current: [],
    upcoming: [],
    past: [],
  };
  for (const tour of tours) groups[tourPhase(tour, today)].push(tour);
  groups.current.sort((a, b) => a.end_date.localeCompare(b.end_date));
  groups.upcoming.sort((a, b) => a.start_date.localeCompare(b.start_date));
  groups.past.sort((a, b) => b.end_date.localeCompare(a.end_date));
  return groups;
}

/** Days in a tour, both ends included. */
export function tourLengthDays(tour: {
  start_date: string;
  end_date: string;
}): number {
  const start = Date.UTC(
    Number(tour.start_date.slice(0, 4)),
    Number(tour.start_date.slice(5, 7)) - 1,
    Number(tour.start_date.slice(8, 10)),
  );
  const end = Date.UTC(
    Number(tour.end_date.slice(0, 4)),
    Number(tour.end_date.slice(5, 7)) - 1,
    Number(tour.end_date.slice(8, 10)),
  );
  return Math.max(1, Math.round((end - start) / 86_400_000) + 1);
}
