import { fetchServerApi } from "@/lib/api-server";
import { Setlist, SetlistItem } from "@/types/api";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { ChevronLeft } from "lucide-react";
import { getTranslations } from "next-intl/server";
import { SetlistTempoChart } from "./_components/setlist-tempo-chart";

export default async function SetlistAnalyticsPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const t = await getTranslations("setlists.analytics");

  const [setlist, items] = await Promise.all([
    fetchServerApi<Setlist>(`/setlists/${id}`),
    fetchServerApi<SetlistItem[]>(`/setlists/${id}/items`),
  ]);

  return (
    <div className="w-full space-y-6">
      <div className="flex items-center gap-4">
        <Button variant="outline" size="icon" asChild>
          <Link href={`/dashboard/setlists/${id}`}>
            <ChevronLeft className="h-4 w-4" />
          </Link>
        </Button>
        <div>
          <p className="text-muted-foreground text-sm">{setlist.title}</p>
          <h1 className="text-2xl font-bold tracking-tight">{t("title")}</h1>
        </div>
      </div>

      <SetlistTempoChart items={items} />
    </div>
  );
}
