import type { FlowSong, Insight } from "@/lib/setlist-insights";

type Translate = (
  key: string,
  values?: Record<string, string | number>,
) => string;

/**
 * The sentence for one insight, naming songs by number and title. `t`
 * is scoped to the `insights` namespace.
 */
export function insightText(
  insight: Insight,
  songs: FlowSong[],
  t: Translate,
): string {
  const [start, end] = insight.range;
  const titleAt = (index: number) => songs[index]?.title ?? "";
  const range =
    start === end
      ? t("range.single", { n: start + 1, title: titleAt(start) })
      : t("range.span", {
          from: start + 1,
          to: end + 1,
          fromTitle: titleAt(start),
          toTitle: titleAt(end),
        });
  const focus =
    insight.code === "good_arc" && typeof insight.values.peak === "number"
      ? insight.values.peak
      : start;

  return t(`codes.${insight.code}`, {
    ...insight.values,
    range,
    title: titleAt(focus),
    n: focus + 1,
  });
}
