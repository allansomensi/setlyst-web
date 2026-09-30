"use client";

import { useState, useTransition } from "react";
import { useTranslations } from "next-intl";
import { Check, Mail, X } from "lucide-react";
import type { SetlistInvitation } from "@/types/api";
import { Button } from "@/components/ui/button";
import { UserAvatar } from "@/components/user-avatar";
import { useOfflineDisabled } from "@/components/offline-disabled";
import { useAppRouter } from "@/hooks/use-app-router";
import { toast } from "@/lib/toast";
import { toastActionError } from "@/lib/action-toast";
import { acceptSetlistInvitation, declineSetlistInvitation } from "../actions";

/**
 * Invites to collaborate on someone else's setlist, waiting for an answer.
 * Accepting opens the setlist; it is listed with the person's own from
 * then on.
 */
export function SetlistInvitations({
  invitations,
}: {
  invitations: SetlistInvitation[];
}) {
  const t = useTranslations("setlists.collaborators");
  const router = useAppRouter();
  const offlineDisabled = useOfflineDisabled();
  const [isPending, startTransition] = useTransition();
  const [pendingId, setPendingId] = useState<string | null>(null);

  if (invitations.length === 0) return null;

  const answer = (invitation: SetlistInvitation, accept: boolean) => {
    setPendingId(invitation.setlist_id);
    startTransition(async () => {
      const result = accept
        ? await acceptSetlistInvitation(invitation.setlist_id)
        : await declineSetlistInvitation(invitation.setlist_id);
      // `pendingId` is left set: `isPending` alone ends the busy state,
      // once the revalidated list is in. Clearing it here re-enabled the
      // buttons while the answered invitation was still on screen, open
      // to a second tap.
      if (!result.success) {
        toastActionError(result, result.error);
        return;
      }
      if (accept) {
        toast.success(t("inviteAccepted"));
        router.push(`/dashboard/setlists/${invitation.setlist_id}`);
      } else {
        toast.success(t("inviteDeclined"));
      }
    });
  };

  return (
    <section
      aria-labelledby="setlist-invitations"
      className="border-primary/30 bg-primary/5 space-y-3 rounded-xl border p-4"
    >
      <h2
        id="setlist-invitations"
        className="flex items-center gap-2 text-sm font-semibold"
      >
        <Mail className="text-primary h-4 w-4" aria-hidden />
        {t("invitesTitle", { count: invitations.length })}
      </h2>
      <ul className="space-y-2">
        {invitations.map((invitation) => {
          const busy = isPending && pendingId === invitation.setlist_id;
          return (
            <li
              key={invitation.setlist_id}
              className="bg-card flex flex-col gap-3 rounded-lg border p-3 sm:flex-row sm:items-center"
            >
              <div className="flex min-w-0 flex-1 items-center gap-3">
                <UserAvatar
                  userId={invitation.owner_id}
                  name={invitation.owner_username}
                  avatarUrl={invitation.owner_avatar_url}
                  size="sm"
                />
                <div className="min-w-0">
                  <p
                    className="truncate font-medium"
                    title={invitation.setlist_title}
                  >
                    {invitation.setlist_title}
                  </p>
                  <p className="text-muted-foreground text-xs">
                    {t("inviteLine", {
                      username:
                        invitation.invited_by_username ??
                        invitation.owner_username,
                      role: t(`roles.${invitation.role}`),
                    })}
                  </p>
                </div>
              </div>
              <div className="flex shrink-0 gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  className="gap-1.5"
                  onClick={() => answer(invitation, false)}
                  disabled={busy || !!offlineDisabled.disabled}
                >
                  <X className="h-4 w-4" aria-hidden />
                  {t("decline")}
                </Button>
                <Button
                  size="sm"
                  className="gap-1.5"
                  onClick={() => answer(invitation, true)}
                  disabled={busy || !!offlineDisabled.disabled}
                >
                  <Check className="h-4 w-4" aria-hidden />
                  {t("accept")}
                </Button>
              </div>
            </li>
          );
        })}
      </ul>
    </section>
  );
}
