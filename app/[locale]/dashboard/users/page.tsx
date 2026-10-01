import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";
import { adminListQuery, type ListSearchParams } from "@/lib/admin-list";
import { fetchServerApi } from "@/lib/api-server";
import {
  USER_FILTER_PARAMS,
  USER_LIST_CHOICES,
  USER_LIST_KEYS,
  withoutPaging,
} from "@/lib/console";
import { dayRangeToUtc } from "@/lib/date-range";
import { fetchOrFailed, FETCH_FAILED } from "@/lib/fetch-or-failed";
import { getRequestTimeZone } from "@/lib/server/time-zone";
import { requireStaffPage } from "@/lib/staff-guard";
import type { PaginatedResponse, User } from "@/types/api";
import { UsersTable } from "./_components/users-table";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("metadata");
  return { title: t("users") };
}

function first(value: string | string[] | undefined): string | undefined {
  return Array.isArray(value) ? value[0] : value;
}

export default async function UsersPage({
  searchParams,
}: {
  searchParams: ListSearchParams;
}) {
  const { actor, can } = await requireStaffPage("users");
  const params = await searchParams;

  // Filtered, sorted and paged by the API. `?created_from=`/`?created_to=`
  // are whole days in the viewer's calendar; the API takes UTC instants.
  const { query, page } = adminListQuery(
    params,
    USER_LIST_KEYS,
    USER_LIST_CHOICES,
  );
  const apiQuery = new URLSearchParams(query);
  const created = dayRangeToUtc(
    first(params.created_from),
    first(params.created_to),
    await getRequestTimeZone(),
  );
  if (created.from) apiQuery.set("created_from", created.from);
  if (created.to) apiQuery.set("created_to", created.to);

  // A transient failure shows the retrying notice instead of the error
  // boundary.
  const response = await fetchOrFailed(
    fetchServerApi<PaginatedResponse<User>>(`/users?${apiQuery}`),
  );
  const failed = response === FETCH_FAILED;
  const users = failed ? [] : (response.data ?? []);

  return (
    <div className="mx-auto w-full max-w-6xl space-y-4">
      <UsersTable
        users={users}
        page={page}
        totalPages={failed ? 1 : (response.meta?.total_pages ?? 1)}
        totalItems={failed ? 0 : (response.meta?.total_items ?? users.length)}
        filtered={USER_FILTER_PARAMS.some((key) => !!first(params[key]))}
        loadError={failed}
        actor={actor}
        exportQuery={can("exports") ? withoutPaging(apiQuery) : null}
      />
    </div>
  );
}
