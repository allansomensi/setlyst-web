"use client";

import { useState, useTransition } from "react";
import {
  BandRolePermission,
  BandRolePermissionEntry,
  BAND_PERMISSIONS,
  CONFIGURABLE_BAND_ROLES,
} from "@/types/api";
import { updateBandRolePermissions } from "../../actions";
import { useTranslations } from "next-intl";
import { Button } from "@/components/ui/button";
import { Loader2 } from "lucide-react";
import { toast } from "sonner";
import { toastActionError } from "@/lib/action-toast";

interface BandPermissionsSectionProps {
  bandId: string;
  permissions: BandRolePermission[];
}

type PermissionMatrix = Record<
  (typeof CONFIGURABLE_BAND_ROLES)[number],
  Record<(typeof BAND_PERMISSIONS)[number], boolean>
>;

function toMatrix(permissions: BandRolePermission[]): PermissionMatrix {
  const matrix = {} as PermissionMatrix;

  for (const role of CONFIGURABLE_BAND_ROLES) {
    matrix[role] = {} as PermissionMatrix[typeof role];
    for (const permission of BAND_PERMISSIONS) {
      const row = permissions.find(
        (p) => p.role === role && p.permission === permission,
      );
      matrix[role][permission] = row?.allowed ?? false;
    }
  }

  return matrix;
}

export function BandPermissionsSection({
  bandId,
  permissions,
}: BandPermissionsSectionProps) {
  const t = useTranslations("bands.permissions");
  const [isPending, startTransition] = useTransition();
  const [matrix, setMatrix] = useState<PermissionMatrix>(() =>
    toMatrix(permissions),
  );
  const [isDirty, setIsDirty] = useState(false);

  const toggle = (
    role: (typeof CONFIGURABLE_BAND_ROLES)[number],
    permission: (typeof BAND_PERMISSIONS)[number],
  ) => {
    setMatrix((prev) => ({
      ...prev,
      [role]: { ...prev[role], [permission]: !prev[role][permission] },
    }));
    setIsDirty(true);
  };

  const handleSave = () => {
    const entries: BandRolePermissionEntry[] = CONFIGURABLE_BAND_ROLES.flatMap(
      (role) =>
        BAND_PERMISSIONS.map((permission) => ({
          role,
          permission,
          allowed: matrix[role][permission],
        })),
    );

    startTransition(async () => {
      const result = await updateBandRolePermissions(bandId, entries);

      if (result.success) {
        toast.success(t("saved"));
        setIsDirty(false);
      } else {
        toastActionError(result, result.error || t("saveFailed"));
      }
    });
  };

  return (
    <div className="space-y-4">
      <div>
        <h2 className="text-lg font-semibold">{t("title")}</h2>
        <p className="text-muted-foreground text-sm">{t("subtitle")}</p>
      </div>

      <div className="bg-background overflow-x-auto rounded-md border">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b">
              <th className="p-3 text-left font-medium">
                {t("permissionColumn")}
              </th>
              {CONFIGURABLE_BAND_ROLES.map((role) => (
                <th key={role} className="p-3 text-center font-medium">
                  {t(`roles.${role}`)}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {BAND_PERMISSIONS.map((permission) => (
              <tr key={permission} className="border-b last:border-0">
                <td className="p-3">
                  <div className="font-medium">
                    {t(`permissionLabels.${permission}`)}
                  </div>
                  <div className="text-muted-foreground text-xs">
                    {t(`permissionDescriptions.${permission}`)}
                  </div>
                </td>
                {CONFIGURABLE_BAND_ROLES.map((role) => (
                  <td key={role} className="p-3 text-center">
                    <input
                      type="checkbox"
                      className="accent-primary h-4 w-4"
                      checked={matrix[role][permission]}
                      onChange={() => toggle(role, permission)}
                      disabled={isPending}
                    />
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="flex justify-end">
        <Button onClick={handleSave} disabled={isPending || !isDirty}>
          {isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
          {t("save")}
        </Button>
      </div>
    </div>
  );
}
