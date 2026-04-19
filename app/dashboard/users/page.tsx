import { getServerSession } from "next-auth";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";
import { redirect } from "next/navigation";
import { fetchServerApi } from "@/lib/api-server";
import { PaginatedResponse, User } from "@/types/api";
import { UsersTable } from "./_components/users-table";

export default async function UsersPage() {
  const session = await getServerSession(authOptions);

  if (session?.user?.role !== "admin" && session?.user?.role !== "moderator") {
    redirect("/dashboard");
  }

  const response = await fetchServerApi<PaginatedResponse<User>>(
    "/users?page=1&per_page=100",
  );

  const users = response.data || [];

  return (
    <div className="w-full space-y-4">
      <UsersTable initialUsers={users} />
    </div>
  );
}
