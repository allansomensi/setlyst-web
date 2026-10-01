"use client";

import { useMemo, useState } from "react";
import { Plus, Users } from "lucide-react";
import { useLocale, useTimeZone, useTranslations } from "next-intl";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { PlatformRoleBadge } from "@/components/role-badge";
import { UserStatusBadges } from "@/components/staff/user-status-badges";
import { AdminPageHeader } from "@/components/staff/admin-page-header";
import { ExportCsvButton } from "@/components/staff/export-csv-button";
import { ListEmptyState } from "@/components/staff/list-empty-state";
import { ListPagination, ListToolbar } from "@/components/staff/list-controls";
import { LoadErrorNotice } from "@/components/load-error-notice";
import { Link } from "@/i18n/routing";
import { canSelectForBulk } from "@/lib/console";
import { formatApiDate } from "@/lib/dates";
import type { StaffActor } from "@/lib/staff-permissions";
import type { User } from "@/types/api";
import { BulkActionsBar } from "./bulk-actions-bar";
import { UserActionsMenu } from "./user-actions-menu";
import { UserFormDialog } from "./user-form-dialog";
import { UsersFilters } from "./users-filters";

interface UsersTableProps {
  /** One page of accounts, already filtered and sorted by the API. */
  users: User[];
  page: number;
  totalPages: number;
  totalItems: number;
  /** A search or filter narrows the list (for the empty state). */
  filtered: boolean;
  /** The server-side fetch failed (see components/load-error-notice.tsx). */
  loadError?: boolean;
  actor: StaffActor;
  /** The list's API query for "Export CSV"; null hides it (admins only). */
  exportQuery: string | null;
}

export function UsersTable({
  users,
  page,
  totalPages,
  totalItems,
  filtered,
  loadError = false,
  actor,
  exportQuery,
}: UsersTableProps) {
  const t = useTranslations("staff.users");
  const tActions = useTranslations("staff.actions");
  const tBulk = useTranslations("console.bulk");
  const locale = useLocale();
  const timeZone = useTimeZone();
  const [creating, setCreating] = useState(false);

  // Ticked accounts, on this page only: another page (or a filter) keeps
  // just the ones still listed. Adjusted during render rather than in an
  // effect (React's "storing information from previous renders" pattern).
  const [selected, setSelected] = useState<ReadonlySet<string>>(new Set());
  const [listedUsers, setListedUsers] = useState(users);
  if (listedUsers !== users) {
    setListedUsers(users);
    const listed = new Set(users.map((user) => user.id));
    setSelected(
      (current) => new Set([...current].filter((id) => listed.has(id))),
    );
  }

  const selectable = useMemo(
    () => users.filter((user) => canSelectForBulk(actor, user)),
    [users, actor],
  );
  const selectedUsers = selectable.filter((user) => selected.has(user.id));
  const allSelected =
    selectable.length > 0 && selectedUsers.length === selectable.length;

  const toggle = (id: string, on: boolean) =>
    setSelected((current) => {
      const next = new Set(current);
      if (on) next.add(id);
      else next.delete(id);
      return next;
    });

  const togglePage = (on: boolean) =>
    setSelected(on ? new Set(selectable.map((user) => user.id)) : new Set());

  return (
    <div className="space-y-6">
      <AdminPageHeader
        title={t("title")}
        description={t("description")}
        actions={
          <>
            {exportQuery !== null && (
              <ExportCsvButton kind="users" query={exportQuery} />
            )}
            <Button onClick={() => setCreating(true)}>
              <Plus aria-hidden />
              {t("add")}
            </Button>
          </>
        }
      />

      {loadError && <LoadErrorNotice />}

      <div className="space-y-2">
        <ListToolbar placeholder={t("searchPlaceholder")} />
        <UsersFilters />
      </div>

      <div className="bg-card overflow-hidden rounded-xl border shadow-(--shadow-surface)">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-10 pr-0">
                <Checkbox
                  checked={
                    allSelected
                      ? true
                      : selectedUsers.length > 0
                        ? "indeterminate"
                        : false
                  }
                  onCheckedChange={(value) => togglePage(value === true)}
                  disabled={selectable.length === 0}
                  aria-label={tBulk("selectPage")}
                />
              </TableHead>
              <TableHead>{t("columns.user")}</TableHead>
              {/* On a phone the role and the state move under the name
                  (below), so the row's actions menu stays on screen
                  instead of past a horizontal scroll. */}
              <TableHead className="hidden sm:table-cell">
                {t("columns.role")}
              </TableHead>
              <TableHead className="hidden md:table-cell">
                {t("columns.status")}
              </TableHead>
              <TableHead className="hidden lg:table-cell">
                {t("columns.lastLogin")}
              </TableHead>
              <TableHead className="hidden xl:table-cell">
                {t("columns.created")}
              </TableHead>
              <TableHead className="w-12 text-right">
                <span className="sr-only">{t("columns.actions")}</span>
              </TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {users.length === 0 ? (
              <TableRow className="hover:bg-transparent">
                <TableCell colSpan={7} className="p-0">
                  <ListEmptyState
                    icon={Users}
                    title={t("empty")}
                    filtered={filtered}
                    clearHref="/dashboard/users"
                  />
                </TableCell>
              </TableRow>
            ) : (
              users.map((user) => {
                const fullName = [user.first_name, user.last_name]
                  .filter(Boolean)
                  .join(" ");
                const eligible = canSelectForBulk(actor, user);
                const isSelected = eligible && selected.has(user.id);
                return (
                  <TableRow
                    key={user.id}
                    data-state={isSelected ? "selected" : undefined}
                  >
                    <TableCell className="w-10 pr-0">
                      <Checkbox
                        checked={isSelected}
                        onCheckedChange={(value) =>
                          toggle(user.id, value === true)
                        }
                        disabled={!eligible}
                        aria-label={tBulk("selectOne", {
                          username: user.username,
                        })}
                        title={
                          eligible
                            ? undefined
                            : user.id === actor.id
                              ? tActions("isYou")
                              : tActions("outranked")
                        }
                      />
                    </TableCell>
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

      <BulkActionsBar
        selected={selectedUsers}
        onClear={() => setSelected(new Set())}
      />

      <ListPagination
        page={page}
        totalPages={totalPages}
        totalItems={totalItems}
      />

      <UserFormDialog
        open={creating}
        onOpenChange={setCreating}
        actorRole={actor.role}
      />
    </div>
  );
}
