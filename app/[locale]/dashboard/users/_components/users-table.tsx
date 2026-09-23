"use client";

import { useMemo, useState } from "react";
import { Plus } from "lucide-react";
import { useLocale, useTranslations } from "next-intl";
import { Button } from "@/components/ui/button";
import { SearchInput } from "@/components/ui/search-input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { SortableColumnHeader } from "@/components/ui/sortable-column-header";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { TablePagination } from "@/components/ui/table-pagination";
import { PlatformRoleBadge } from "@/components/role-badge";
import { UserStatusBadges } from "@/components/staff/user-status-badges";
import { useTableControls } from "@/hooks/use-table-controls";
import { Link } from "@/i18n/routing";
import { formatApiDate } from "@/lib/dates";
import type { StaffActor } from "@/lib/staff-permissions";
import type { User, UserRole } from "@/types/api";
import { UserActionsMenu } from "./user-actions-menu";
import { UserFormDialog } from "./user-form-dialog";

const SEARCHABLE_KEYS = [
  "username",
  "email",
  "first_name",
  "last_name",
] as const;

type StateFilter = "all" | "active" | "inactive" | "banned" | "mustChange";
type RoleFilter = "all" | UserRole;

function matchesState(user: User, filter: StateFilter): boolean {
  switch (filter) {
    case "active":
      return user.status === "active" && !user.is_banned;
    case "inactive":
      return user.status === "inactive";
    case "banned":
      return user.is_banned;
    case "mustChange":
      return user.must_change_password;
    default:
      return true;
  }
}

interface UsersTableProps {
  initialUsers: User[];
  actor: StaffActor;
}

export function UsersTable({ initialUsers, actor }: UsersTableProps) {
  const t = useTranslations("staff.users");
  const locale = useLocale();
  const [creating, setCreating] = useState(false);
  const [roleFilter, setRoleFilter] = useState<RoleFilter>("all");
  const [stateFilter, setStateFilter] = useState<StateFilter>("all");

  const filtered = useMemo(
    () =>
      initialUsers.filter(
        (user) =>
          (roleFilter === "all" || user.role === roleFilter) &&
          matchesState(user, stateFilter),
      ),
    [initialUsers, roleFilter, stateFilter],
  );

  const {
    search,
    setSearch,
    sortConfig,
    handleSort,
    processedData: users,
    currentPage,
    totalPages,
    setCurrentPage,
    pageSize,
    setPageSize,
    totalItems,
  } = useTableControls(filtered, SEARCHABLE_KEYS);

  const counts = useMemo(
    () => ({
      banned: initialUsers.filter((u) => u.is_banned).length,
      inactive: initialUsers.filter((u) => u.status === "inactive").length,
    }),
    [initialUsers],
  );

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">{t("title")}</h1>
          <p className="text-muted-foreground">
            {t("subtitle", {
              total: initialUsers.length,
              banned: counts.banned,
              inactive: counts.inactive,
            })}
          </p>
        </div>
        <Button onClick={() => setCreating(true)}>
          <Plus className="mr-2 h-4 w-4" />
          {t("add")}
        </Button>
      </div>

      <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
        <SearchInput
          value={search}
          onChange={setSearch}
          placeholder={t("searchPlaceholder")}
          className="sm:max-w-sm"
        />
        <div className="flex gap-2">
          <Select
            value={roleFilter}
            onValueChange={(v) => {
              setRoleFilter(v as RoleFilter);
              setCurrentPage(1);
            }}
          >
            <SelectTrigger className="w-40" aria-label={t("filterRole")}>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {(["all", "user", "moderator", "admin"] as const).map((value) => (
                <SelectItem key={value} value={value}>
                  {t(`roleFilter.${value}`)}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Select
            value={stateFilter}
            onValueChange={(v) => {
              setStateFilter(v as StateFilter);
              setCurrentPage(1);
            }}
          >
            <SelectTrigger className="w-44" aria-label={t("filterState")}>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {(
                ["all", "active", "inactive", "banned", "mustChange"] as const
              ).map((value) => (
                <SelectItem key={value} value={value}>
                  {t(`stateFilter.${value}`)}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      <div className="bg-card rounded-md border">
        <Table>
          <TableHeader>
            <TableRow>
              <SortableColumnHeader
                label={t("columns.user")}
                sortKey="username"
                sortConfig={sortConfig}
                onSort={handleSort}
              />
              <SortableColumnHeader
                label={t("columns.role")}
                sortKey="role"
                sortConfig={sortConfig}
                onSort={handleSort}
              />
              <TableHead>{t("columns.status")}</TableHead>
              <SortableColumnHeader
                label={t("columns.lastLogin")}
                sortKey="last_login_at"
                sortConfig={sortConfig}
                onSort={handleSort}
                className="hidden lg:table-cell"
              />
              <SortableColumnHeader
                label={t("columns.created")}
                sortKey="created_at"
                sortConfig={sortConfig}
                onSort={handleSort}
                className="hidden xl:table-cell"
              />
              <TableHead className="w-12 text-right">
                <span className="sr-only">{t("columns.actions")}</span>
              </TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {users.length === 0 ? (
              <TableRow>
                <TableCell
                  colSpan={6}
                  className="text-muted-foreground h-24 text-center"
                >
                  {t("empty")}
                </TableCell>
              </TableRow>
            ) : (
              users.map((user) => {
                const fullName = [user.first_name, user.last_name]
                  .filter(Boolean)
                  .join(" ");
                return (
                  <TableRow key={user.id}>
                    <TableCell>
                      <Link
                        href={`/dashboard/users/${user.id}`}
                        className="group flex flex-col"
                      >
                        <span className="font-medium group-hover:underline">
                          {user.username}
                          {user.id === actor.id && (
                            <span className="text-muted-foreground ml-1.5 text-xs font-normal">
                              ({t("you")})
                            </span>
                          )}
                        </span>
                        <span className="text-muted-foreground truncate text-xs">
                          {[fullName, user.email].filter(Boolean).join(" · ") ||
                            "—"}
                        </span>
                      </Link>
                    </TableCell>
                    <TableCell>
                      <PlatformRoleBadge role={user.role} />
                    </TableCell>
                    <TableCell>
                      <UserStatusBadges user={user} />
                    </TableCell>
                    <TableCell className="text-muted-foreground hidden text-sm lg:table-cell">
                      {user.last_login_at
                        ? formatApiDate(user.last_login_at, locale)
                        : t("neverSignedIn")}
                    </TableCell>
                    <TableCell className="text-muted-foreground hidden text-sm xl:table-cell">
                      {formatApiDate(user.created_at, locale)}
                    </TableCell>
                    <TableCell className="text-right">
                      <UserActionsMenu
                        user={user}
                        actor={actor}
                        showDetailsLink
                      />
                    </TableCell>
                  </TableRow>
                );
              })
            )}
          </TableBody>
        </Table>
      </div>

      <TablePagination
        currentPage={currentPage}
        totalPages={totalPages}
        setCurrentPage={setCurrentPage}
        totalItems={totalItems}
        pageSize={pageSize}
        setPageSize={setPageSize}
        search={search}
      />

      <UserFormDialog
        open={creating}
        onOpenChange={setCreating}
        actorRole={actor.role}
      />
    </div>
  );
}
