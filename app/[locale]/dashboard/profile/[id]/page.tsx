import { notFoundOnMissing } from "@/lib/api-not-found";
import { notFound } from "next/navigation";
import { isUuid } from "@/lib/uuid";
import { getLocale, getTimeZone, getTranslations } from "next-intl/server";
import {
  CalendarDays,
  ChevronLeft,
  Flag,
  Mail,
  MapPin,
  Music2,
  Pencil,
  ShieldCheck,
  Users,
} from "lucide-react";
import { entityTitle } from "@/lib/page-metadata";
import { formatApiDate } from "@/lib/dates";
import { isStaffRole } from "@/lib/staff-permissions";
import type { UserProfileView } from "@/types/api";
import { Link } from "@/components/nav-link";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { UserAvatar } from "@/components/user-avatar";
import { BandAvatar } from "@/components/bands/band-avatar";
import { ReportProfileButton } from "./_components/report-profile-dialog";
import { getSession } from "@/lib/server/session";
import { fetchServerApiOnce } from "@/lib/server-data";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  // Route params are attacker-chosen and reach API paths: anything but a
  // UUID (`<id>?per_page=…`, `<id>#`) is not a page of this app.
  if (!isUuid(id)) notFound();
  return entityTitle<UserProfileView>(
    `/users/${id}/profile`,
    (p) => p.username,
    "userProfile",
    "profile",
  );
}

