import { cache } from "react";
import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { getTranslations } from "next-intl/server";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ClientDate } from "@/components/client-date";
import { DetailBackButton, DetailHeader } from "@/components/detail-header";
import { PageBreadcrumbs } from "@/components/page-breadcrumbs";
import { ApiError, fetchServerApi } from "@/lib/api-server";
import { INCIDENT_STATUS_TONES } from "@/lib/platform-admin";
import { requireStaffPage } from "@/lib/staff-guard";
import { cn } from "@/lib/utils";
import { isUuid } from "@/lib/uuid";
import type { Incident } from "@/types/operations";
import {
  IncidentComponents,
  IncidentImpactBadge,
  IncidentKindBadge,
  IncidentStatusBadge,
  StatusPageLink,
} from "../_components/incident-badges";
import { IncidentActions } from "./_components/incident-actions";
import { PostUpdateForm } from "./_components/post-update-form";

type Params = Promise<{ id: string }>;

const LIST_PATH = "/dashboard/admin/incidents";

const DATE_TIME: Intl.DateTimeFormatOptions = {
  dateStyle: "medium",
  timeStyle: "short",
};

// Request-scoped: generateMetadata and the page both need it.
const load = cache(async function load(id: string): Promise<Incident | null> {
  if (!isUuid(id)) return null;
  try {
    return await fetchServerApi<Incident>(
      `/admin/incidents/${encodeURIComponent(id)}`,
    );
  } catch (error) {
    if (
      error instanceof ApiError &&
      (error.status === 404 || error.status === 400)
    ) {
      return null;
    }
    throw error;
  }
});

export async function generateMetadata({
  params,
}: {
  params: Params;
}): Promise<Metadata> {
  const { id } = await params;
  const t = await getTranslations("incidentsAdmin");
  const incident = await load(id).catch(() => null);
  return { title: incident?.title ?? t("title") };
}

export default async function IncidentPage({ params }: { params: Params }) {
  const { can } = await requireStaffPage("incidents");
  const { id } = await params;
  const incident = await load(id);
  if (!incident) notFound();
  const t = await getTranslations("incidentsAdmin");

  const facts: { label: string; value: React.ReactNode }[] = [
    {
      label: t("details.kind"),
      value: <IncidentKindBadge kind={incident.kind} />,
    },
    {
      label: t("details.status"),
      value: <IncidentStatusBadge status={incident.status} />,
    },
    {
      label: t("details.impact"),
      value: <IncidentImpactBadge impact={incident.impact} />,
    },
    {
      label: t("details.components"),
      value: (
        <IncidentComponents
          components={incident.components}
          className="text-foreground text-sm"
        />
      ),
    },
    ...(incident.scheduled_for || incident.scheduled_until
      ? [
          {
            label: t("window"),
            value: (
              <>
                <ClientDate
                  value={incident.scheduled_for}
                  options={DATE_TIME}
                />{" "}
                –{" "}
                <ClientDate
                  value={incident.scheduled_until}
                  options={DATE_TIME}
                />
              </>
            ),
          },
        ]
      : []),
    ...(incident.started_at
      ? [
          {
            label: t("startedAt"),
            value: (
              <ClientDate value={incident.started_at} options={DATE_TIME} />
            ),
          },
        ]
      : []),
    ...(incident.resolved_at
      ? [
          {
            label: t("resolvedAt"),
            value: (
              <ClientDate value={incident.resolved_at} options={DATE_TIME} />
            ),
          },
        ]
      : []),
    {
      label: t("details.created"),
      value: <ClientDate value={incident.created_at} options={DATE_TIME} />,
    },
  ];

  return (
    <>
      <PageBreadcrumbs
        items={[
          { label: t("title"), href: LIST_PATH },
          { label: incident.title },
        ]}
      />

      <DetailHeader
        actions={
          <>
            <StatusPageLink />
            <IncidentActions
              incident={incident}
              canDelete={can("incidents.delete")}
            />
          </>
        }
      >
        <DetailBackButton href={LIST_PATH} label={t("title")} />
        <div className="min-w-0 space-y-2">
          <h1 className="text-2xl font-bold tracking-tight break-words sm:text-3xl">
            {incident.title}
          </h1>
          <div className="flex flex-wrap items-center gap-1.5">
            <IncidentStatusBadge status={incident.status} />
            <IncidentImpactBadge impact={incident.impact} />
            <IncidentKindBadge kind={incident.kind} />
          </div>
        </div>
      </DetailHeader>

      <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_20rem]">
        <div className="min-w-0 space-y-6">
          <PostUpdateForm
            key={`${incident.updated_at}:${incident.updates.length}`}
            incident={incident}
          />

          <section aria-labelledby="incident-timeline" className="space-y-3">
            <h2 id="incident-timeline" className="text-lg font-semibold">
              {t("timeline.title")}
            </h2>
            {incident.updates.length === 0 ? (
              <p className="text-muted-foreground text-sm">
                {t("timeline.empty")}
              </p>
            ) : (
              <ol className="relative space-y-4 border-l pl-5">
                {incident.updates.map((update) => (
                  <li key={update.id} className="relative space-y-1">
                    <span
                      aria-hidden
                      className={cn(
                        "absolute top-1.5 -left-[1.6rem] size-2.5 rounded-full border",
                        INCIDENT_STATUS_TONES[update.status],
                      )}
                    />
                    <div className="flex flex-wrap items-center gap-2">
                      <IncidentStatusBadge status={update.status} />
                      <ClientDate
                        value={update.created_at}
                        options={DATE_TIME}
                        className="text-muted-foreground text-xs"
                      />
                    </div>
                    <p className="text-sm break-words whitespace-pre-wrap">
                      {update.body}
                    </p>
                  </li>
                ))}
              </ol>
            )}
          </section>
        </div>

        <Card className="h-fit">
          <CardHeader>
            <CardTitle className="text-base">{t("details.title")}</CardTitle>
          </CardHeader>
          <CardContent>
            <dl className="space-y-3 text-sm">
              {facts.map((fact) => (
                <div key={fact.label} className="space-y-0.5">
                  <dt className="text-muted-foreground text-xs">
                    {fact.label}
                  </dt>
                  <dd>{fact.value}</dd>
                </div>
              ))}
            </dl>
          </CardContent>
        </Card>
      </div>
    </>
  );
}
