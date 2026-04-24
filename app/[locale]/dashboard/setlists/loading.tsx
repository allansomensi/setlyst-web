import { Skeleton } from "@/components/ui/skeleton";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

export default function SetlistsLoading() {
  return (
    <div className="w-full space-y-6">
      {/* Header Skeleton */}
      <div className="flex items-center justify-between">
        <div className="space-y-2">
          <Skeleton className="h-9 w-32" /> {/* Title */}
          <Skeleton className="h-4 w-64" /> {/* Subtitle */}
        </div>
        <Skeleton className="h-10 w-32" /> {/* Add Button */}
      </div>

      {/* Search Input Skeleton */}
      <Skeleton className="h-10 w-full max-w-sm" />

      {/* Table Skeleton */}
      <div className="bg-background rounded-md border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>
                <Skeleton className="h-4 w-32" />
              </TableHead>
              <TableHead className="hidden md:table-cell">
                <Skeleton className="h-4 w-48" />
              </TableHead>
              <TableHead className="hidden sm:table-cell">
                <Skeleton className="h-4 w-24" />
              </TableHead>
              <TableHead className="w-12 text-right">
                <Skeleton className="ml-auto h-4 w-8" />
              </TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {Array.from({ length: 5 }).map((_, i) => (
              <TableRow key={i}>
                <TableCell>
                  <Skeleton className="h-5 w-48 max-w-full" />
                </TableCell>
                <TableCell className="hidden md:table-cell">
                  <Skeleton className="h-5 w-72 max-w-full" />
                </TableCell>
                <TableCell className="hidden sm:table-cell">
                  <Skeleton className="h-5 w-24" />
                </TableCell>
                <TableCell className="text-right">
                  <Skeleton className="ml-auto h-8 w-8 rounded-md" />
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>

      {/* Pagination Skeleton */}
      <div className="flex items-center justify-between">
        <Skeleton className="h-4 w-40" />
        <div className="flex gap-2">
          <Skeleton className="h-8 w-24" />
          <Skeleton className="h-8 w-24" />
        </div>
      </div>
    </div>
  );
}
