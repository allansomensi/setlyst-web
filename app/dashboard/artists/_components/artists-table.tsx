"use client";

import { useState, useTransition } from "react";
import { Artist } from "@/types/api";
import { deleteArtist } from "../actions";
import { ArtistDialog } from "./artist-dialog";
import { SearchInput } from "@/components/ui/search-input";
import { SortableColumnHeader } from "@/components/ui/sortable-column-header";
import { useTableControls } from "@/hooks/use-table-controls";
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
import { MoreHorizontal, Plus, Pencil, Trash2 } from "lucide-react";
import { toast } from "sonner";

const SEARCHABLE_KEYS = ["name"] as const;

interface ArtistsTableProps {
  initialArtists: Artist[];
}

export function ArtistsTable({ initialArtists }: ArtistsTableProps) {
  const [isPending, startTransition] = useTransition();
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingArtist, setEditingArtist] = useState<Artist | null>(null);

  const { search, setSearch, sortConfig, handleSort, processedData } =
    useTableControls(initialArtists, SEARCHABLE_KEYS);

  const artists = processedData;

  const handleOpenDialog = (artist?: Artist) => {
    setEditingArtist(artist ?? null);
    setIsDialogOpen(true);
  };

  const handleDelete = (id: string) => {
    if (!confirm("Are you sure you want to delete this artist?")) return;
    startTransition(async () => {
      const result = await deleteArtist(id);
      if (!result.success) {
        toast.error(result.error ?? "Error deleting the artist");
      } else {
        toast.success("Artist deleted successfully");
      }
    });
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Artists</h1>
          <p className="text-muted-foreground">
            Manage your band&apos;s artists.
          </p>
        </div>
        <Button onClick={() => handleOpenDialog()}>
          <Plus className="mr-2 h-4 w-4" />
          Add Artist
        </Button>
      </div>

      {/* Search */}
      <SearchInput
        value={search}
        onChange={setSearch}
        placeholder="Search artist..."
        className="max-w-sm"
      />

      {/* Table */}
      <div
        className={`bg-background rounded-md border ${isPending ? "pointer-events-none opacity-60" : ""}`}
      >
        <Table>
          <TableHeader>
            <TableRow>
              <SortableColumnHeader
                label="Name"
                sortKey="name"
                sortConfig={sortConfig}
                onSort={handleSort}
              />
              <SortableColumnHeader
                label="Registered on"
                sortKey="created_at"
                sortConfig={sortConfig}
                onSort={handleSort}
              />
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {artists.length === 0 ? (
              <TableRow>
                <TableCell
                  colSpan={3}
                  className="text-muted-foreground h-24 text-center"
                >
                  {search
                    ? `No artists found for "${search}".`
                    : "No artists registered. Start by adding one."}
                </TableCell>
              </TableRow>
            ) : (
              artists.map((artist) => (
                <TableRow key={artist.id}>
                  <TableCell className="font-medium">{artist.name}</TableCell>
                  <TableCell>
                    {new Date(artist.created_at).toLocaleDateString("en-US")}
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
                          onClick={() => handleOpenDialog(artist)}
                        >
                          <Pencil className="mr-2 h-4 w-4" />
                          Edit
                        </DropdownMenuItem>
                        <DropdownMenuItem
                          onClick={() => handleDelete(artist.id)}
                          className="text-red-600"
                        >
                          <Trash2 className="mr-2 h-4 w-4" />
                          Delete
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

      {artists.length > 0 && search && (
        <p className="text-muted-foreground text-sm">
          {artists.length} result{artists.length !== 1 ? "s " : " "} for &quot;
          {search}&quot;
        </p>
      )}

      <ArtistDialog
        isOpen={isDialogOpen}
        onClose={() => setIsDialogOpen(false)}
        artist={editingArtist}
      />
    </div>
  );
}
