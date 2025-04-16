"use client";

import { useState, useEffect, useCallback } from "react";
import {
  ColumnDef,
  ColumnFiltersState,
  SortingState,
  VisibilityState,
  flexRender,
  getCoreRowModel,
  getPaginationRowModel,
  getSortedRowModel,
  getFilteredRowModel,
  useReactTable,
  PaginationState,
  OnChangeFn,
} from "@tanstack/react-table";

import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Input } from "@/components/ui/input";
import { TableLoadingSpinner } from "./spinner";
import {
  Pagination,
  PaginationContent,
  PaginationEllipsis,
  PaginationItem,
  PaginationLink,
  PaginationNext,
  PaginationPrevious,
} from "@/components/ui/pagination";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { ArrowDown, ArrowUp, ArrowUpDown, Loader2 } from "lucide-react";
import debounce from "lodash.debounce";

interface DataTableProps<TData, TValue> {
  columns: ColumnDef<TData, TValue>[];
  data?: TData[];
  isLoading?: boolean;
  pageCount?: number;
  manualPagination?: boolean;
  manualSorting?: boolean;
  manualFiltering?: boolean;
  onPaginationChange?: OnChangeFn<PaginationState>;
  onSortingChange?: OnChangeFn<SortingState>;
  onFilterChange?: (filters: { id: string; value: string }[]) => void;
  filterableColumns?: string[];
  isSortingLoading?: boolean;
  isFilteringLoading?: boolean;
  isPaginationLoading?: boolean;
}

