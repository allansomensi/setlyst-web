import type { Metadata } from "next";
import { getLocale, getTranslations } from "next-intl/server";
import { Mail } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { ClientDate } from "@/components/client-date";
import { LoadErrorNotice } from "@/components/load-error-notice";
import { AdminPageHeader } from "@/components/staff/admin-page-header";
import { Kpi, KpiGrid } from "@/components/staff/kpi-grid";
import { ListPagination, ListToolbar } from "@/components/staff/list-controls";
import {
  hasListFilters,
  ListEmptyState,
} from "@/components/staff/list-empty-state";
import { adminListQuery, type ListSearchParams } from "@/lib/admin-list";
import { fetchServerApi } from "@/lib/api-server";
import { hourlyCapUsage, OUTBOX_STATUS_TONES } from "@/lib/platform-admin";
import { requireStaffPage } from "@/lib/staff-guard";
import { cn } from "@/lib/utils";
import type { PaginatedResponse } from "@/types/api";
import {
  OUTBOX_STATUSES,
  type OutboxEmail,
  type OutboxStatus,
  type OutboxSummary,
} from "@/types/operations";
import { EmailsTable } from "./_components/emails-table";
import { SendTestEmailButton } from "./_components/send-test-button";
import { EmailStatusFilter } from "./_components/status-filter";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("emailsAdmin");
  return { title: t("title") };
}

const BASE_PATH = "/dashboard/admin/emails";

function first(value: string | string[] | undefined) {
  return Array.isArray(value) ? value[0] : value;
}

/**
 * The e-mail console: how delivery is going (SMTP, the hourly cap, the
 * queue) and the outbox itself, filterable, with retry and cancel for
 * admins. Template variables are never shown (they can carry codes).
 */
