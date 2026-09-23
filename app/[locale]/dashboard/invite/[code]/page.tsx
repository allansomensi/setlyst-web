import { staticTitle } from "@/lib/page-metadata";
import { AcceptInviteCard } from "./_components/accept-invite-card";

export async function generateMetadata() {
  return staticTitle("invite");
}

export default async function AcceptInvitePage({
  params,
}: {
  params: Promise<{ code: string }>;
}) {
  const { code } = await params;

  return (
    <div className="mx-auto flex max-w-md flex-col items-center justify-center space-y-6 py-16">
      <AcceptInviteCard code={code} />
    </div>
  );
}
