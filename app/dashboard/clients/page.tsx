"use client";

import { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import { DataTable } from "@/components/ui/data-table";
import { Button } from "@/components/ui/button";
import { Plus } from "lucide-react";
import { columns } from "./columns";
import { keepPreviousData, useQuery } from "@tanstack/react-query";
import { SortingState, PaginationState } from "@tanstack/react-table";

// Fetch client data from API
async function fetchClients({
  pageIndex,
  pageSize,
  sorting,
  filters,
}: {
  pageIndex: number;
  pageSize: number;
  sorting: SortingState;
  filters: { id: string; value: string }[];
}) {
  // Build the query string
  const params = new URLSearchParams();
  params.append("page", pageIndex.toString());
  params.append("pageSize", pageSize.toString());

  // Add multi-column sorting
  sorting.forEach((sort) => {
    params.append("sorts", `${sort.id}:${sort.desc ? "desc" : "asc"}`);
  });

  // Add multi-column filtering
  filters.forEach((filter) => {
    if (filter.value) {
      params.append("filters", `${filter.id}:${filter.value}`);
    }
  });

  // Fetch data from the API
  const response = await fetch(`/api/clients?${params.toString()}`);

  if (!response.ok) {
    throw new Error("Failed to fetch clients");
  }

  return response.json();
}

export default function ClientsPage() {
  // State for table controls
  const [sorting, setSorting] = useState<SortingState>([]);
  const [pagination, setPagination] = useState<PaginationState>({
    pageIndex: 0,
    pageSize: 10,
  });
  const [filters, setFilters] = useState<Array<{ id: string; value: string }>>(
    []
  );

  // Derive query parameters from state
  const { pageIndex, pageSize } = pagination;

  // Fetch data with react-query
  const { data, isLoading, isError } = useQuery({
    queryKey: ["clients", pageIndex, pageSize, sorting, filters],
    queryFn: () => fetchClients({ pageIndex, pageSize, sorting, filters }),
    placeholderData: keepPreviousData,
  });

  const handleFilterChange = useCallback(
    (newFilters: { id: string; value: string }[]) => {
      setFilters(newFilters);
      // Reset to first page when filters change
      setPagination((prev) => ({ ...prev, pageIndex: 0 }));
    },
    []
  );

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
        {isError ? (
          <div className="text-center py-4 text-red-600">
            Error loading clients. Please try again.
          </div>
        ) : (
          <DataTable
            columns={columns}
            data={data?.data || []}
            searchColumn="name"
            searchPlaceholder="Search clients..."
            isLoading={isLoading}
            pageCount={data?.pageCount || 0}
            manualPagination={true}
            manualSorting={true}
            manualFiltering={true}
            onPaginationChange={setPagination}
            onSortingChange={setSorting}
            onFilterChange={handleFilterChange}
            filterableColumns={["name", "industry", "website"]}
          />
        )}
      </div>
    </>
  );
}
