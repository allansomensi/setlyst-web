import { getLocale, getTranslations } from "next-intl/server";
import {
  CalendarDays,
  ChevronRight,
  ExternalLink,
  MapPin,
  ShieldCheck,
} from "lucide-react";
import { staticTitle } from "@/lib/page-metadata";
import { getMe } from "@/lib/server-data";
import { getUsernameCooldownInfo } from "@/lib/utils";
import { formatApiDate } from "@/lib/dates";
import { Card, CardContent } from "@/components/ui/card";
import { Link } from "@/components/nav-link";
import { PlatformRoleBadge } from "@/components/role-badge";
import { UserAvatar } from "@/components/user-avatar";
import { AvatarCard } from "./_components/avatar-card";
import { EmailCard } from "./_components/email-card";
import { ProfileForm } from "./_components/profile-form";

export async function generateMetadata() {
  return staticTitle("profile");
}

export default async function ProfilePage() {
  const user = await getMe();
  const t = await getTranslations("profile");
  const locale = await getLocale();

  const { inCooldown, cooldownDate } = getUsernameCooldownInfo(
    user.username_changed_at,
    locale,
  );
  const displayName =
    [user.first_name, user.last_name].filter(Boolean).join(" ") ||
    user.username;

  return (
    <div className="mx-auto max-w-5xl space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">{t("title")}</h1>
        <p className="text-muted-foreground">{t("subtitle")}</p>
      </div>

      <div className="grid gap-6 lg:grid-cols-[18rem_minmax(0,1fr)]">
        <aside className="space-y-4 lg:sticky lg:top-0 lg:self-start">
          <Card className="overflow-hidden pt-0">
            <div className="from-primary/25 via-primary/10 h-20 bg-gradient-to-br to-transparent" />
            <CardContent className="-mt-12 flex flex-col items-center gap-3 text-center">
              <UserAvatar
                userId={user.id}
                name={displayName}
                avatarUrl={user.avatar_url}
                size="xl"
                className="ring-card size-24 text-3xl ring-4"
              />
              <div className="min-w-0">
                <p className="truncate text-lg font-semibold">{displayName}</p>
                <p className="text-muted-foreground truncate text-sm">
                  @{user.username}
                </p>
              </div>
              <PlatformRoleBadge role={user.role} />
              {user.bio && (
                <p className="text-muted-foreground text-sm whitespace-pre-line">
                  {user.bio}
                </p>
              )}
              <div className="text-muted-foreground flex flex-col items-center gap-1 text-xs">
                {user.location && (
                  <span className="flex items-center gap-1.5">
                    <MapPin className="size-3.5" />
                    {user.location}
                  </span>
                )}
                <span className="flex items-center gap-1.5">
                  <CalendarDays className="size-3.5" />
                  {t("joinedOn", {
                    date: formatApiDate(user.created_at, locale, {
                      month: "long",
                      year: "numeric",
                    }),
                  })}
                </span>
              </div>
              {user.instruments.length > 0 && (
                <ul className="flex flex-wrap justify-center gap-1.5">
                  {user.instruments.map((instrument) => (
                    <li
                      key={instrument}
                      className="bg-secondary text-secondary-foreground rounded-full px-2.5 py-0.5 text-xs font-medium"
                    >
                      {instrument}
                    </li>
                  ))}
                </ul>
              )}
              <Link
                href={`/dashboard/profile/${user.id}`}
                className="text-primary inline-flex items-center gap-1 text-xs font-medium hover:underline"
              >
                {t("viewPublic")}
                <ExternalLink className="size-3" />
              </Link>
            </CardContent>
          </Card>

          <Link
            href="/dashboard/settings#security"
            className="bg-card hover:bg-muted/50 focus-visible:ring-ring/50 flex items-center gap-3 rounded-xl border p-4 text-sm transition-colors outline-none focus-visible:ring-3"
          >
            <ShieldCheck className="text-primary size-5 shrink-0" />
            <span className="min-w-0 flex-1">
              <span className="block font-medium">{t("securityLink")}</span>
              <span className="text-muted-foreground block text-xs">
                {t("securityLinkHint")}
              </span>
            </span>
            <ChevronRight className="text-muted-foreground size-4" />
          </Link>
        </aside>

        <div className="min-w-0 space-y-6">
          <AvatarCard
            userId={user.id}
            name={displayName}
            avatarUrl={user.avatar_url}
          />
          <ProfileForm
            user={user}
            inCooldown={inCooldown}
            cooldownDate={cooldownDate}
          />
          <EmailCard
            email={user.email}
            verified={user.email_verified}
            passwordSet={user.password_set}
            username={user.username}
          />
        </div>
      </div>
    </div>
  );
}
