"use client";

import { useCallback, useState, useTransition } from "react";
import { Plus } from "lucide-react";
import { useLocale, useTranslations } from "next-intl";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { BandRoleBadge } from "@/components/bands/band-role-badge";
import { ConfirmDialog } from "@/components/staff/confirm-dialog";
import {
  EntityPicker,
  type PickerOption,
} from "@/components/staff/entity-picker";
import { Link } from "@/i18n/routing";
import { toastActionError } from "@/lib/action-toast";
import { formatApiDate } from "@/lib/dates";
import type { AdminUserBand } from "@/types/api";
import { searchBands } from "../../../admin/actions";
import { addUserToBand } from "../../actions";

type AddableRole = "member" | "moderator" | "admin";

export function UserBandsSection({
  userId,
  username,
  bands,
  canAdd,
}: {
  userId: string;
  username: string;
  bands: AdminUserBand[];
  canAdd: boolean;
}) {
  const t = useTranslations("staff.userBands");
  const tBandRoles = useTranslations("bands.roles");
  const locale = useLocale();
  const [open, setOpen] = useState(false);
  const [band, setBand] = useState<PickerOption | null>(null);
  const [role, setRole] = useState<AddableRole>("member");
  const [isPending, startTransition] = useTransition();

  const memberOf = new Set(bands.map((b) => b.band_id));

  const search = useCallback(
    async (query: string): Promise<PickerOption[]> => {
      const result = await searchBands(query);
      if (!result.success) return [];
      return (result.data ?? []).map((b) => ({
        id: b.id,
        label: b.name,
        hint: t("bandHint", {
          owner: b.owner_username ?? "—",
          members: b.member_count,
        }),
        disabled: memberOf.has(b.id),
        disabledReason: t("alreadyMember"),
      }));
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [bands],
  );

  const close = (next: boolean) => {
    if (!next) {
      setBand(null);
      setRole("member");
    }
    setOpen(next);
  };

  const add = () => {
    if (!band) return;
    startTransition(async () => {
      const result = await addUserToBand(userId, band.id, role);
      if (!result.success) {
        toastActionError(result, result.error);
        return;
      }
      toast.success(t("added", { username, band: band.label }));
      close(false);
    });
  };

  return (
    <div className="space-y-3">
      {bands.length === 0 ? (
        <p className="text-muted-foreground text-sm">{t("empty")}</p>
      ) : (
        <ul className="divide-y rounded-md border">
          {bands.map((b) => (
            <li
              key={b.band_id}
              className="flex items-center justify-between gap-3 px-3 py-2.5"
            >
              <div className="min-w-0">
                <Link
                  href={`/dashboard/admin/bands/${b.band_id}`}
                  className="block truncate font-medium hover:underline"
                >
                  {b.band_name}
                </Link>
                <span className="text-muted-foreground text-xs">
                  {t("joined", { date: formatApiDate(b.joined_at, locale) })}
                </span>
              </div>
              <BandRoleBadge role={b.role} />
            </li>
          ))}
        </ul>
      )}

      {canAdd && (
        <Button variant="outline" size="sm" onClick={() => setOpen(true)}>
          <Plus className="mr-1.5 h-4 w-4" />
          {t("add")}
        </Button>
      )}

      <ConfirmDialog
        open={open}
        onOpenChange={close}
        title={t("addTitle", { username })}
        description={t("addDescription")}
        confirmLabel={t("addConfirm")}
        onConfirm={add}
        pending={isPending}
        confirmDisabled={!band}
      >
        <div className="space-y-4">
          {open && (
            <EntityPicker
              search={search}
              value={band?.id ?? null}
              onChange={setBand}
              placeholder={t("searchBands")}
              autoFocus
            />
          )}
          <div className="space-y-1.5">
            <Label>{t("role")}</Label>
            <Select
              value={role}
              onValueChange={(v) => setRole(v as AddableRole)}
            >
              <SelectTrigger className="w-full">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {(["member", "moderator", "admin"] as const).map((r) => (
                  <SelectItem key={r} value={r}>
                    {tBandRoles(r)}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>
      </ConfirmDialog>
    </div>
  );
}
