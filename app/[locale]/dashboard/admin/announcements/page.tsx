import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";
import {
  Bell,
  Mail,
  PanelTop,
  Plus,
  SquareStack,
  type LucideIcon,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { ClientDate } from "@/components/client-date";
import { Link } from "@/components/nav-link";
import { LoadErrorNotice } from "@/components/load-error-notice";
import { AdminPageHeader } from "@/components/staff/admin-page-header";
import { ListPagination } from "@/components/staff/list-controls";
import { AnnouncementLevelIcon } from "@/components/announcements/announcement-parts";
import { fetchServerApi } from "@/lib/api-server";
import { STATUS_BADGE_STYLES } from "@/lib/announcements";
import { requireStaffPage } from "@/lib/staff-guard";
import { cn } from "@/lib/utils";
import type { ListSearchParams } from "@/lib/admin-list";
import type { PaginatedResponse } from "@/types/api";
import {
  ANNOUNCEMENT_STATUSES,
  type AdminAnnouncement,
  type AnnouncementStatus,
} from "@/types/communication";
import { StatusTabs } from "./_components/status-tabs";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("announcements.admin");
  return { title: t("title") };
}

const PER_PAGE = 20;

function first(value: string | string[] | undefined) {
  return Array.isArray(value) ? value[0] : value;
}

const CHANNEL_ICONS: { key: keyof AdminAnnouncement; icon: LucideIcon }[] = [
  { key: "show_modal", icon: SquareStack },
  { key: "show_banner", icon: PanelTop },
  { key: "send_notification", icon: Bell },
  { key: "send_email", icon: Mail },
];

const CHANNEL_LABELS: Record<string, string> = {
  show_modal: "modal",
  show_banner: "banner",
  send_notification: "notification",
  send_email: "email",
};

function Stat({ label, value }: { label: string; value: number }) {
  return (
    <div className="min-w-16">
      <p className="text-base font-semibold tabular-nums">{value}</p>
      <p className="text-muted-foreground text-[11px]">{label}</p>
    </div>
  );
}

export default async function AdminAnnouncementsPage({
  searchParams,
}: {
  searchParams: ListSearchParams;
}) {
  await requireStaffPage("announcements");
  const t = await getTranslations("announcements.admin");
  const tStatus = await getTranslations("announcements.status");
  const raw = await searchParams;
  const statusParam = first(raw.status);
  const status = (ANNOUNCEMENT_STATUSES as readonly string[]).includes(
    statusParam ?? "",
  )
    ? (statusParam as AnnouncementStatus)
    : null;
  const page = Math.max(1, Number.parseInt(first(raw.page) ?? "1", 10) || 1);
  const query = new URLSearchParams({
    page: String(page),
    per_page: String(PER_PAGE),
  });
  if (status) query.set("status", status);

  const result = await fetchServerApi<PaginatedResponse<AdminAnnouncement>>(
    `/admin/announcements?${query}`,
  ).catch(() => null);
  const items = result?.data ?? [];

  return (
    <>
      <AdminPageHeader
        title={t("title")}
        description={t("description")}
        actions={
          <Button asChild>
            <Link href="/dashboard/admin/announcements/new">
              <Plus aria-hidden />
              {t("new")}
            </Link>
          </Button>
        }
      />

      <StatusTabs current={status} />

      {result === null ? (
        <LoadErrorNotice />
      ) : items.length === 0 ? (
        <div className="bg-card text-muted-foreground flex flex-col items-center gap-2 rounded-xl border border-dashed px-6 py-14 text-center">
          <p className="text-foreground font-medium">{t("emptyTitle")}</p>
          <p className="max-w-md text-sm">{t("emptyDescription")}</p>
        </div>
      ) : (
        <ul className="space-y-3">
          {items.map((a) => {
            const itemStatus = a.status ?? "draft";
            return (
              <li key={a.id}>
                <Card className="hover:border-primary/40 gap-0 py-0 transition-colors">
                  <CardContent className="p-0">
                    <Link
                      href={`/dashboard/admin/announcements/${a.id}`}
                      className="flex flex-col gap-4 p-5 md:flex-row md:items-center"
                    >
                      <div className="flex min-w-0 flex-1 items-start gap-3">
                        <AnnouncementLevelIcon
                          level={a.level}
                          className="mt-0.5 size-5 shrink-0"
                        />
                        <div className="min-w-0 space-y-1.5">
                          <div className="flex flex-wrap items-center gap-2">
                            <p className="truncate font-medium">{a.title}</p>
                            <Badge
                              variant="outline"
                              className={cn(STATUS_BADGE_STYLES[itemStatus])}
                            >
                              {tStatus(itemStatus)}
                            </Badge>
                            {a.requires_acknowledgement && (
                              <Badge variant="secondary">
                                {t("requiresAck")}
                              </Badge>
                            )}
                          </div>
                          <div className="text-muted-foreground flex flex-wrap items-center gap-x-3 gap-y-1 text-xs">
                            <span className="flex items-center gap-1">
                              {CHANNEL_ICONS.filter(({ key }) => a[key]).map(
                                ({ key, icon: Icon }) => (
                                  <Icon
                                    key={key}
                                    className="size-3.5"
                                    aria-label={t(
                                      `channels.${CHANNEL_LABELS[key]}`,
                                    )}
                                  />
                                ),
                              )}
                            </span>
                            <span>
                              {a.starts_at || a.published_at ? (
                                <ClientDate
                                  value={a.starts_at ?? a.published_at}
                                  options={{
                                    dateStyle: "short",
                                    timeStyle: "short",
                                  }}
                                />
                              ) : (
                                t("startsOnPublish")
                              )}
                              {" → "}
                              {a.ends_at ? (
                                <ClientDate
                                  value={a.ends_at}
                                  options={{
                                    dateStyle: "short",
                                    timeStyle: "short",
                                  }}
                                />
                              ) : (
                                t("noEnd")
                              )}
                            </span>
                            {a.updated_by_username && (
                              <span>
                                {t("updatedBy", {
                                  username: a.updated_by_username,
                                })}
                              </span>
                            )}
                          </div>
                        </div>
                      </div>
                      <div className="flex gap-4 md:justify-end">
                        <Stat
                          label={t("stats.targeted")}
                          value={a.stats.targeted}
                        />
                        <Stat label={t("stats.seen")} value={a.stats.seen} />
                        <Stat
                          label={t("stats.dismissed")}
                          value={a.stats.dismissed}
                        />
                        <Stat
                          label={t("stats.acknowledged")}
                          value={a.stats.acknowledged}
                        />
                      </div>
                    </Link>
                  </CardContent>
                </Card>
              </li>
            );
          })}
        </ul>
      )}

      <ListPagination
        page={page}
        totalPages={result?.meta?.total_pages ?? 1}
        totalItems={result?.meta?.total_items ?? items.length}
      />
    </>
  );
}
