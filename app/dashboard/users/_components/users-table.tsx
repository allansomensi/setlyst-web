"use client";

import { useState, useTransition } from "react";
import { User } from "@/types/api";
import { UserDialog } from "./user-dialog";
import { SearchInput } from "@/components/ui/search-input";
import { SortableColumnHeader } from "@/components/ui/sortable-column-header";
import { useTableControls } from "@/hooks/use-table-controls";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { MoreHorizontal, Pencil } from "lucide-react";

const SEARCHABLE_KEYS = [
  "username",
  "email",
  "first_name",
  "last_name",
] as const;

interface UsersTableProps {
  initialUsers: User[];
}

export function UsersTable({ initialUsers }: UsersTableProps) {
  const [isPending] = useTransition();
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingUser, setEditingUser] = useState<User | null>(null);

  const { search, setSearch, sortConfig, handleSort, processedData } =
    useTableControls(initialUsers, SEARCHABLE_KEYS);

  const handleOpenDialog = (user: User) => {
    setEditingUser(user);
    setIsDialogOpen(true);
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Users</h1>
          <p className="text-muted-foreground">Manage platform members.</p>
        </div>
      </div>

      <SearchInput
        value={search}
        onChange={setSearch}
        placeholder="Search by username, email..."
        className="max-w-sm"
      />

      <div
        className={`bg-background rounded-md border ${isPending ? "opacity-60" : ""}`}
      >
        <Table>
          <TableHeader>
            <TableRow>
              <SortableColumnHeader
                label="User"
                sortKey="username"
                sortConfig={sortConfig}
                onSort={handleSort}
              />
              <SortableColumnHeader
                label="Email"
                sortKey="email"
                sortConfig={sortConfig}
                onSort={handleSort}
                className="hidden md:table-cell"
              />
              <SortableColumnHeader
                label="Role"
                sortKey="role"
                sortConfig={sortConfig}
                onSort={handleSort}
              />
              <SortableColumnHeader
                label="Status"
                sortKey="status"
                sortConfig={sortConfig}
                onSort={handleSort}
              />
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {processedData.length === 0 ? (
              <TableRow>
                <TableCell
                  colSpan={5}
                  className="text-muted-foreground h-24 text-center"
                >
                  No users found.
                </TableCell>
              </TableRow>
            ) : (
              processedData.map((user) => (
                <TableRow key={user.id}>
                  <TableCell>
                    <div className="flex flex-col">
                      <span className="font-medium">{user.username}</span>
                      <span className="text-muted-foreground text-xs md:hidden">
                        {user.email}
                      </span>
                    </div>
                  </TableCell>
                  <TableCell className="hidden md:table-cell">
                    {user.email}
                  </TableCell>
                  <TableCell>
                    {(() => {
                      switch (user.role) {
                        case "admin":
                          return (
                            <Badge variant="destructive">{user.role}</Badge>
                          );
                        case "moderator":
                          return <Badge variant="outline">{user.role}</Badge>;
                        default:
                          return <Badge variant="secondary">{user.role}</Badge>;
                      }
                    })()}
                  </TableCell>
                  <TableCell>
                    <Badge
                      variant={
                        user.status === "active" ? "outline" : "destructive"
                      }
                    >
                      {user.status}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-right">
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" className="h-8 w-8 p-0">
                          <MoreHorizontal className="h-4 w-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem
                          onClick={() => handleOpenDialog(user)}
                        >
                          <Pencil className="mr-2 h-4 w-4" />
                          Edit
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>

      <UserDialog
        isOpen={isDialogOpen}
        onClose={() => setIsDialogOpen(false)}
        user={editingUser}
      />
    </div>
  );
}
