import { fetchServerApi } from "@/lib/api-server";
import { BandWithMembership, BandMember, BandInvite } from "@/types/api";
import { getServerSession } from "next-auth";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";
import { Separator } from "@/components/ui/separator";
import { BandHeader } from "./_components/band-header";
import { BandMembersSection } from "./_components/band-members-section";
import { BandInvitesSection } from "./_components/band-invites-section";
import { BandDangerZone } from "./_components/band-danger-zone";

export default async function BandDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;

  const band = await fetchServerApi<BandWithMembership>(`/bands/${id}`);
  const canManage = band.my_role === "owner" || band.my_role === "admin";

  const [members, invites, session] = await Promise.all([
    fetchServerApi<BandMember[]>(`/bands/${id}/members`),
    canManage
      ? fetchServerApi<BandInvite[]>(`/bands/${id}/invites`)
      : Promise.resolve<BandInvite[]>([]),
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
