import { fetchServerApi, ApiError } from "@/lib/api-server";
import {
  BandWithMembership,
  BandMember,
  BandInvite,
  BandRolePermission,
} from "@/types/api";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { notFound } from "next/navigation";
import { Separator } from "@/components/ui/separator";
import { BandHeader } from "./_components/band-header";
import { BandMembersSection } from "./_components/band-members-section";
import { BandInvitesSection } from "./_components/band-invites-section";
import { BandPermissionsSection } from "./_components/band-permissions-section";
import { BandDangerZone } from "./_components/band-danger-zone";

export default async function BandDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;

  let band: BandWithMembership;
  try {
    band = await fetchServerApi<BandWithMembership>(`/bands/${id}`);
  } catch (err) {
    // A stale or inaccessible band id (e.g. from an old notification for a
    // band the user is no longer part of, or a malformed id) shouldn't
    // crash the page — degrade to the standard 404 instead.
    if (err instanceof ApiError && (err.status === 404 || err.status === 400)) {
      notFound();
    }
    throw err;
  }

  const canManage = band.my_role === "owner" || band.my_role === "admin";

  const [members, invites, permissions, session] = await Promise.all([
    fetchServerApi<BandMember[]>(`/bands/${id}/members`),
    canManage
      ? fetchServerApi<BandInvite[]>(`/bands/${id}/invites`)
      : Promise.resolve<BandInvite[]>([]),
    canManage
      ? fetchServerApi<BandRolePermission[]>(`/bands/${id}/permissions`)
      : Promise.resolve<BandRolePermission[]>([]),
    getServerSession(authOptions),
  ]);

  const currentUserId = session?.user?.id ?? "";

  return (
    <div className="mx-auto max-w-4xl space-y-8">
      <BandHeader band={band} />

      <Separator />

      <BandMembersSection
        band={band}
        members={members}
        currentUserId={currentUserId}
      />

      {canManage && (
        <>
          <Separator />
          <BandInvitesSection bandId={band.id} invites={invites} />

          <Separator />
          <BandPermissionsSection bandId={band.id} permissions={permissions} />
        </>
      )}

      <Separator />

      <BandDangerZone
        band={band}
        members={members}
        currentUserId={currentUserId}
      />
    </div>
  );
}
