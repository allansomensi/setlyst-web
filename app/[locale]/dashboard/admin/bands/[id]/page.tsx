import { AuditStamp } from "@/components/audit-stamp";
import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { getServerSession } from "next-auth";
import { getLocale, getTranslations } from "next-intl/server";
import { ListMusic, Music } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { BandAvatar } from "@/components/bands/band-avatar";
import { PageBreadcrumbs } from "@/components/page-breadcrumbs";
import { Link } from "@/i18n/routing";
import { ApiError, fetchServerApi } from "@/lib/api-server";
import { authOptions } from "@/lib/auth";
import { formatApiDateTime } from "@/lib/dates";
import type { AdminBandDetail } from "@/types/api";
import { BandAdminDangerZone } from "./_components/band-danger-zone";
import { BandAdminForm } from "./_components/band-admin-form";
import { BandAdminMembers } from "./_components/band-admin-members";

type Params = Promise<{ id: string }>;

async function loadBand(id: string): Promise<AdminBandDetail | null> {
  try {
    return await fetchServerApi<AdminBandDetail>(
      `/admin/bands/${encodeURIComponent(id)}`,
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
  const detail = await loadBand(id).catch(() => null);
  return { title: detail?.band.name ?? t("adminBands") };
}

export default async function AdminBandDetailPage({
  params,
}: {
  params: Params;
}) {
  const { id } = await params;
  const detail = await loadBand(id);
  if (!detail) notFound();

  const session = await getServerSession(authOptions);
  const isAdmin = session?.user.role === "admin";
  const t = await getTranslations("staff.bandDetail");
  const tNav = await getTranslations("nav");
  const locale = await getLocale();
  const { band, members } = detail;

  return (
    <>
      <PageBreadcrumbs
        items={[
          { label: tNav("adminBands"), href: "/dashboard/admin/bands" },
          { label: band.name },
        ]}
      />

      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-4">
          <BandAvatar
            name={band.name}
            logoUrl={band.logo_url}
            className="h-14 w-14"
          />
          <div className="min-w-0">
            <h1 className="truncate text-2xl font-bold tracking-tight">
              {band.name}
            </h1>
            <p className="text-muted-foreground text-sm">
              {t("meta", {
                members: band.member_count,
                created: formatApiDateTime(band.created_at, locale),
              })}
            </p>
            <AuditStamp
              updatedAt={band.updated_at}
              updatedBy={band.updated_by_username}
            />
          </div>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" asChild>
            <Link href={`/dashboard/admin/songs?band_id=${band.id}`}>
              <Music className="mr-2 h-4 w-4" />
              {t("songs", { count: band.song_count })}
            </Link>
          </Button>
          <Button variant="outline" asChild>
            <Link href={`/dashboard/admin/setlists?band_id=${band.id}`}>
              <ListMusic className="mr-2 h-4 w-4" />
              {t("setlists", { count: band.setlist_count })}
            </Link>
          </Button>
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-5">
        <Card className="lg:col-span-3">
          <CardHeader>
            <CardTitle>{t("members")}</CardTitle>
            <CardDescription>
              {isAdmin ? t("membersDescription") : t("readOnly")}
            </CardDescription>
          </CardHeader>
          <CardContent>
            <BandAdminMembers
              bandId={band.id}
              members={members}
              canEdit={isAdmin}
            />
          </CardContent>
        </Card>

        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle>{t("details")}</CardTitle>
          </CardHeader>
          <CardContent>
            <BandAdminForm band={band} canEdit={isAdmin} />
          </CardContent>
        </Card>
      </div>

      {isAdmin && <BandAdminDangerZone bandId={band.id} name={band.name} />}
    </>
  );
}
