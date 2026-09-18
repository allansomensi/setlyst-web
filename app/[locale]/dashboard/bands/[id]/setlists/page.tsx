import { fetchServerApi } from "@/lib/api-server";
import {
  BandWithMembership,
  PaginatedResponse,
  Setlist,
  BAND_ROLE_LEVEL,
} from "@/types/api";
import { SetlistsTable } from "@/app/[locale]/dashboard/setlists/_components/setlists-table";
import { Button } from "@/components/ui/button";
import { Link } from "@/components/nav-link";
import { ChevronLeft } from "lucide-react";
import { getTranslations } from "next-intl/server";

export default async function BandSetlistsPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const t = await getTranslations("bands");

  const [band, setlistsRes] = await Promise.all([
    fetchServerApi<BandWithMembership>(`/bands/${id}`),
    fetchServerApi<PaginatedResponse<Setlist>>(
      `/bands/${id}/setlists?page=1&per_page=100`,
    ),
  ]);

  const setlists = setlistsRes.data || [];
  const canManage =
    BAND_ROLE_LEVEL[band.my_role] >= BAND_ROLE_LEVEL.moderator ||
    (band.my_role === "member" && band.members_can_manage_setlists);

  return (
    <div className="w-full space-y-6">
      <div className="flex items-center gap-4">
        <Button variant="outline" size="icon" asChild>
          <Link href={`/dashboard/bands/${id}`}>
            <ChevronLeft className="h-4 w-4" />
          </Link>
        </Button>
        <div>
          <p className="text-muted-foreground text-sm">{band.name}</p>
          <h1 className="text-2xl font-bold tracking-tight">
            {t("bandSetlistsTitle")}
          </h1>
        </div>
      </div>

      <SetlistsTable
        initialSetlists={setlists}
        bandId={id}
        bandsById={{ [id]: { name: band.name, canManage } }}
      />
    </div>
  );
}
