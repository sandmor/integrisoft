"use client";

import { useState } from "react";
import Link from "next/link";
import { DataTable } from "@/components/ui/data-table";
import { Button } from "@/components/ui/button";
import { Plus } from "lucide-react";
import { columns } from "./columns";
import { SortingState, PaginationState } from "@tanstack/react-table";
import { useGetClientsQuery } from "@/lib/redux/clientsApi";
import { Skeleton } from "@/components/ui/skeleton";

export default function ClientsPage() {
  const [sorting, setSorting] = useState<SortingState>([]);
  const [pagination, setPagination] = useState<PaginationState>({
    pageIndex: 0,
    pageSize: 10,
  });
  const [filters, setFilters] = useState<Array<{ id: string; value: string }>>(
    []
  );

  const page = pagination.pageIndex;
  const pageSize = pagination.pageSize;

  // Convert sorting format from DataTable to API format
  const sortParams =
    sorting.length > 0
      ? sorting.map((sort) => `${sort.desc ? "-" : ""}${sort.id}`)
      : undefined;

  // Convert filters from DataTable to API format
  const filterParams =
    filters.length > 0
      ? filters
          .filter((f) => f.value)
          .map((filter) => `${filter.id}:${filter.value}`)
      : undefined;

  // Using RTK Query to fetch clients
  const {
    data: clientData,
    isLoading,
    isFetching,
  } = useGetClientsQuery({
    page,
    pageSize,
    filters: filterParams,
    sorts: sortParams,
  });

  // Handle loading state
  if (isLoading) {
    return (
      <div className="space-y-6">
        <div className="flex justify-between items-center border-b px-6 py-4">
          <div>
            <h2 className="text-xl font-semibold">Clients</h2>
            <p className="text-sm text-muted-foreground">
              Manage your client relationships
            </p>
          </div>
          <Skeleton className="h-10 w-32" />
        </div>
        <div className="p-6">
          <Skeleton className="h-[500px] w-full" />
        </div>
      </div>
    );
  }

  // Handle error state
  if (clientData === undefined) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[400px] border border-red-200 rounded-md bg-red-50 p-6 mx-6 my-6">
        <h3 className="text-xl font-semibold text-red-700">
          Error loading clients
        </h3>
        <p className="text-red-600 mt-2">
          Please try again later or contact support.
        </p>
      </div>
    );
  }

  const clients = clientData?.data || [];
  const totalPages = clientData?.pageCount || 1;

  return (
    <>
      <div className="flex justify-between items-center border-b px-6 py-4">
        <div>
          <h2 className="text-xl font-semibold">Clients</h2>
          <p className="text-sm text-muted-foreground">
            Manage your client relationships
          </p>
        </div>
        <Button asChild>
          <Link href="/dashboard/clients/new">
            <Plus className="mr-2 h-4 w-4" />
            Add Client
          </Link>
        </Button>
      </div>
      <div className="p-6">
        <DataTable
          columns={columns}
          data={clients}
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
          onFilterChange={setFilters}
          filterableColumns={["name", "industry", "website"]}
        />
      </div>
    </>
  );
}
