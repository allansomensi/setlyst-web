import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { getServerSession } from "next-auth";
import { getLocale, getTimeZone, getTranslations } from "next-intl/server";
import { Ban, Flag, KeyRound } from "lucide-react";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Link } from "@/components/nav-link";
import { PageBreadcrumbs } from "@/components/page-breadcrumbs";
import { PlatformRoleBadge } from "@/components/role-badge";
import { QuotaUsageList } from "@/components/quota-usage-list";
import { AuditEntry } from "@/components/staff/audit-entry";
import { UserStatusBadges } from "@/components/staff/user-status-badges";
import { ViewAsButton } from "@/components/impersonation/view-as-button";
import { redirect } from "@/i18n/routing";
import { ApiError, fetchServerApi } from "@/lib/api-server";
import { authOptions } from "@/lib/auth";
import { formatApiDate, formatApiDateTime } from "@/lib/dates";
import { pickLocalized } from "@/lib/localized";
import { getPlanOptions } from "@/lib/staff-data";
import { canAdministerUser, isStaffRole } from "@/lib/staff-permissions";
import { moderationQueueHref } from "@/lib/moderation";
import type {
  AdminUserOverview,
  QuotaLimits,
  UserProfileView,
} from "@/types/api";
import type { AdminSubscriptionView } from "@/types/staff";
import { getUserAuditTrail, getUsernameHistory } from "../actions";
import { UserActionsMenu } from "../_components/user-actions-menu";
import { DangerZone } from "./_components/danger-zone";
import { QuotaEditor } from "./_components/quota-editor";
import { SubscriptionCard } from "./_components/subscription-card";
import { UserBandsSection } from "./_components/user-bands-section";

type Params = Promise<{ locale: string; id: string }>;

