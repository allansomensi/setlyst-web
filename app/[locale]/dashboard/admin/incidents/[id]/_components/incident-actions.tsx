"use client";

import { useState, useTransition } from "react";
import { Pencil, Trash2 } from "lucide-react";
import { useTranslations } from "next-intl";
import { Button } from "@/components/ui/button";
import { ConfirmDialog } from "@/components/staff/confirm-dialog";
import { useRouter } from "@/i18n/routing";
import { toastActionError } from "@/lib/action-toast";
import { toast } from "@/lib/toast";
import type { Incident } from "@/types/operations";
import { deleteIncident } from "../../actions";
import { IncidentDialog } from "../../_components/incident-dialogs";

/** Edit (every staff member) and delete (admins) an incident. */
export function IncidentActions({
  incident,
  canDelete,
}: {
  incident: Incident;
  canDelete: boolean;
}) {
  const t = useTranslations("incidentsAdmin");
  const tCommon = useTranslations("common");
  const router = useRouter();
  const [editing, setEditing] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [pending, startTransition] = useTransition();

  const remove = () =>
    startTransition(async () => {
      const result = await deleteIncident(incident.id);
      if (!result.success) {
        toastActionError(result, result.error);
        return;
      }
      toast.success(t("deleted"));
      setDeleting(false);
      router.push("/dashboard/admin/incidents");
    });

  return (
    <>
      <Button variant="outline" onClick={() => setEditing(true)}>
        <Pencil aria-hidden />
        {tCommon("edit")}
      </Button>
      {canDelete && (
        <Button
          variant="outline"
          className="text-destructive hover:text-destructive"
          onClick={() => setDeleting(true)}
        >
          <Trash2 aria-hidden />
          {tCommon("delete")}
        </Button>
      )}

      {editing && (
        <IncidentDialog incident={incident} onClose={() => setEditing(false)} />
      )}
      <ConfirmDialog
        open={deleting}
        onOpenChange={setDeleting}
        title={t("deleteTitle")}
        description={t("deleteDescription", { title: incident.title })}
        confirmLabel={t("deleteConfirm")}
        destructive
        pending={pending}
        onConfirm={remove}
      />
    </>
  );
}
