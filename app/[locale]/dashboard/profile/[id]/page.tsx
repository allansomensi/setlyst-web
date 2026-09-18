import { getServerSession } from "next-auth";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";
import { redirect } from "next/navigation";
import { fetchServerApi } from "@/lib/api-server";
import { UserProfileView } from "@/types/api";
import { Link } from "@/components/nav-link";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  ChevronLeft,
  User as UserIcon,
  CalendarDays,
  Mail,
  ShieldCheck,
} from "lucide-react";
import { getTranslations, getLocale } from "next-intl/server";

export default async function UserProfilePage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const session = await getServerSession(authOptions);

  // Viewing your own profile goes to the editable page instead.
  if (session?.user?.id === id) {
    redirect("/dashboard/profile");
  }

  const t = await getTranslations("userProfile");
  const locale = await getLocale();

  const profile = await fetchServerApi<UserProfileView>(`/users/${id}/profile`);

  const displayName =
    [profile.first_name, profile.last_name].filter(Boolean).join(" ") ||
    profile.username;

  const joinedDate = new Intl.DateTimeFormat(locale, {
    month: "long",
    day: "numeric",
    year: "numeric",
  }).format(new Date(profile.created_at));

  return (
    <div className="mx-auto max-w-2xl space-y-6 p-4">
      <Button variant="outline" size="icon" asChild>
        <Link href="/dashboard">
          <ChevronLeft className="h-4 w-4" />
        </Link>
      </Button>

      <Card>
        <CardContent className="flex flex-col items-center gap-4 pt-6 text-center">
          <div className="bg-muted border-primary/10 flex h-24 w-24 items-center justify-center rounded-full border-2">
            <UserIcon className="text-muted-foreground h-12 w-12" />
          </div>
          <div>
            <h1 className="text-2xl font-bold">{displayName}</h1>
            <p className="text-muted-foreground text-sm">@{profile.username}</p>
          </div>
          <div className="text-muted-foreground flex items-center gap-1.5 text-xs">
            <CalendarDays className="h-3.5 w-3.5" />
            {t("joinedOn", { date: joinedDate })}
          </div>
        </CardContent>
      </Card>

      {profile.admin_details && (
        <Card className="border-dashed">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <ShieldCheck className="text-primary h-4 w-4" />
              {t("adminSectionTitle")}
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3 text-sm">
            <div className="flex items-center justify-between">
              <span className="text-muted-foreground">{t("emailLabel")}</span>
              <span className="flex items-center gap-1.5">
                <Mail className="h-3.5 w-3.5" />
                {profile.admin_details.email ?? t("noEmail")}
              </span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-muted-foreground">{t("roleLabel")}</span>
              <Badge variant="secondary" className="capitalize">
                {profile.admin_details.role}
              </Badge>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-muted-foreground">{t("statusLabel")}</span>
              <Badge
                variant={
                  profile.admin_details.status === "active"
                    ? "secondary"
                    : "outline"
                }
                className="capitalize"
              >
                {profile.admin_details.status}
              </Badge>
            </div>
            {profile.admin_details.username_changed_at && (
              <div className="flex items-center justify-between">
                <span className="text-muted-foreground">
                  {t("usernameChangedLabel")}
                </span>
                <span>
                  {new Intl.DateTimeFormat(locale, {
                    dateStyle: "medium",
                  }).format(
                    new Date(profile.admin_details.username_changed_at),
                  )}
                </span>
              </div>
            )}

            <Button variant="outline" size="sm" asChild className="w-full">
              <Link href="/dashboard/users">{t("manageInUsers")}</Link>
            </Button>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