async function loadOverview(id: string): Promise<AdminUserOverview | null> {
  try {
    return await fetchServerApi<AdminUserOverview>(
      `/users/${encodeURIComponent(id)}/overview`,
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
}

export async function generateMetadata({
  params,
}: {
  params: Params;
}): Promise<Metadata> {
  const { id } = await params;
  const t = await getTranslations("metadata");
  const overview = await loadOverview(id).catch(() => null);
  return {
    title: overview ? `@${overview.user.username}` : t("users"),
  };
}

function Field({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="space-y-0.5">
      <dt className="text-muted-foreground text-xs">{label}</dt>
      <dd className="text-sm break-words">{value || "—"}</dd>
    </div>
  );
}

export default async function UserDetailPage({ params }: { params: Params }) {
  const { locale: routeLocale, id } = await params;
  const session = await getServerSession(authOptions);
  if (!session || !isStaffRole(session.user.role)) {
    return redirect({ href: "/dashboard", locale: routeLocale });
  }

  const overview = await loadOverview(id);
  if (!overview) notFound();

  const t = await getTranslations("staff.userDetail");
  const tNav = await getTranslations("nav");
  const locale = await getLocale();
  const timeZone = await getTimeZone();
  const actor = { id: session.user.id, role: session.user.role };
  const isAdmin = actor.role === "admin";
  const { user, usage, quota_settings: quotaSettings, bands } = overview;
  // Deleting and "view as" are admin-only (and so is the audit log); the
  // rest of what staff may do is in UserActionsMenu.
  const administrable = canAdministerUser(actor, user);

  const [
    history,
    auditTrail,
    quotaDefaults,
    subscription,
    profile,
    planOptions,
  ] = await Promise.all([
    getUsernameHistory(user.id),
    isAdmin ? getUserAuditTrail(user.id) : Promise.resolve([]),
    isAdmin
      ? fetchServerApi<QuotaLimits>("/admin/settings/quotas").catch(() => null)
      : Promise.resolve(null),
    fetchServerApi<AdminSubscriptionView>(
      `/admin/users/${encodeURIComponent(user.id)}/subscription`,
    ).catch(() => null),
    fetchServerApi<
      UserProfileView & { admin_details: { open_flags?: number } | null }
    >(`/users/${encodeURIComponent(user.id)}/profile`).catch(() => null),
    getPlanOptions(),
  ]);
  const openFlags = profile?.admin_details?.open_flags ?? null;
  const tModeration = await getTranslations("moderation.userSummary");

  const fullName = [user.first_name, user.last_name].filter(Boolean).join(" ");

  return (
    <div className="mx-auto w-full max-w-5xl space-y-6">
      <PageBreadcrumbs
        items={[
          { label: tNav("adminUsers"), href: "/dashboard/users" },
          { label: `@${user.username}` },
        ]}
      />

      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div className="flex items-center gap-4">
          <div
            className="bg-muted text-muted-foreground flex h-14 w-14 shrink-0 items-center justify-center rounded-full text-xl font-semibold uppercase"
            aria-hidden
          >
            {user.username.slice(0, 1)}
          </div>
          <div className="min-w-0 space-y-1.5">
            <h1 className="truncate text-2xl font-bold tracking-tight">
              {fullName || user.username}
            </h1>
            <p className="text-muted-foreground text-sm">@{user.username}</p>
            <div className="flex flex-wrap items-center gap-1.5">
              <PlatformRoleBadge role={user.role} />
              <UserStatusBadges user={user} />
            </div>
          </div>
        </div>
        <div className="flex shrink-0 gap-2">
          {administrable && (
            <ViewAsButton
              userId={user.id}
              username={user.username}
              disabled={user.status !== "active" || user.is_banned}
            />
          )}
          <UserActionsMenu user={user} actor={actor} variant="button" />
        </div>
      </div>

      {user.is_banned && (
        <Alert variant="destructive">
          <Ban className="h-4 w-4" />
          <AlertTitle>
            {user.banned_until
              ? t("bannedUntil", {
                  date: formatApiDateTime(user.banned_until, locale, timeZone),
                })
              : t("bannedPermanent")}
          </AlertTitle>
          <AlertDescription>
            {t("bannedBy", {
              username: user.banned_by_username ?? "—",
              date: formatApiDateTime(user.banned_at, locale, timeZone),
            })}
            {user.ban_reason && (
              <> {t("reason", { reason: user.ban_reason })}</>
            )}
          </AlertDescription>
        </Alert>
      )}

      {user.must_change_password && (
        <Alert>
          <KeyRound className="h-4 w-4" />
          <AlertTitle>{t("mustChangeTitle")}</AlertTitle>
          <AlertDescription>{t("mustChangeDescription")}</AlertDescription>
        </Alert>
      )}

      <div className="grid gap-6 lg:grid-cols-5">
        <div className="space-y-6 lg:col-span-3">
          <Card>
            <CardHeader>
              <CardTitle>{t("account")}</CardTitle>
            </CardHeader>
            <CardContent>
              <dl className="grid gap-4 sm:grid-cols-2">
                <Field label={t("email")} value={user.email} />
                <Field label={t("name")} value={fullName} />
                <Field
                  label={t("created")}
                  value={
                    user.created_by_username
                      ? t("createdBy", {
                          date: formatApiDate(user.created_at, locale, {
                            dateStyle: "medium",
                            timeZone,
                          }),
                          username: user.created_by_username,
                        })
                      : t("selfRegistered", {
                          date: formatApiDate(user.created_at, locale, {
                            dateStyle: "medium",
                            timeZone,
                          }),
                        })
                  }
                />
                <Field
                  label={t("lastLogin")}
                  value={
                    user.last_login_at
                      ? formatApiDateTime(user.last_login_at, locale, timeZone)
                      : t("never")
                  }
                />
                <Field
                  label={t("passwordChanged")}
                  value={
                    user.password_changed_at
                      ? formatApiDateTime(
                          user.password_changed_at,
                          locale,
                          timeZone,
                        )
                      : t("never")
                  }
                />
                <Field
                  label={t("usernameChanged")}
                  value={
                    user.username_changed_at
                      ? formatApiDate(user.username_changed_at, locale, {
                          dateStyle: "medium",
                          timeZone,
                        })
                      : t("never")
                  }
                />
                <Field
                  label={t("lastModified")}
                  value={
                    user.updated_by_username
                      ? t("modifiedBy", {
                          date: formatApiDateTime(
                            user.updated_at,
                            locale,
                            timeZone,
                          ),
                          username: user.updated_by_username,
                        })
                      : formatApiDateTime(user.updated_at, locale, timeZone)
                  }
                />
                <Field
                  label={t("id")}
                  value={<code className="text-xs">{user.id}</code>}
                />
              </dl>
            </CardContent>
          </Card>

          {isAdmin && (
            <Card>
              <CardHeader>
                <CardTitle>{t("activity")}</CardTitle>
                <CardDescription>{t("activityDescription")}</CardDescription>
              </CardHeader>
              <CardContent>
                {auditTrail.length === 0 ? (
                  <p className="text-muted-foreground text-sm">
                    {t("noActivity")}
                  </p>
                ) : (
                  <div className="divide-y">
                    {auditTrail.map((entry) => (
                      <AuditEntry
                        key={entry.id}
                        entry={entry}
                        showTarget={false}
                      />
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          )}

          <Card>
            <CardHeader>
              <CardTitle>{t("usernameHistory")}</CardTitle>
            </CardHeader>
            <CardContent>
              {history.length === 0 ? (
                <p className="text-muted-foreground text-sm">
                  {t("usernameHistoryEmpty")}
                </p>
              ) : (
                <ul className="divide-y text-sm">
                  {history
                    .slice()
                    .reverse()
                    .map((entry) => (
                      <li
                        key={`${entry.old_username}-${entry.changed_at}`}
                        className="flex items-center justify-between gap-3 py-2"
                      >
                        <span className="font-mono">{entry.old_username}</span>
                        <span className="text-muted-foreground text-xs">
                          {formatApiDate(entry.changed_at, locale, {
                            dateStyle: "medium",
                            timeZone,
                          })}
                        </span>
                      </li>
                    ))}
                </ul>
              )}
            </CardContent>
          </Card>
        </div>

        <div className="space-y-6 lg:col-span-2">
          <SubscriptionCard
            userId={user.id}
            username={user.username}
            view={subscription}
            canManage={isAdmin}
            plans={planOptions.map((p) => ({
              code: p.code,
              name: pickLocalized(p.name, locale) || p.code,
            }))}
          />

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Flag className="text-muted-foreground size-4" aria-hidden />
                {tModeration("title")}
              </CardTitle>
              <CardDescription>
                {openFlags === null
                  ? tModeration("unavailable")
                  : openFlags > 0
                    ? tModeration("open", { count: openFlags })
                    : tModeration("none")}
              </CardDescription>
            </CardHeader>
            <CardContent className="flex flex-wrap gap-2">
              <Button
                asChild
                size="sm"
                variant={openFlags ? "default" : "outline"}
              >
                <Link href={moderationQueueHref(user.id)}>
                  {tModeration("openQueue")}
                </Link>
              </Button>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>{t("usage")}</CardTitle>
              <CardDescription>{t("usageDescription")}</CardDescription>
            </CardHeader>
            <CardContent>
              <QuotaUsageList report={usage} />
            </CardContent>
          </Card>

          {isAdmin && (
            <Card>
              <CardHeader>
                <CardTitle>{t("limits")}</CardTitle>
                <CardDescription>{t("limitsDescription")}</CardDescription>
              </CardHeader>
              <CardContent>
                <QuotaEditor
                  userId={user.id}
                  settings={quotaSettings}
                  defaults={quotaDefaults}
                />
              </CardContent>
            </Card>
          )}

          <Card>
            <CardHeader>
              <CardTitle>{t("bands")}</CardTitle>
            </CardHeader>
            <CardContent>
              <UserBandsSection
                userId={user.id}
                username={user.username}
                bands={bands}
                canAdd={isAdmin}
              />
            </CardContent>
          </Card>
        </div>
      </div>

      {administrable && (
        <DangerZone userId={user.id} username={user.username} />
      )}
    </div>
  );
}
