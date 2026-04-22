import { fetchServerApi } from "@/lib/api-server";
import { User } from "@/types/api";
import { ProfileForm } from "./_components/profile-form";
import { Separator } from "@/components/ui/separator";
import { getTranslations } from "next-intl/server";

export default async function ProfilePage() {
  const user = await fetchServerApi<User>("/users/me");
  const t = await getTranslations("profile");

  return (
    <div className="mx-auto max-w-4xl space-y-8 p-4">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">{t("title")}</h1>
        <p className="text-muted-foreground">{t("subtitle")}</p>
      </div>

      <Separator />

      <ProfileForm user={user} />
    </div>
  );
}
