"use client";

import { useId, useOptimistic, useTransition } from "react";
import { Loader2, UserRoundCheck, UserRoundX } from "lucide-react";
import { useTranslations } from "next-intl";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { NativeSelect } from "@/components/ui/native-select";
import { toastActionError } from "@/lib/action-toast";
import { toast } from "@/lib/toast";
import type { UserRole } from "@/types/api";
import {
  TICKET_CATEGORIES,
  TICKET_PRIORITIES,
  TICKET_STATUSES,
  type AdminSupportTicket,
  type TicketCategory,
  type TicketPriority,
  type TicketStatus,
  type UpdateTicketPayload,
} from "@/types/operations";
import { updateTicket } from "../../actions";

export interface StaffMember {
  id: string;
  username: string;
  role: UserRole;
}

type TicketFields = Required<
  Pick<UpdateTicketPayload, "status" | "priority" | "category">
> & { assignee_id: string | null };

/**
 * The ticket's status, priority, category and assignee. Each change is
 * saved as soon as it's made (no "save" button), shown optimistically and
 * confirmed with a toast; a refused change snaps back.
 */
export function TicketControls({
  ticket,
  staff,
  viewerId,
}: {
  ticket: AdminSupportTicket;
  /** Admins and moderators, for the assignee picker. */
  staff: StaffMember[];
  viewerId: string;
}) {
  const t = useTranslations("supportAdmin");
  const id = useId();
  const [isPending, startTransition] = useTransition();
  const [fields, setOptimistic] = useOptimistic<
    TicketFields,
    UpdateTicketPayload
  >(
    {
      status: ticket.status,
      priority: ticket.priority,
      category: ticket.category,
      assignee_id: ticket.assignee_id,
    },
    (current, change) => ({ ...current, ...change }) as TicketFields,
  );

  const apply = (change: UpdateTicketPayload, success: string) => {
    startTransition(async () => {
      setOptimistic(change);
      const result = await updateTicket(ticket.id, change);
      if (!result.success) {
        toastActionError(result, result.error);
        return;
      }
      toast.success(success);
    });
  };

  const usernameOf = (staffId: string) =>
    staff.find((member) => member.id === staffId)?.username ??
    (staffId === ticket.assignee_id ? ticket.assignee_username : null) ??
    "—";

  const assign = (assignee: string | null) =>
    apply(
      { assignee_id: assignee },
      assignee
        ? assignee === viewerId
          ? t("controls.assignedToYou")
          : t("controls.assigned", { username: usernameOf(assignee) })
        : t("controls.unassigned"),
    );

  // The current assignee may have left the staff since (the picker only
  // lists current admins and moderators): keep them selectable.
  const listed = staff.some((member) => member.id === fields.assignee_id);
  const groups = (["admin", "moderator"] as const).map((role) => ({
    role,
    members: staff.filter((member) => member.role === role),
  }));

  return (
    <div className="space-y-4" aria-busy={isPending}>
      <div className="space-y-1.5">
        <Label htmlFor={`${id}-status`}>{t("controls.status")}</Label>
        <NativeSelect
          id={`${id}-status`}
          value={fields.status}
          disabled={isPending}
          onChange={(event) => {
            const status = event.target.value as TicketStatus;
            apply(
              { status },
              t("controls.statusChanged", { status: t(`status.${status}`) }),
            );
          }}
        >
          {TICKET_STATUSES.map((value) => (
            <option key={value} value={value}>
              {t(`status.${value}`)}
            </option>
          ))}
        </NativeSelect>
      </div>

      <div className="grid grid-cols-2 gap-3 lg:grid-cols-1 xl:grid-cols-2">
        <div className="space-y-1.5">
          <Label htmlFor={`${id}-priority`}>{t("controls.priority")}</Label>
          <NativeSelect
            id={`${id}-priority`}
            value={fields.priority}
            disabled={isPending}
            onChange={(event) => {
              const priority = event.target.value as TicketPriority;
              apply(
                { priority },
                t("controls.priorityChanged", {
                  priority: t(`priority.${priority}`),
                }),
              );
            }}
          >
            {TICKET_PRIORITIES.map((value) => (
              <option key={value} value={value}>
                {t(`priority.${value}`)}
              </option>
            ))}
          </NativeSelect>
        </div>
        <div className="space-y-1.5">
          <Label htmlFor={`${id}-category`}>{t("controls.category")}</Label>
          <NativeSelect
            id={`${id}-category`}
            value={fields.category}
            disabled={isPending}
            onChange={(event) => {
              const category = event.target.value as TicketCategory;
              apply(
                { category },
                t("controls.categoryChanged", {
                  category: t(`category.${category}`),
                }),
              );
            }}
          >
            {TICKET_CATEGORIES.map((value) => (
              <option key={value} value={value}>
                {t(`category.${value}`)}
              </option>
            ))}
          </NativeSelect>
        </div>
      </div>

      <div className="space-y-1.5">
        <Label htmlFor={`${id}-assignee`}>{t("controls.assignee")}</Label>
        <NativeSelect
          id={`${id}-assignee`}
          value={fields.assignee_id ?? ""}
          disabled={isPending}
          onChange={(event) => assign(event.target.value || null)}
        >
          <option value="">{t("unassigned")}</option>
          {fields.assignee_id && !listed && (
            <option value={fields.assignee_id}>
              @{usernameOf(fields.assignee_id)}
            </option>
          )}
          {groups.map(({ role, members }) =>
            members.length > 0 ? (
              <optgroup key={role} label={t(`controls.staffGroups.${role}`)}>
                {members.map((member) => (
                  <option key={member.id} value={member.id}>
                    @{member.username}
                    {member.id === viewerId ? ` (${t("controls.you")})` : ""}
                  </option>
                ))}
              </optgroup>
            ) : null,
          )}
        </NativeSelect>
        <div className="flex flex-wrap gap-2 pt-1">
          {fields.assignee_id !== viewerId && (
            <Button
              type="button"
              variant="outline"
              size="sm"
              disabled={isPending}
              onClick={() => assign(viewerId)}
            >
              <UserRoundCheck aria-hidden />
              {t("controls.assignToMe")}
            </Button>
          )}
          {fields.assignee_id && (
            <Button
              type="button"
              variant="ghost"
              size="sm"
              disabled={isPending}
              onClick={() => assign(null)}
            >
              <UserRoundX aria-hidden />
              {t("controls.unassign")}
            </Button>
          )}
          {isPending && (
            <Loader2
              className="text-muted-foreground size-4 animate-spin self-center"
              aria-hidden
            />
          )}
        </div>
      </div>
    </div>
  );
}