export default async function UserProfilePage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  // Route params are attacker-chosen and reach API paths: anything but a
  // UUID (`<id>?per_page=…`, `<id>#`) is not a page of this app.
  if (!isUuid(id)) notFound();
  const session = await getSession();
  const t = await getTranslations("userProfile");
  const tRoles = await getTranslations("roles");
  const locale = await getLocale();
  const timeZone = await getTimeZone();

  // A deleted account, a malformed id or a profile the viewer can't see
  // is a 404, not the generic error screen.
  const profile = await fetchServerApiOnce<UserProfileView>(
    `/users/${id}/profile`,
  ).catch(notFoundOnMissing);
  const isSelf = profile.is_self || session?.user?.id === profile.id;
  const viewerIsStaff = isStaffRole(session?.user?.role);

  const displayName =
    [profile.first_name, profile.last_name].filter(Boolean).join(" ") ||
    profile.username;
  const memberSince = formatApiDate(
    profile.member_since ?? profile.created_at,
    locale,
    {
      month: "long",
      year: "numeric",
      timeZone,
    },
  );
  const admin = profile.admin_details;

  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <Button variant="ghost" size="sm" asChild className="-ml-2">
        <Link href="/dashboard">
          <ChevronLeft className="mr-1 size-4" />
          {t("back")}
        </Link>
      </Button>

      <Card className="overflow-hidden pt-0">
        <div className="from-primary/25 via-primary/10 h-24 bg-gradient-to-br to-transparent" />
        <CardContent className="-mt-14 space-y-5">
          <div className="flex flex-col items-center gap-3 text-center sm:flex-row sm:items-end sm:text-left">
            <UserAvatar
              userId={profile.id}
              name={displayName}
              avatarUrl={profile.avatar_url}
              size="xl"
              className="ring-card size-28 text-4xl ring-4"
            />
            <div className="min-w-0 flex-1 sm:pb-1">
              <h1 className="truncate text-2xl font-bold">{displayName}</h1>
              <p className="text-muted-foreground truncate text-sm">
                @{profile.username}
              </p>
            </div>
            <div className="sm:pb-1">
              {isSelf ? (
                <Button variant="outline" size="sm" asChild>
                  <Link href="/dashboard/profile">
                    <Pencil className="mr-1.5 size-4" />
                    {t("editOwn")}
                  </Link>
                </Button>
              ) : (
                <ReportProfileButton
                  userId={profile.id}
                  username={profile.username}
                />
              )}
            </div>
          </div>

          {isSelf && (
            <p className="bg-muted/50 text-muted-foreground rounded-lg px-3 py-2 text-center text-xs">
              {t("selfNotice")}
            </p>
          )}

          {profile.bio && (
            <p className="text-sm leading-relaxed whitespace-pre-line">
              {profile.bio}
            </p>
          )}

          <div className="text-muted-foreground flex flex-wrap gap-x-5 gap-y-2 text-sm">
            {profile.location && (
              <span className="flex items-center gap-1.5">
                <MapPin className="size-4" />
                {profile.location}
              </span>
            )}
            <span className="flex items-center gap-1.5">
              <CalendarDays className="size-4" />
              {t("joinedOn", { date: memberSince })}
            </span>
          </div>

          {profile.instruments.length > 0 && (
            <div className="space-y-2">
              <p className="flex items-center gap-1.5 text-sm font-medium">
                <Music2 className="size-4" />
                {t("instruments")}
              </p>
              <ul className="flex flex-wrap gap-1.5">
                {profile.instruments.map((instrument) => (
                  <li
                    key={instrument}
                    className="bg-secondary text-secondary-foreground rounded-full px-3 py-1 text-xs font-medium"
                  >
                    {instrument}
                  </li>
                ))}
              </ul>
            </div>
          )}
        </CardContent>
      </Card>

      {!isSelf && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <Users className="text-primary size-4" />
              {t("bandsInCommon")}
            </CardTitle>
          </CardHeader>
          <CardContent>
            {profile.bands_in_common.length === 0 ? (
              <p className="text-muted-foreground text-sm">
                {t("noBandsInCommon")}
              </p>
            ) : (
              <ul className="grid gap-2 sm:grid-cols-2">
                {profile.bands_in_common.map((band) => (
                  <li key={band.id}>
                    <Link
                      href={`/dashboard/bands/${band.id}`}
                      className="hover:bg-muted/50 focus-visible:ring-ring/50 flex items-center gap-3 rounded-lg border p-2.5 text-sm font-medium transition-colors outline-none focus-visible:ring-3"
                    >
                      <BandAvatar
                        bandId={band.id}
                        name={band.name}
                        logoUrl={band.logo_url}
                        className="size-8"
                      />
                      <span className="truncate">{band.name}</span>
                    </Link>
                  </li>
                ))}
              </ul>
            )}
          </CardContent>
        </Card>
      )}

      {admin && viewerIsStaff && (
        <Card className="border-dashed">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <ShieldCheck className="text-primary size-4" />
              {t("adminSectionTitle")}
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3 text-sm">
            <div className="flex items-center justify-between gap-3">
              <span className="text-muted-foreground">{t("emailLabel")}</span>
              <span className="flex min-w-0 items-center gap-1.5">
                <Mail className="size-3.5 shrink-0" />
                <span className="truncate">{admin.email ?? t("noEmail")}</span>
              </span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-muted-foreground">{t("roleLabel")}</span>
              <Badge variant="secondary">{tRoles(admin.role)}</Badge>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-muted-foreground">{t("statusLabel")}</span>
              <Badge
                variant={admin.status === "active" ? "secondary" : "outline"}
              >
                {admin.is_banned
                  ? t("statusBanned")
                  : t(`statuses.${admin.status}`)}
              </Badge>
            </div>
            {admin.last_login_at && (
              <div className="flex items-center justify-between">
                <span className="text-muted-foreground">
                  {t("lastLoginLabel")}
                </span>
                <span>
                  {formatApiDate(admin.last_login_at, locale, {
                    dateStyle: "medium",
                    timeZone,
                  })}
                </span>
              </div>
            )}
            {admin.username_changed_at && (
              <div className="flex items-center justify-between">
                <span className="text-muted-foreground">
                  {t("usernameChangedLabel")}
                </span>
                <span>
                  {formatApiDate(admin.username_changed_at, locale, {
                    dateStyle: "medium",
                    timeZone,
                  })}
                </span>
              </div>
            )}
            {typeof admin.open_flags === "number" && admin.open_flags > 0 && (
              <div className="flex items-center justify-between">
                <span className="text-muted-foreground flex items-center gap-1.5">
                  <Flag className="size-3.5" />
                  {t("openFlags")}
                </span>
                <Badge className="bg-amber-500/15 text-amber-800 dark:text-amber-300">
                  {admin.open_flags}
                </Badge>
              </div>
            )}
            <Button variant="outline" size="sm" asChild className="w-full">
              <Link href={`/dashboard/users/${profile.id}`}>
                {t("manageInUsers")}
              </Link>
            </Button>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