export function DataTable<TData, TValue>({
  columns,
  data = [],
  isLoading = false,
  pageCount = 0,
  manualPagination = false,
  manualSorting = false,
  manualFiltering = false,
  onPaginationChange,
  onSortingChange,
  onFilterChange,
  filterableColumns = [],
  isSortingLoading = false,
  isFilteringLoading = false,
  isPaginationLoading = false,
}: DataTableProps<TData, TValue>) {
  const [sorting, setSorting] = useState<SortingState>([]);
  const [columnFilters, setColumnFilters] = useState<ColumnFiltersState>([]);
  const [columnVisibility, setColumnVisibility] = useState<VisibilityState>({});
  const [rowSelection, setRowSelection] = useState({});
  const [{ pageIndex, pageSize }, setPagination] = useState<PaginationState>({
    pageIndex: 0,
    pageSize: 10,
  });

  // Loading states for different operations
  const anyLoading =
    isLoading || isSortingLoading || isFilteringLoading || isPaginationLoading;

  // Handle server-side operations
  const pagination = {
    pageIndex,
    pageSize,
  };

  // Debounce filter changes to prevent UI freezing with rapid typing
  // eslint-disable-next-line react-hooks/exhaustive-deps
  const debouncedFiltersChange = useCallback(
    debounce((filters: ColumnFiltersState) => {
      if (manualFiltering && onFilterChange) {
        onFilterChange(
          filters.map((filter) => ({
            id: filter.id,
            value: filter.value as string,
          }))
        );
      }
    }, 300),
    [manualFiltering, onFilterChange]
  );

  // Use the debounced handler for filter changes
  useEffect(() => {
    debouncedFiltersChange(columnFilters);
    return () => {
      debouncedFiltersChange.cancel();
    };
  }, [columnFilters, debouncedFiltersChange]);

  // Async sorting handler with loading state support
  const handleSortingChange: OnChangeFn<SortingState> = (updater) => {
    // If manual sorting, delegate to parent
    if (manualSorting && onSortingChange) {
      onSortingChange(updater);
    } else {
      // Otherwise handle locally
      setSorting(updater);
    }
  };

  // Async pagination handler with loading state support
  const handlePaginationChange: OnChangeFn<PaginationState> = (updater) => {
    if (manualPagination && onPaginationChange) {
      onPaginationChange(updater);
    } else {
      setPagination(updater);
    }
  };

  const table = useReactTable({
    data,
    columns,
    pageCount: manualPagination ? pageCount : undefined,
    state: {
      sorting,
      columnFilters,
      columnVisibility,
      rowSelection,
      pagination,
    },
    onSortingChange: handleSortingChange,
    onColumnFiltersChange: setColumnFilters,
    onColumnVisibilityChange: setColumnVisibility,
    onRowSelectionChange: setRowSelection,
    onPaginationChange: handlePaginationChange,
    getCoreRowModel: getCoreRowModel(),
    getFilteredRowModel: getFilteredRowModel(),
    getPaginationRowModel: getPaginationRowModel(),
    getSortedRowModel: getSortedRowModel(),
    manualPagination,
    manualSorting,
    manualFiltering,
  });

  return (
    <div className="w-full">
      {/* Multi-column filter section */}
      {filterableColumns && filterableColumns.length > 0 && (
        <div className="flex flex-wrap items-center gap-4 py-4">
          {filterableColumns.map((columnId) => {
            const column = table.getColumn(columnId);
            if (!column) return null;

            const columnDef = columns.find(
              (col) => "accessorKey" in col && col.accessorKey === columnId
            );
            const columnName =
              columnDef && "header" in columnDef
                ? typeof columnDef.header === "string"
                  ? columnDef.header
                  : columnId
                : columnId;

            return (
              <div key={columnId} className="flex flex-col space-y-1">
                <label
                  htmlFor={`filter-${columnId}`}
                  className="text-xs font-medium text-muted-foreground"
                >
                  {columnName}
                </label>
                <Input
                  id={`filter-${columnId}`}
                  placeholder={`Filter ${columnName}...`}
                  value={(column.getFilterValue() as string) ?? ""}
                  onChange={(event) =>
                    column.setFilterValue(event.target.value)
                  }
                  className="h-8 w-[150px] sm:w-[200px]"
                  disabled={isLoading}
                />
              </div>
            );
          })}
        </div>
      )}

      <div className="rounded-md border bg-card relative">
        {/* Show overlay spinner only when we have data and are performing an operation */}
        {anyLoading && table.getRowModel().rows.length > 0 && (
          <div className="absolute inset-0 bg-background/50 flex items-center justify-center z-10">
            <TableLoadingSpinner />
          </div>
        )}

        <Table>
          <TableHeader>
            {table.getHeaderGroups().map((headerGroup) => (
              <TableRow key={headerGroup.id}>
                {headerGroup.headers.map((header) => {
                  return (
                    <TableHead key={header.id}>
                      {header.isPlaceholder ? null : (
                        <div
                          className={`flex items-center space-x-2 ${
                            header.column.getCanSort() && !isSortingLoading
                              ? "cursor-pointer select-none"
                              : ""
                          }`}
                          onClick={
                            isSortingLoading
                              ? undefined
                              : header.column.getToggleSortingHandler()
                          }
                        >
                          {flexRender(
                            header.column.columnDef.header,
                            header.getContext()
                          )}

                          {header.column.getCanSort() && (
                            <div className="ml-2 flex items-center">
                              {isSortingLoading &&
                              header.column.getIsSorted() ? (
                                <Loader2 className="h-4 w-4 animate-spin" />
                              ) : (
                                {
                                  asc: <ArrowUp className="h-4 w-4" />,
                                  desc: <ArrowDown className="h-4 w-4" />,
                                  false: (
                                    <ArrowUpDown className="h-4 w-4 opacity-50" />
                                  ),
                                }[header.column.getIsSorted() as string] ?? null
                              )}
                            </div>
                          )}
                        </div>
                      )}
                    </TableHead>
                  );
                })}
              </TableRow>
            ))}
          </TableHeader>
          <TableBody>
            {anyLoading && table.getRowModel().rows.length === 0 ? (
              <TableRow>
                <TableCell colSpan={columns.length} className="h-24 p-0">
                  <TableLoadingSpinner />
                </TableCell>
              </TableRow>
            ) : table.getRowModel().rows?.length ? (
              table.getRowModel().rows.map((row) => (
                <TableRow
                  key={row.id}
                  data-state={row.getIsSelected() && "selected"}
                >
                  {row.getVisibleCells().map((cell) => (
                    <TableCell key={cell.id}>
                      {flexRender(
                        cell.column.columnDef.cell,
                        cell.getContext()
                      )}
                    </TableCell>
                  ))}
                </TableRow>
              ))
            ) : (
              <TableRow>
                <TableCell
                  colSpan={columns.length}
                  className="h-24 text-center"
                >
                  No results.
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>
      <div className="flex items-center justify-end space-x-4 py-4">
        <div className="text-sm text-muted-foreground mr-auto">
          {table.getFilteredSelectedRowModel().rows.length} of{" "}
          {table.getFilteredRowModel().rows.length} row(s) selected.
        </div>

        <div className="flex items-center space-x-4">
          <Pagination>
            <PaginationContent>
              <PaginationItem>
                <PaginationPrevious
                  onClick={() => table.previousPage()}
                  tabIndex={0}
                  className={
                    !table.getCanPreviousPage() || anyLoading
                      ? "pointer-events-none opacity-50"
                      : ""
                  }
                  aria-disabled={!table.getCanPreviousPage() || anyLoading}
                />
              </PaginationItem>

              {/* First page */}
              <PaginationItem>
                <PaginationLink
                  onClick={() => table.setPageIndex(0)}
                  isActive={table.getState().pagination.pageIndex === 0}
                  tabIndex={0}
                  className={anyLoading ? "pointer-events-none opacity-50" : ""}
                  aria-disabled={anyLoading}
                >
                  1
                </PaginationLink>
              </PaginationItem>

              {/* Show ellipsis if we're beyond page 2 */}
              {table.getPageCount() > 2 &&
                table.getState().pagination.pageIndex > 1 && (
                  <PaginationItem>
                    <PaginationEllipsis />
                  </PaginationItem>
                )}

              {/* Current page (if not first or last) */}
              {table.getState().pagination.pageIndex > 0 &&
                table.getState().pagination.pageIndex <
                  table.getPageCount() - 1 && (
                  <PaginationItem>
                    <PaginationLink
                      onClick={() =>
                        table.setPageIndex(
                          table.getState().pagination.pageIndex
                        )
                      }
                      isActive={true}
                      tabIndex={0}
                      className={
                        anyLoading ? "pointer-events-none opacity-50" : ""
                      }
                      aria-disabled={anyLoading}
                    >
                      {isPaginationLoading ? (
                        <Loader2 className="h-4 w-4 animate-spin mx-1" />
                      ) : (
                        table.getState().pagination.pageIndex + 1
                      )}
                    </PaginationLink>
                  </PaginationItem>
                )}

              {/* Show ellipsis if there are more pages and we're not at the end */}
              {table.getPageCount() > 2 &&
                table.getState().pagination.pageIndex <
                  table.getPageCount() - 2 && (
                  <PaginationItem>
                    <PaginationEllipsis />
                  </PaginationItem>
                )}

              {/* Last page (if more than 1 page) */}
              {table.getPageCount() > 1 && (
                <PaginationItem>
                  <PaginationLink
                    onClick={() => table.setPageIndex(table.getPageCount() - 1)}
                    isActive={
                      table.getState().pagination.pageIndex ===
                      table.getPageCount() - 1
                    }
                    tabIndex={0}
                    className={
                      anyLoading ? "pointer-events-none opacity-50" : ""
                    }
                    aria-disabled={anyLoading}
                  >
                    {table.getPageCount()}
                  </PaginationLink>
                </PaginationItem>
              )}

              <PaginationItem>
                <PaginationNext
                  onClick={() => table.nextPage()}
                  tabIndex={0}
                  className={
                    !table.getCanNextPage() || anyLoading
                      ? "pointer-events-none opacity-50"
                      : ""
                  }
                  aria-disabled={!table.getCanNextPage() || anyLoading}
                />
              </PaginationItem>
            </PaginationContent>
          </Pagination>

          <div className="flex items-center space-x-2">
            <p className="text-sm text-muted-foreground whitespace-nowrap">
              Rows per page
            </p>
            <Select
              value={`${table.getState().pagination.pageSize}`}
              onValueChange={(value) => table.setPageSize(Number(value))}
              disabled={anyLoading}
            >
              <SelectTrigger
                className="h-8 w-[70px]"
                aria-label="Rows per page"
              >
                <SelectValue
                  placeholder={table.getState().pagination.pageSize}
                />
              </SelectTrigger>
              <SelectContent>
                {[10, 20, 30, 40, 50].map((pageSize) => (
                  <SelectItem key={pageSize} value={`${pageSize}`}>
                    {pageSize}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>
      </div>
    </div>
  );
}
