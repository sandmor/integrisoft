"use client";

import { useState } from "react";
import { useGetBudgetsQuery } from "@/lib/redux/financesApi";
import { DataTable } from "@/components/ui/data-table";
import { columns } from "./columns";
import Link from "next/link";
import { PlusCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { SortingState, PaginationState } from "@tanstack/react-table";

export default function BudgetsPage() {
  // Use proper pagination state matching the DataTable component
  const [pagination, setPagination] = useState<PaginationState>({
    pageIndex: 0,
    pageSize: 10,
  });

  // Add sorting state
  const [sorting, setSorting] = useState<SortingState>([]);

  // Add filter state to track filters coming from DataTable
  const [filters, setFilters] = useState<{ id: string; value: string }[]>([]);

  // Calculate API page number (1-based) from pageIndex (0-based)
  const page = pagination.pageIndex + 1;
  const pageSize = pagination.pageSize;

  // Using RTK Query to fetch budgets
  const {
    data: budgetData,
    isLoading,
    isFetching,
  } = useGetBudgetsQuery({
    page,
    pageSize,
    filters:
      filters.length > 0
        ? filters.reduce(
            (acc, filter) => ({ ...acc, [filter.id]: filter.value }),
            {}
          )
        : undefined,
    sorts:
      sorting.length > 0
        ? sorting.map((sort) => `${sort.desc ? "-" : ""}${sort.id}`)
        : ["-startDate"],
  });

  // Handle loading state
  if (isLoading) {
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <h1 className="text-3xl font-bold">Budgets</h1>
          <Skeleton className="h-10 w-32" />
        </div>
        <div className="border rounded-md">
          <Skeleton className="h-[500px] w-full" />
        </div>
      </div>
    );
  }

  // Handle error state
  if (budgetData === undefined) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[400px] border border-red-200 rounded-md bg-red-50 p-6">
        <h3 className="text-xl font-semibold text-red-700">
          Error loading budgets
        </h3>
        <p className="text-red-600 mt-2">
          Please try again later or contact support.
        </p>
      </div>
    );
  }

  const budgets = budgetData?.data || [];
  const totalPages = budgetData?.pageCount || 1;

  // Handle filter changes from DataTable
  function handleFilterChange(filters: { id: string; value: string }[]) {
    setFilters(filters.filter((f) => f.value !== ""));
    setPagination((prev) => ({ ...prev, pageIndex: 0 })); // Reset to first page when filtering
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold">Budgets</h1>
        <Button asChild>
          <Link href="/dashboard/finances/budgets/new">
            <PlusCircle className="mr-2 h-4 w-4" />
            New Budget
          </Link>
        </Button>
      </div>

      <DataTable
        columns={columns}
        data={budgets}
        isLoading={isLoading}
        isPaginationLoading={isFetching && !isLoading}
        isSortingLoading={isFetching && !isLoading}
        isFilteringLoading={isFetching && !isLoading}
        pageCount={totalPages}
        manualPagination={true}
        manualSorting={true}
        manualFiltering={true}
        onPaginationChange={setPagination}
        onSortingChange={setSorting}
        onFilterChange={handleFilterChange}
        filterableColumns={["name", "costCenter"]}
      />
    </div>
  );
}
