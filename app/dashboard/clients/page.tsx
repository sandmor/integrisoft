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
  const params = new URLSearchParams();
  params.append("page", pageIndex.toString());
  params.append("pageSize", pageSize.toString());

  sorting.forEach((sort) => {
    params.append("sorts", `${sort.id}:${sort.desc ? "desc" : "asc"}`);
  });

  filters.forEach((filter) => {
    if (filter.value) {
      params.append("filters", `${filter.id}:${filter.value}`);
    }
  });

  const response = await fetch(`/api/clients?${params.toString()}`);

  if (!response.ok) {
    throw new Error("Failed to fetch clients");
  }

  return response.json();
}

export default function ClientsPage() {
  const [sorting, setSorting] = useState<SortingState>([]);
  const [pagination, setPagination] = useState<PaginationState>({
    pageIndex: 0,
    pageSize: 10,
  });
  const [filters, setFilters] = useState<Array<{ id: string; value: string }>>(
    []
  );

  // Loading states
  const [isPaginationLoading, setIsPaginationLoading] = useState(false);
  const [isSortingLoading, setIsSortingLoading] = useState(false);
  const [isFilteringLoading, setIsFilteringLoading] = useState(false);

  // Query parameters
  const { pageIndex, pageSize } = pagination;

  // Data fetching
  const { data, isLoading, isError, isFetching } = useQuery({
    queryKey: ["clients", pageIndex, pageSize, sorting, filters],
    queryFn: () => fetchClients({ pageIndex, pageSize, sorting, filters }),
    placeholderData: keepPreviousData,
  });

  // Update loading states
  useEffect(() => {
    if (isFetching) {
      if (filters.length > 0) {
        setIsFilteringLoading(true);
      } else if (sorting.length > 0) {
        setIsSortingLoading(true);
      } else {
        setIsPaginationLoading(true);
      }
    } else {
      setIsFilteringLoading(false);
      setIsSortingLoading(false);
      setIsPaginationLoading(false);
    }
  }, [isFetching, filters, sorting]);

  const handleFilterChange = useCallback(
    (newFilters: { id: string; value: string }[]) => {
      setIsFilteringLoading(true);
      setFilters(newFilters);
      setPagination((prev) => ({ ...prev, pageIndex: 0 }));
    },
    []
  );

  const handleSortingChange = useCallback(
    (updaterOrValue: SortingState | ((prev: SortingState) => SortingState)) => {
      setIsSortingLoading(true);
      if (typeof updaterOrValue === "function") {
        setSorting(updaterOrValue);
      } else {
        setSorting(updaterOrValue);
      }
    },
    []
  );

  const handlePaginationChange = useCallback(
    (
      updaterOrValue:
        | PaginationState
        | ((prev: PaginationState) => PaginationState)
    ) => {
      setIsPaginationLoading(true);
      if (typeof updaterOrValue === "function") {
        setPagination(updaterOrValue);
      } else {
        setPagination(updaterOrValue);
      }
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
            isLoading={isLoading}
            pageCount={data?.pageCount || 0}
            manualPagination={true}
            manualSorting={true}
            manualFiltering={true}
            onPaginationChange={handlePaginationChange}
            onSortingChange={handleSortingChange}
            onFilterChange={handleFilterChange}
            filterableColumns={["name", "industry", "website"]}
            isPaginationLoading={isPaginationLoading}
            isSortingLoading={isSortingLoading}
            isFilteringLoading={isFilteringLoading}
          />
        )}
      </div>
    </>
  );
}
