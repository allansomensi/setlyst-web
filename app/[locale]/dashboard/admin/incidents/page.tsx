import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";
import { Activity } from "lucide-react";
import { ClientDate } from "@/components/client-date";
import { LoadErrorNotice } from "@/components/load-error-notice";
import { AdminPageHeader } from "@/components/staff/admin-page-header";
import { ListPagination } from "@/components/staff/list-controls";
import { ListEmptyState } from "@/components/staff/list-empty-state";
import { Link } from "@/i18n/routing";
import { adminListQuery, type ListSearchParams } from "@/lib/admin-list";
import { fetchServerApi } from "@/lib/api-server";
import {
  INCIDENT_IMPACT_ACCENTS,
  isIncidentActive,
  latestIncidentUpdate,
} from "@/lib/platform-admin";
import { requireStaffPage } from "@/lib/staff-guard";
import { cn } from "@/lib/utils";
import type { PaginatedResponse } from "@/types/api";
import type { Incident } from "@/types/operations";
import {
  IncidentComponents,
  IncidentImpactBadge,
  IncidentKindBadge,
  IncidentStatusBadge,
  StatusPageLink,
} from "./_components/incident-badges";
import { CreateIncidentButton } from "./_components/incident-dialogs";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("incidentsAdmin");
  return { title: t("title") };
}

const DATE_TIME: Intl.DateTimeFormatOptions = {
  dateStyle: "medium",
  timeStyle: "short",
};

/**
 * Incidents and scheduled maintenance shown on the public status page.
 * The API lists unresolved ones first; they are grouped here so what
 * still needs updates stands out.
 */
export default async function IncidentsPage({
  searchParams,
}: {
  searchParams: ListSearchParams;
}) {
  await requireStaffPage("incidents");
  const t = await getTranslations("incidentsAdmin");
  const params = await searchParams;
  const { query, page } = adminListQuery(params, []);
  const result = await fetchServerApi<PaginatedResponse<Incident>>(
    `/admin/incidents?${query}`,
  ).catch(() => null);
  const items = result?.data ?? [];
  const active = items.filter(isIncidentActive);
  const resolved = items.filter((i) => !isIncidentActive(i));

  return (
    <>
      <AdminPageHeader
        title={t("title")}
        description={t("description")}
        actions={
          <>
            <StatusPageLink />
            <CreateIncidentButton />
          </>
        }
      />

      {result === null ? (
        <LoadErrorNotice />
      ) : items.length === 0 ? (
        <ListEmptyState
          compact={false}
          icon={Activity}
          title={t("emptyTitle")}
          description={t("emptyDescription")}
          className="bg-card rounded-xl border border-dashed"
        />
      ) : (
        <>
          {[
            { key: "active", list: active },
            { key: "resolved", list: resolved },
          ].map(
            ({ key, list }) =>
              list.length > 0 && (
                <section
                  key={key}
                  aria-labelledby={`incidents-${key}`}
                  className="space-y-3"
                >
                  <h2 id={`incidents-${key}`} className="text-lg font-semibold">
                    {t(`groups.${key}`)}
                  </h2>
                  <ul className="space-y-3">
                    {list.map((incident) => (
                      <IncidentCard key={incident.id} incident={incident} />
                    ))}
                  </ul>
                </section>
              ),
          )}
        </>
      )}

      <ListPagination
        page={page}
        totalPages={result?.meta?.total_pages ?? 1}
        totalItems={result?.meta?.total_items ?? items.length}
      />
    </>
  );
}

async function IncidentCard({ incident }: { incident: Incident }) {
  const t = await getTranslations("incidentsAdmin");
  const latest = latestIncidentUpdate(incident);

  return (
    <li>
      <Link
        href={`/dashboard/admin/incidents/${incident.id}`}
        prefetch={false}
        className={cn(
          "bg-card hover:bg-muted/40 focus-visible:ring-ring/50 block space-y-2 rounded-xl border border-l-4 p-4 shadow-(--shadow-surface) transition-colors outline-none focus-visible:ring-3",
          isIncidentActive(incident)
            ? INCIDENT_IMPACT_ACCENTS[incident.impact]
            : "border-l-border",
        )}
      >
        <div className="flex flex-wrap items-center gap-1.5">
          <IncidentStatusBadge status={incident.status} />
          <IncidentImpactBadge impact={incident.impact} />
          <IncidentKindBadge kind={incident.kind} />
        </div>
        <p className="font-semibold break-words">{incident.title}</p>
        <div className="text-muted-foreground flex flex-wrap gap-x-4 gap-y-1 text-xs">
          <IncidentComponents components={incident.components} />
          {incident.scheduled_for && incident.scheduled_until ? (
            <span>
              {t("window")}:{" "}
              <ClientDate value={incident.scheduled_for} options={DATE_TIME} />{" "}
              –{" "}
              <ClientDate
                value={incident.scheduled_until}
                options={DATE_TIME}
              />
            </span>
          ) : (
            <span>
              {t("startedAt")}:{" "}
              <ClientDate
                value={incident.started_at ?? incident.created_at}
                options={DATE_TIME}
              />
            </span>
          )}
          {incident.resolved_at && (
            <span>
              {t("resolvedAt")}:{" "}
              <ClientDate value={incident.resolved_at} options={DATE_TIME} />
            </span>
          )}
        </div>
        {latest && (
          <div className="bg-muted/50 space-y-0.5 rounded-lg px-3 py-2">
            <p className="text-muted-foreground text-xs">
              {t("lastUpdate", { status: t(`statuses.${latest.status}`) })}
              {" · "}
              <ClientDate value={latest.created_at} options={DATE_TIME} />
            </p>
            <p className="line-clamp-2 text-sm break-words">{latest.body}</p>
          </div>
        )}
      </Link>
    </li>
  );
}
