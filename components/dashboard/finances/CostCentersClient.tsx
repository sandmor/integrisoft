"use client";

import { useCallback, useState } from "react";
import { useGetCostCentersQuery } from "@/lib/redux/financesApi";
import { DataTable } from "@/components/ui/data-table";
import { columns } from "@/app/dashboard/finances/cost-centers/columns";
import Link from "next/link";
import { PlusCircle, Download } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { SortingState, PaginationState } from "@tanstack/react-table";
import {
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardContent,
} from "@/components/ui/card";
import { CostCenterListItem } from "@/lib/types/finances";

interface CostCentersClientProps {
  initialData?: CostCenterListItem[];
}

export default function CostCentersClient({
  initialData,
}: CostCentersClientProps) {
  const [pagination, setPagination] = useState<PaginationState>({
    pageIndex: 0,
    pageSize: 10,
  });
  const [sorting, setSorting] = useState<SortingState>([]);
  const [filters, setFilters] = useState<{ id: string; value: string }[]>([]);

  const {
    data: costCentersData,
    isLoading,
    isFetching,
  } = useGetCostCentersQuery(
    { withStats: false },
    {
      // Skip the query if we already have initial data
      skip: !!initialData,
    }
  );

  // Use either the initial data from server or data from RTK Query
  const costCenters =
    initialData || (costCentersData as CostCenterListItem[]) || [];

  const handleFilterChange = useCallback(
    (filters: { id: string; value: string }[]) => {
      setFilters(filters.filter((f) => f.value !== ""));
    },
    []
  );

  if (isLoading && !initialData) {
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <h1 className="text-3xl font-bold">Cost Centers</h1>
          <Skeleton className="h-10 w-32" />
        </div>
        <Card>
          <CardHeader>
            <CardTitle>
              <Skeleton className="h-6 w-48" />
            </CardTitle>
            <CardDescription>
              <Skeleton className="h-4 w-72" />
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Skeleton className="h-[400px] w-full" />
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex gap-2">
          <Button variant="outline">
            <Download className="mr-2 h-4 w-4" /> Export
          </Button>
          <Button asChild>
            <Link href="/dashboard/finances/cost-centers/new">
              <PlusCircle className="mr-2 h-4 w-4" /> New Cost Center
            </Link>
          </Button>
        </div>
      </div>
      <Card>
        <CardHeader>
          <CardTitle>Cost Centers List</CardTitle>
          <CardDescription>View and manage all cost centers</CardDescription>
        </CardHeader>
        <CardContent>
          <DataTable
            columns={columns}
            data={costCenters}
            isLoading={isLoading}
            isPaginationLoading={isFetching && !isLoading}
            isSortingLoading={isFetching && !isLoading}
            isFilteringLoading={isFetching && !isLoading}
            pageCount={1}
            manualPagination={false}
            manualSorting={false}
            manualFiltering={false}
            onPaginationChange={setPagination}
            onSortingChange={setSorting}
            onFilterChange={handleFilterChange}
            filterableColumns={["name"]}
          />
        </CardContent>
      </Card>
    </div>
  );
}
