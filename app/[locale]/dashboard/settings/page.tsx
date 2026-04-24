import { fetchServerApi } from "@/lib/api-server";
import { UserPreferences } from "@/types/api";
import { SettingsForm } from "./_components/settings-form";
import { Separator } from "@/components/ui/separator";
import { getTranslations } from "next-intl/server";
import { cache } from "react";

const getPreferences = cache(() =>
  fetchServerApi<UserPreferences>("/users/me/preferences", {
    next: { revalidate: 0 },
  }),
);

export default async function SettingsPage() {
  const preferences = await getPreferences();
  const t = await getTranslations("settings");

  return (
    <div className="mx-auto max-w-4xl space-y-8 p-4">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">{t("title")}</h1>
        <p className="text-muted-foreground">{t("description")}</p>
      </div>

      <Separator />

      <SettingsForm initialPreferences={preferences} />
    </div>
  );
}
