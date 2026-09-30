"use client";

import { useMemo, useState } from "react";
import { Plus, Users } from "lucide-react";
import { useLocale, useTimeZone, useTranslations } from "next-intl";
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
import { AdminPageHeader } from "@/components/staff/admin-page-header";
import { ListEmptyState } from "@/components/staff/list-empty-state";
import { useTableControls } from "@/hooks/use-table-controls";
import { LoadErrorNotice } from "@/components/load-error-notice";
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
  /** The server-side fetch failed (see components/load-error-notice.tsx). */
  loadError?: boolean;
  actor: StaffActor;
}

export function UsersTable({
  initialUsers,
  loadError = false,
  actor,
}: UsersTableProps) {
  const t = useTranslations("staff.users");
  const locale = useLocale();
  const timeZone = useTimeZone();
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
      <AdminPageHeader
        title={t("title")}
        description={t("subtitle", {
          total: initialUsers.length,
          banned: counts.banned,
          inactive: counts.inactive,
        })}
        actions={
          <Button onClick={() => setCreating(true)}>
            <Plus aria-hidden />
            {t("add")}
          </Button>
        }
      />

      {loadError && initialUsers.length === 0 && <LoadErrorNotice />}

      <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
        <SearchInput
          value={search}
          onChange={setSearch}
          placeholder={t("searchPlaceholder")}
          className="w-full sm:max-w-sm"
        />
        <div className="flex gap-2">
          <Select
            value={roleFilter}
            onValueChange={(v) => {
              setRoleFilter(v as RoleFilter);
              setCurrentPage(1);
            }}
          >
            <SelectTrigger
              className="min-w-0 flex-1 sm:w-40 sm:flex-none"
              aria-label={t("filterRole")}
            >
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
            <SelectTrigger
              className="min-w-0 flex-1 sm:w-44 sm:flex-none"
              aria-label={t("filterState")}
            >
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

      <div className="bg-card overflow-hidden rounded-xl border shadow-(--shadow-surface)">
        <Table>
          <TableHeader>
            <TableRow>
              <SortableColumnHeader
                label={t("columns.user")}
                sortKey="username"
                sortConfig={sortConfig}
                onSort={handleSort}
              />
              {/* On a phone the role and the state move under the name
                  (below), so the row's actions menu stays on screen
                  instead of past a horizontal scroll. */}
              <SortableColumnHeader
                label={t("columns.role")}
                sortKey="role"
                sortConfig={sortConfig}
                onSort={handleSort}
                className="hidden sm:table-cell"
              />
              <TableHead className="hidden md:table-cell">
                {t("columns.status")}
              </TableHead>
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
              <TableRow className="hover:bg-transparent">
                <TableCell colSpan={6} className="p-0">
                  <ListEmptyState
                    icon={Users}
                    title={t("empty")}
                    filtered={
                      !!search || roleFilter !== "all" || stateFilter !== "all"
                    }
                    onClear={() => {
                      setSearch("");
                      setRoleFilter("all");
                      setStateFilter("all");
                      setCurrentPage(1);
                    }}
                  />
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
                      {/* Not prefetched: opening an account records a staff view in
                          the audit log, so prefetching would log every listed user. */}
                      <Link
                        href={`/dashboard/users/${user.id}`}
                        prefetch={false}
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
                        {/* Capped so a long email truncates instead of
                            stretching the whole table sideways. */}
                        <span
                          className="text-muted-foreground max-w-56 truncate text-xs sm:max-w-xs"
                          title={
                            [fullName, user.email]
                              .filter(Boolean)
                              .join(" · ") || undefined
                          }
                        >
                          {[fullName, user.email].filter(Boolean).join(" · ") ||
                            "—"}
                        </span>
                      </Link>
                      <div className="mt-1.5 flex flex-wrap gap-1 md:hidden">
                        <PlatformRoleBadge
                          role={user.role}
                          className="sm:hidden"
                        />
                        <UserStatusBadges user={user} />
                      </div>
                    </TableCell>
                    <TableCell className="hidden sm:table-cell">
                      <PlatformRoleBadge role={user.role} />
                    </TableCell>
                    <TableCell className="hidden md:table-cell">
                      <UserStatusBadges user={user} />
                    </TableCell>
                    <TableCell className="text-muted-foreground hidden text-sm lg:table-cell">
                      {user.last_login_at
                        ? formatApiDate(user.last_login_at, locale, {
                            dateStyle: "medium",
                            timeZone,
                          })
                        : t("neverSignedIn")}
                    </TableCell>
                    <TableCell className="text-muted-foreground hidden text-sm xl:table-cell">
                      {formatApiDate(user.created_at, locale, {
                        dateStyle: "medium",
                        timeZone,
                      })}
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
