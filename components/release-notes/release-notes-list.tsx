import { useTranslations } from "next-intl";
import {
  Bug,
  CircleDot,
  Megaphone,
  ShieldCheck,
  Sparkles,
  Wand2,
  type LucideIcon,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { pickLocalized } from "@/lib/localized";
import { cn } from "@/lib/utils";
import type { ReleaseItemKind, ReleaseNote } from "@/types/public";
import { formatApiDay } from "@/lib/dates";

const KIND_ICONS: Record<ReleaseItemKind, LucideIcon> = {
  new: Sparkles,
  improved: Wand2,
  fixed: Bug,
  security: ShieldCheck,
};

/** The order the groups of a release are listed in. */
const KIND_ORDER: ReleaseItemKind[] = ["new", "improved", "fixed", "security"];

/** Each kind's tint: the icon tile heading its group, and its bullets. */
const KIND_TONES: Record<ReleaseItemKind, { tile: string; dot: string }> = {
  new: {
    tile: "bg-sky-500/12 text-sky-700 ring-sky-500/25 dark:text-sky-300",
    dot: "bg-sky-500",
  },
  improved: {
    tile: "bg-violet-500/12 text-violet-700 ring-violet-500/25 dark:text-violet-300",
    dot: "bg-violet-500",
  },
  fixed: {
    tile: "bg-amber-500/12 text-amber-800 ring-amber-500/25 dark:text-amber-300",
    dot: "bg-amber-500",
  },
  security: {
    tile: "bg-emerald-500/12 text-emerald-700 ring-emerald-500/25 dark:text-emerald-300",
    dot: "bg-emerald-500",
  },
};

const OTHER_TONE = {
  tile: "bg-muted text-muted-foreground ring-border",
  dot: "bg-muted-foreground/60",
};

function isKnownKind(kind: string): kind is ReleaseItemKind {
  return kind in KIND_ICONS;
}

/**
 * A release's items gathered by kind, in the usual changelog order (new,
 * improved, fixed, security; any other kind after them, as written), each
 * keeping the order it was written in.
 */
function groupItems(items: ReleaseNote["items"]) {
  const groups = new Map<string, ReleaseNote["items"]>();
  for (const kind of KIND_ORDER) groups.set(kind, []);
  for (const item of items) {
    const list = groups.get(item.kind);
    if (list) list.push(item);
    else groups.set(item.kind, [item]);
  }
  return [...groups.entries()].filter(([, list]) => list.length > 0);
}

export interface ReleaseNotesListProps {
  /** Published notes, newest first (`GET /public/release-notes`). */
  notes: ReleaseNote[];
  /** Locale for the texts (falls back to English per field) and dates. */
  locale: string;
  /** Heading level of each release title (default `h2`). */
  headingLevel?: "h2" | "h3";
  /** Marks the first release as the latest one (default `true`). */
  highlightLatest?: boolean;
  className?: string;
}

/**
 * The release notes timeline, shared by the public changelog and the
 * signed-in "Novidades" page (and the staff editor's preview, which is why
 * it uses `useTranslations`: it renders on the server and in the client).
 * Pure rendering: callers fetch the notes
 * (e.g. with `getPublicReleaseNotes()` from lib/public-api.ts) and handle
 * the API-down case; an empty list renders an empty state.
 */
export function ReleaseNotesList({
  notes,
  locale,
  headingLevel = "h2",
  highlightLatest = true,
  className,
}: ReleaseNotesListProps) {
  const t = useTranslations("releaseNotes");
  const Heading = headingLevel;
  const GroupHeading = headingLevel === "h2" ? "h3" : "h4";

  if (notes.length === 0) {
    return (
      <div
        className={cn(
          "bg-card text-muted-foreground flex flex-col items-center gap-3 rounded-2xl border border-dashed px-6 py-14 text-center",
          className,
        )}
      >
        <Megaphone className="size-8 opacity-60" />
        <p>{t("empty")}</p>
      </div>
    );
  }

  return (
    <ol className={cn("relative", className)}>
      {notes.map((note, index) => {
        const latest = highlightLatest && index === 0;
        const last = index === notes.length - 1;
        const released = formatApiDay(note.released_on, locale) || null;
        const edited = note.is_edited
          ? formatApiDay(note.updated_at, locale) || null
          : null;
        const title = pickLocalized(note.title, locale);

        return (
          <li
            key={note.id}
            className="relative grid gap-3 pb-10 last:pb-0 md:grid-cols-[8.5rem_minmax(0,1fr)] md:gap-8"
          >
            {/* The timeline: a rail down the left column, a dot per
                release (from `md` up, where the columns sit side by side). */}
            {!last && (
              <span
                aria-hidden
                className="bg-border absolute top-3 bottom-0 left-[8.5rem] hidden w-px translate-x-4 md:block"
              />
            )}
            <span
              aria-hidden
              className={cn(
                "absolute top-2 left-[8.5rem] hidden size-2.5 translate-x-[calc(1rem-50%+0.5px)] rounded-full ring-4 md:block",
                latest
                  ? "bg-primary ring-primary/20"
                  : "bg-muted-foreground/40 ring-background",
              )}
            />

            <div className="flex flex-wrap items-center gap-x-3 gap-y-1 md:sticky md:top-4 md:flex-col md:items-start md:self-start md:pr-4">
              <span
                className={cn(
                  "font-mono text-lg font-semibold tracking-tight tabular-nums",
                  latest ? "text-primary" : "text-foreground",
                )}
              >
                v{note.version}
              </span>
              {released && (
                <time
                  dateTime={note.released_on}
                  className="text-muted-foreground text-sm"
                  title={t("released", { date: released })}
                >
                  {released}
                </time>
              )}
              {latest && (
                <Badge className="h-5 px-2 text-[0.7rem]">{t("latest")}</Badge>
              )}
            </div>

            <article
              aria-labelledby={`release-${note.id}`}
              className={cn(
                "bg-card rounded-2xl border p-5 shadow-xs sm:p-7",
                latest && "border-primary/30",
              )}
            >
              <header className="space-y-1">
                <Heading
                  id={`release-${note.id}`}
                  className="text-xl font-semibold tracking-tight text-balance"
                >
                  {title || t("version", { version: note.version })}
                </Heading>
                {edited && (
                  <p className="text-muted-foreground text-sm">
                    <time dateTime={note.updated_at}>
                      {t("edited", { date: edited })}
                    </time>
                  </p>
                )}
              </header>

              {/* Grouped by kind, a heading per group instead of a badge
                  on every line: the texts start at the same place and read
                  as a list, and the colour still tells the kinds apart. */}
              <div className="mt-6 space-y-6">
                {groupItems(note.items).map(([rawKind, items]) => {
                  const kind = isKnownKind(rawKind) ? rawKind : null;
                  const Icon = kind ? KIND_ICONS[kind] : CircleDot;
                  const tone = kind ? KIND_TONES[kind] : OTHER_TONE;
                  const headingId = `release-${note.id}-${rawKind}`;
                  return (
                    <section key={rawKind} aria-labelledby={headingId}>
                      <GroupHeading
                        id={headingId}
                        className="flex items-center gap-2.5 text-sm font-semibold"
                      >
                        <span
                          className={cn(
                            "inline-flex size-7 items-center justify-center rounded-lg ring-1 ring-inset",
                            tone.tile,
                          )}
                          aria-hidden
                        >
                          <Icon className="size-3.5" />
                        </span>
                        {kind ? t(`groups.${kind}`) : rawKind}
                        <span className="text-muted-foreground text-xs font-normal tabular-nums">
                          {items.length}
                        </span>
                      </GroupHeading>
                      <ul className="mt-2.5 space-y-2 pl-[2.375rem]">
                        {items.map((item, itemIndex) => (
                          <li
                            key={itemIndex}
                            className="relative text-sm leading-relaxed"
                          >
                            <span
                              aria-hidden
                              className={cn(
                                "absolute top-[0.6rem] -left-[1.2rem] size-1.5 rounded-full",
                                tone.dot,
                              )}
                            />
                            {pickLocalized(item.text, locale)}
                          </li>
                        ))}
                      </ul>
                    </section>
                  );
                })}
              </div>
            </article>
          </li>
        );
      })}
    </ol>
  );
}