export default async function EmailsPage({
  searchParams,
}: {
  searchParams: ListSearchParams;
}) {
  const { can } = await requireStaffPage("emails");
  const canWrite = can("emails.write");
  const t = await getTranslations("emailsAdmin");
  const locale = await getLocale();
  const number = new Intl.NumberFormat(locale);
  const params = await searchParams;
  const rawStatus = first(params.status);
  const status = (OUTBOX_STATUSES as readonly string[]).includes(
    rawStatus ?? "",
  )
    ? (rawStatus as OutboxStatus)
    : null;
  const { query, page } = adminListQuery(
    { ...params, status: status ?? undefined },
    ["q", "status", "template"],
  );

  const [summary, result] = await Promise.all([
    fetchServerApi<OutboxSummary>("/admin/emails/summary").catch(() => null),
    fetchServerApi<PaginatedResponse<OutboxEmail>>(
      `/admin/emails?${query}`,
    ).catch(() => null),
  ]);
  const emails = result?.data ?? [];
  const template = first(params.template)?.trim() || null;
  const templates = summary?.templates.map((row) => row.template) ?? [];
  if (template && !templates.includes(template)) templates.push(template);
  const capUsage = summary
    ? hourlyCapUsage(summary.sent_last_hour, summary.hourly_cap)
    : null;
  const filtered = hasListFilters(params);

  return (
    <>
      <AdminPageHeader
        title={t("title")}
        description={t("description")}
        actions={
          <SendTestEmailButton disabled={summary?.smtp_configured === false} />
        }
      />

      <section aria-labelledby="emails-summary" className="space-y-3">
        <h2 id="emails-summary" className="sr-only">
          {t("summary.title")}
        </h2>
        {summary === null ? (
          <LoadErrorNotice />
        ) : (
          <>
            <KpiGrid>
              <Kpi
                label={t("summary.smtp")}
                value={
                  summary.smtp_configured
                    ? t("summary.smtpOn")
                    : t("summary.smtpOff")
                }
                tone={
                  summary.smtp_configured
                    ? "text-emerald-600 dark:text-emerald-400"
                    : "text-destructive"
                }
                hint={
                  summary.smtp_configured && summary.from
                    ? t("summary.from", { from: summary.from })
                    : t("summary.smtpOffHint")
                }
              />
              <Kpi
                label={t("summary.lastHour")}
                value={
                  summary.hourly_cap > 0
                    ? t("summary.ofCap", {
                        sent: number.format(summary.sent_last_hour),
                        cap: number.format(summary.hourly_cap),
                      })
                    : number.format(summary.sent_last_hour)
                }
                tone={
                  capUsage !== null && capUsage >= 100
                    ? "text-destructive"
                    : capUsage !== null && capUsage >= 80
                      ? "text-amber-600 dark:text-amber-400"
                      : undefined
                }
                hint={
                  capUsage !== null && capUsage >= 100
                    ? t("summary.capReached")
                    : t("summary.capHint")
                }
              />
              <Kpi
                label={t("summary.oldestPending")}
                value={
                  summary.oldest_pending_at ? (
                    <ClientDate
                      value={summary.oldest_pending_at}
                      options={{ dateStyle: "short", timeStyle: "short" }}
                      className="text-lg"
                    />
                  ) : (
                    t("summary.queueEmpty")
                  )
                }
                hint={t("summary.pendingNow", {
                  count: summary.last_7d.pending,
                })}
              />
              <Kpi
                label={t("summary.failed24h")}
                value={number.format(summary.last_24h.failed)}
                tone={
                  summary.last_24h.failed > 0 ? "text-destructive" : undefined
                }
                hint={t("summary.sent24h", { count: summary.last_24h.sent })}
              />
            </KpiGrid>

            <div className="grid gap-3 md:grid-cols-2">
              <Card>
                <CardHeader>
                  <CardTitle className="text-sm">
                    {t("summary.byStatus")}
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>{t("table.status")}</TableHead>
                        <TableHead className="text-right">
                          {t("summary.last24h")}
                        </TableHead>
                        <TableHead className="text-right">
                          {t("summary.last7d")}
                        </TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {OUTBOX_STATUSES.map((s) => (
                        <TableRow key={s}>
                          <TableCell>
                            <span
                              className={cn(
                                "mr-2 inline-block size-2 rounded-full border",
                                OUTBOX_STATUS_TONES[s],
                              )}
                              aria-hidden
                            />
                            {t(`statuses.${s}`)}
                          </TableCell>
                          <TableCell className="text-right tabular-nums">
                            {number.format(summary.last_24h[s] ?? 0)}
                          </TableCell>
                          <TableCell className="text-right tabular-nums">
                            {number.format(summary.last_7d[s] ?? 0)}
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </CardContent>
              </Card>
              <Card>
                <CardHeader>
                  <CardTitle className="text-sm">
                    {t("summary.byTemplate")}
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  {summary.templates.length === 0 ? (
                    <p className="text-muted-foreground text-sm">
                      {t("summary.noTemplates")}
                    </p>
                  ) : (
                    <div className="max-h-72 overflow-y-auto">
                      <Table>
                        <TableHeader>
                          <TableRow>
                            <TableHead>{t("table.template")}</TableHead>
                            <TableHead className="text-right">
                              {t("statuses.sent")}
                            </TableHead>
                            <TableHead className="text-right">
                              {t("statuses.failed")}
                            </TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {summary.templates.map((row) => (
                            <TableRow key={row.template}>
                              <TableCell className="font-mono text-xs">
                                {row.template}
                              </TableCell>
                              <TableCell className="text-right tabular-nums">
                                {number.format(row.sent)}
                              </TableCell>
                              <TableCell
                                className={cn(
                                  "text-right tabular-nums",
                                  row.failed > 0 && "text-destructive",
                                )}
                              >
                                {number.format(row.failed)}
                              </TableCell>
                            </TableRow>
                          ))}
                        </TableBody>
                      </Table>
                    </div>
                  )}
                </CardContent>
              </Card>
            </div>
          </>
        )}
      </section>

      <section aria-labelledby="emails-outbox" className="space-y-3">
        <div className="space-y-1">
          <h2 id="emails-outbox" className="text-lg font-semibold">
            {t("outbox.title")}
          </h2>
          <p className="text-muted-foreground text-sm">
            {t("outbox.retention")}
          </p>
        </div>
        <ListToolbar
          placeholder={t("filters.search")}
          filters={[
            {
              param: "template",
              label: t("filters.template"),
              options: [
                { value: "all", label: t("filters.allTemplates") },
                ...templates.map((value) => ({ value, label: value })),
              ],
            },
          ]}
        />
        <EmailStatusFilter current={status} />

        {result === null ? (
          <LoadErrorNotice />
        ) : emails.length === 0 ? (
          <ListEmptyState
            compact={false}
            icon={Mail}
            title={t("outbox.empty")}
            filtered={filtered}
            clearHref={BASE_PATH}
            className="bg-card rounded-xl border border-dashed"
          />
        ) : (
          <EmailsTable emails={emails} canWrite={canWrite} />
        )}
        <ListPagination
          page={page}
          totalPages={result?.meta?.total_pages ?? 1}
          totalItems={result?.meta?.total_items ?? emails.length}
        />
      </section>
    </>
  );
}
