import { Skeleton } from "@/components/ui/skeleton";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

export default function UsersLoading() {
  return (
    <div className="w-full space-y-6">
      {/* Header Skeleton */}
      <div className="flex items-center justify-between">
        <div className="space-y-2">
          <Skeleton className="h-9 w-32" /> {/* Title */}
          <Skeleton className="h-4 w-64" /> {/* Subtitle */}
        </div>
        <Skeleton className="h-10 w-32" /> {/* Add User Button */}
      </div>

      {/* Search Input Skeleton */}
      <Skeleton className="h-10 w-full max-w-sm" />

      {/* Table Skeleton */}
      <div className="bg-background rounded-md border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>
                <Skeleton className="h-4 w-24" />
              </TableHead>
              <TableHead className="hidden md:table-cell">
                <Skeleton className="h-4 w-32" />
              </TableHead>
              <TableHead>
                <Skeleton className="h-4 w-16" />
              </TableHead>
              <TableHead>
                <Skeleton className="h-4 w-16" />
              </TableHead>
              <TableHead className="text-right">
                <Skeleton className="ml-auto h-4 w-8" />
              </TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {Array.from({ length: 5 }).map((_, i) => (
              <TableRow key={i}>
                <TableCell>
                  <div className="flex flex-col gap-1">
                    <Skeleton className="h-5 w-24" />
                    <Skeleton className="h-3 w-32 md:hidden" />{" "}
                    {/* Email on mobile */}
                  </div>
                </TableCell>
                <TableCell className="hidden md:table-cell">
                  <Skeleton className="h-5 w-48" />
                </TableCell>
                <TableCell>
                  <Skeleton className="h-6 w-20 rounded-full" />{" "}
                  {/* Role Badge */}
                </TableCell>
                <TableCell>
                  <Skeleton className="h-6 w-20 rounded-full" />{" "}
                  {/* Status Badge */}
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
