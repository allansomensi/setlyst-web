import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { redirect } from "next/navigation";
import { fetchAllServerPages } from "@/lib/api-server";
import { User } from "@/types/api";
import { UsersTable } from "./_components/users-table";

export default async function UsersPage() {
  const session = await getServerSession(authOptions);

  if (session?.user?.role !== "admin" && session?.user?.role !== "moderator") {
    redirect("/dashboard");
  }

  const response = await fetchAllServerPages<User>("/users");

  const users = response.data || [];

  return (
    <div className="w-full space-y-4">
      <UsersTable initialUsers={users} currentUserRole={session?.user?.role} />
    </div>
  );
}
