"use client";

import { useState, useTransition } from "react";
import { Setlist } from "@/types/api";
import { deleteSetlist } from "../actions";
import { Button } from "@/components/ui/button";
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
import { MoreHorizontal, Plus, Pencil, Trash2, ListMusic } from "lucide-react";
import { toast } from "sonner";
import { SetlistDialog } from "./setlists-dialog";
import Link from "next/link";

interface SetlistsTableProps {
  initialSetlists: Setlist[];
}

export function SetlistsTable({ initialSetlists }: SetlistsTableProps) {
  const [isPending, startTransition] = useTransition();
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingSetlist, setEditingSetlist] = useState<Setlist | null>(null);

  const handleOpenDialog = (setlist?: Setlist) => {
    setEditingSetlist(setlist || null);
    setIsDialogOpen(true);
  };

  const handleDelete = (id: string) => {
    if (!confirm("Are you sure you want to delete this setlist?")) return;

    startTransition(async () => {
      const result = await deleteSetlist(id);
      if (result.success) {
        toast.success("Setlist deleted");
      } else {
        toast.error(result.error);
      }
    });
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Setlists</h1>
          <p className="text-muted-foreground">Manage your setlists.</p>
        </div>
        <Button onClick={() => handleOpenDialog()}>
          <Plus className="mr-2 h-4 w-4" /> Add Setlist
        </Button>
      </div>

      <div
        className={`bg-background rounded-md border ${isPending ? "pointer-events-none opacity-60" : ""}`}
      >
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Title</TableHead>
              <TableHead>Description</TableHead>
              <TableHead>Added On</TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {initialSetlists.length === 0 ? (
              <TableRow>
                <TableCell
                  colSpan={4}
                  className="text-muted-foreground h-24 text-center"
                >
                  No setlists found.
                </TableCell>
              </TableRow>
            ) : (
              initialSetlists.map((setlist) => (
                <TableRow key={setlist.id}>
                  <TableCell className="font-medium">{setlist.title}</TableCell>
                  <TableCell
                    className="max-w-xs truncate"
                    title={setlist.description || ""}
                  >
                    {setlist.description || "-"}
                  </TableCell>
                  <TableCell>
                    {new Date(setlist.created_at).toLocaleDateString()}
                  </TableCell>
                  <TableCell className="text-right">
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" className="h-8 w-8 p-0">
                          <MoreHorizontal className="h-4 w-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem asChild>
                          <Link href={`/dashboard/setlists/${setlist.id}`}>
                            <ListMusic className="mr-2 h-4 w-4" /> Manage Songs
                          </Link>
                        </DropdownMenuItem>
                        <DropdownMenuItem
                          onClick={() => handleOpenDialog(setlist)}
                        >
                          <Pencil className="mr-2 h-4 w-4" /> Edit
                        </DropdownMenuItem>
                        <DropdownMenuItem
                          onClick={() => handleDelete(setlist.id)}
                          className="text-red-600"
                        >
                          <Trash2 className="mr-2 h-4 w-4" /> Delete
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

      <SetlistDialog
        isOpen={isDialogOpen}
        onClose={() => setIsDialogOpen(false)}
        setlist={editingSetlist}
      />
    </div>
  );
}
