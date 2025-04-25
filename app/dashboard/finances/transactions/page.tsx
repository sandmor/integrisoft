"use client";

import { useCallback, useState } from "react";
import { useGetTransactionsQuery } from "@/lib/redux/financesApi";
import { DataTable } from "@/components/ui/data-table";
import { columns } from "./columns";
import Link from "next/link";
import { PlusCircle, Download } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { SortingState, PaginationState } from "@tanstack/react-table";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

export default function TransactionsPage() {
  // Use proper pagination state matching the DataTable component
  const [pagination, setPagination] = useState<PaginationState>({
    pageIndex: 0,
    pageSize: 10,
  });

  // Add sorting state
  const [sorting, setSorting] = useState<SortingState>([]);

  // Add filter state to track filters coming from DataTable
  const [filters, setFilters] = useState<{ id: string; value: string }[]>([]);

  const page = pagination.pageIndex;
  const pageSize = pagination.pageSize;

  // Using RTK Query to fetch transactions
  const {
    data: transactionsData,
    isLoading,
    isFetching,
  } = useGetTransactionsQuery({
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
        : ["-date"], // Default sort by date descending
  });

  // Handle filter changes from DataTable
  const handleFilterChange = useCallback(
    (filters: { id: string; value: string }[]) => {
      setFilters(filters.filter((f) => f.value !== ""));
    },
    []
  );

  // Handle loading state
  if (isLoading) {
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <h1 className="text-3xl font-bold">Transactions</h1>
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
            <Skeleton className="h-[500px] w-full" />
          </CardContent>
        </Card>
      </div>
    );
  }

  // Handle error state
  if (transactionsData === undefined) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[400px] border border-red-200 rounded-md bg-red-50 p-6">
        <h3 className="text-xl font-semibold text-red-700">
          Error loading transactions
        </h3>
        <p className="text-red-600 mt-2">
          Please try again later or contact support.
        </p>
      </div>
    );
  }

  const transactions = transactionsData?.data || [];
  const totalPages = transactionsData?.pageCount || 1;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold">Transactions</h1>
        <div className="flex gap-2">
          <Button variant="outline">
            <Download className="mr-2 h-4 w-4" />
            Export
          </Button>
          <Button asChild>
            <Link href="/dashboard/finances/transactions/new">
              <PlusCircle className="mr-2 h-4 w-4" />
              New Transaction
            </Link>
          </Button>
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Transactions List</CardTitle>
          <CardDescription>
            View and manage all financial transactions
          </CardDescription>
        </CardHeader>
        <CardContent>
          <DataTable
            columns={columns}
            data={transactions}
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
            filterableColumns={["description", "type"]}
          />
        </CardContent>
      </Card>
    </div>
  );
}
