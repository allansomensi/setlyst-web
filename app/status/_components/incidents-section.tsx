import { CalendarClock, ChevronDown, Wrench, Zap } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { formatApiDateTime } from "@/lib/dates";
import {
  INCIDENT_IMPACT_ACCENTS,
  INCIDENT_IMPACT_TONES,
  INCIDENT_STATUS_TONES,
} from "@/lib/platform-admin";
import { cn } from "@/lib/utils";
import type { Incident, PublicIncidents } from "@/types/operations";

/**
 * The incidents part of the public status page (a server component, like
 * the page: no client JavaScript). `t` reads `status.incidents`, loosely
 * typed because the page loads its messages at runtime.
 */
type Translate = (
  key: string,
  values?: Record<string, string | number>,
) => string;

interface Props {
  incidents: PublicIncidents | null;
  t: Translate;
  locale: string;
  timeZone: string;
}

function Timeline({
  incident,
  t,
  locale,
  timeZone,
}: { incident: Incident } & Omit<Props, "incidents">) {
  if (incident.updates.length === 0) return null;
  return (
    <ol className="space-y-3 border-l pl-4" aria-label={t("timeline")}>
      {incident.updates.map((update) => (
        <li key={update.id} className="space-y-0.5">
          <p className="text-xs">
            <span className="font-semibold">
              {t(`statuses.${update.status}`)}
            </span>
            <span className="text-muted-foreground">
              {" · "}
              <time dateTime={update.created_at}>
                {formatApiDateTime(update.created_at, locale, timeZone)}
              </time>
            </span>
          </p>
          <p className="text-sm break-words whitespace-pre-wrap">
            {update.body}
          </p>
        </li>
      ))}
    </ol>
  );
}

function Facts({
  incident,
  t,
  locale,
  timeZone,
}: { incident: Incident } & Omit<Props, "incidents">) {
  const date = (value: string) => formatApiDateTime(value, locale, timeZone);
  const facts = [
    incident.components.length > 0 &&
      t("affects", {
        components: incident.components
          .map((c) => t(`components.${c}`))
          .join(", "),
      }),
    incident.scheduled_for &&
      incident.scheduled_until &&
      t("window", {
        from: date(incident.scheduled_for),
        until: date(incident.scheduled_until),
      }),
    incident.resolved_at && t("resolved", { date: date(incident.resolved_at) }),
  ].filter((fact): fact is string => Boolean(fact));
  if (facts.length === 0) return null;
  return (
    <ul className="text-muted-foreground space-y-0.5 text-sm">
      {facts.map((fact) => (
        <li key={fact}>{fact}</li>
      ))}
    </ul>
  );
}

function Badges({ incident, t }: { incident: Incident; t: Translate }) {
  return (
    <div className="flex flex-wrap items-center gap-1.5">
      <Badge
        variant="outline"
        className={INCIDENT_STATUS_TONES[incident.status]}
      >
        {t(`statuses.${incident.status}`)}
      </Badge>
      <Badge
        variant="outline"
        className={INCIDENT_IMPACT_TONES[incident.impact]}
      >
        {t(`impacts.${incident.impact}`)}
      </Badge>
    </div>
  );
}

/**
 * What isn't resolved yet (ongoing incidents, upcoming or ongoing
 * maintenance), prominently, each with its whole timeline. Nothing at all
 * when everything is fine.
 */
export function ActiveIncidents({ incidents, t, locale, timeZone }: Props) {
  if (!incidents || incidents.active.length === 0) return null;
  return (
    <section aria-labelledby="active-incidents" className="space-y-3">
      <h2 id="active-incidents" className="text-lg font-semibold">
        {t("activeTitle")}
      </h2>
      {incidents.active.map((incident) => {
        const Icon = incident.kind === "maintenance" ? Wrench : Zap;
        return (
          <article
            key={incident.id}
            aria-labelledby={`incident-${incident.id}`}
            className={cn(
              "bg-card space-y-3 rounded-xl border border-l-4 p-4 shadow-(--shadow-surface) sm:p-5",
              incident.kind === "maintenance" && incident.status === "scheduled"
                ? "border-l-sky-500"
                : INCIDENT_IMPACT_ACCENTS[incident.impact],
            )}
          >
            <div className="space-y-2">
              <p className="text-muted-foreground flex items-center gap-1.5 text-xs font-medium tracking-wide uppercase">
                <Icon className="size-3.5" aria-hidden />
                {t(`kinds.${incident.kind}`)}
              </p>
              <h3
                id={`incident-${incident.id}`}
                className="text-base font-semibold break-words"
              >
                {incident.title}
              </h3>
              <Badges incident={incident} t={t} />
            </div>
            <Facts
              incident={incident}
              t={t}
              locale={locale}
              timeZone={timeZone}
            />
            <Timeline
              incident={incident}
              t={t}
              locale={locale}
              timeZone={timeZone}
            />
          </article>
        );
      })}
    </section>
  );
}

/**
 * Resolved in the last 30 days, collapsed (a `<details>`, so it works
 * without JavaScript); a single quiet line when there were none.
 */
export function PastIncidents({ incidents, t, locale, timeZone }: Props) {
  if (!incidents) return null;
  if (incidents.recent.length === 0) {
    if (incidents.active.length > 0) return null;
    return (
      <p className="text-muted-foreground flex items-center gap-2 text-sm">
        <CalendarClock className="size-4" aria-hidden />
        {t("none")}
      </p>
    );
  }
  return (
    <details className="group bg-card rounded-xl border shadow-(--shadow-surface)">
      <summary className="focus-visible:ring-ring/50 flex cursor-pointer list-none items-center justify-between gap-2 rounded-xl px-4 py-3 font-medium outline-none focus-visible:ring-3 [&::-webkit-details-marker]:hidden">
        {t("pastTitle", { count: incidents.recent.length })}
        <ChevronDown
          className="text-muted-foreground size-4 shrink-0 transition-transform group-open:rotate-180"
          aria-hidden
        />
      </summary>
      <ul className="divide-y border-t">
        {incidents.recent.map((incident) => (
          <li key={incident.id}>
            <details className="group/item">
              <summary className="focus-visible:ring-ring/50 flex cursor-pointer list-none items-start justify-between gap-3 px-4 py-3 outline-none focus-visible:ring-3 focus-visible:ring-inset [&::-webkit-details-marker]:hidden">
                <span className="min-w-0 space-y-0.5">
                  <span className="block text-sm font-medium break-words">
                    {incident.title}
                  </span>
                  <span className="text-muted-foreground block text-xs">
                    {t(`kinds.${incident.kind}`)}
                    {incident.resolved_at &&
                      ` · ${t("resolved", {
                        date: formatApiDateTime(
                          incident.resolved_at,
                          locale,
                          timeZone,
                        ),
                      })}`}
                  </span>
                </span>
                <ChevronDown
                  className="text-muted-foreground mt-0.5 size-4 shrink-0 transition-transform group-open/item:rotate-180"
                  aria-hidden
                />
              </summary>
              <div className="space-y-3 px-4 pb-4">
                <Badges incident={incident} t={t} />
                <Facts
                  incident={{ ...incident, resolved_at: null }}
                  t={t}
                  locale={locale}
                  timeZone={timeZone}
                />
                <Timeline
                  incident={incident}
                  t={t}
                  locale={locale}
                  timeZone={timeZone}
                />
              </div>
            </details>
          </li>
        ))}
      </ul>
    </details>
  );
}
