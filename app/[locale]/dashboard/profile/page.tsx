import { staticTitle } from "@/lib/page-metadata";
import { fetchServerApi } from "@/lib/api-server";
import { User } from "@/types/api";
import { ProfileForm } from "./_components/profile-form";
import { ChangePasswordSection } from "./_components/change-password-section";
import { Separator } from "@/components/ui/separator";
import { getTranslations, getLocale } from "next-intl/server";
import { getUsernameCooldownInfo } from "@/lib/utils";
import { parseApiTimestamp } from "@/lib/dates";

export async function generateMetadata() {
  return staticTitle("profile");
}

export default async function ProfilePage() {
  const user = await fetchServerApi<User>("/users/me");
  const t = await getTranslations("profile");
  const locale = await getLocale();

  const registrationDate = new Intl.DateTimeFormat(locale, {
    month: "long",
    day: "numeric",
    year: "numeric",
  }).format(parseApiTimestamp(user.created_at));

  const { inCooldown, cooldownDate } = getUsernameCooldownInfo(
    user.username_changed_at,
    locale,
  );

  return (
    <div className="mx-auto max-w-4xl space-y-8 p-4">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">{t("title")}</h1>
        <p className="text-muted-foreground">{t("subtitle")}</p>
      </div>

      <Separator />

      <ProfileForm
        user={user}
        registrationDate={registrationDate}
        inCooldown={inCooldown}
        cooldownDate={cooldownDate}
      />

      <Separator />

      <ChangePasswordSection
        username={user.username}
        passwordChangedLabel={
          user.password_changed_at
            ? t("passwordChangedOn", {
                date: new Intl.DateTimeFormat(locale, {
                  dateStyle: "medium",
                }).format(parseApiTimestamp(user.password_changed_at)),
              })
            : null
        }
      />
    </div>
  );
}
