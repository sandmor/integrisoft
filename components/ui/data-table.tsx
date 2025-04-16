"use client";

import { useState, useEffect } from "react";
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
import { ArrowDown, ArrowUp, ArrowUpDown } from "lucide-react";

interface DataTableProps<TData, TValue> {
  columns: ColumnDef<TData, TValue>[];
  data?: TData[];
  searchColumn?: string;
  searchPlaceholder?: string;
  isLoading?: boolean;
  // New props for server-side pagination
  pageCount?: number;
  manualPagination?: boolean;
  manualSorting?: boolean;
  manualFiltering?: boolean;
  onPaginationChange?: OnChangeFn<PaginationState>;
  onSortingChange?: OnChangeFn<SortingState>;
  onFilterChange?: (filters: { id: string; value: string }[]) => void;
  // New props for multi-column filtering
  filterableColumns?: string[];
}

export function DataTable<TData, TValue>({
  columns,
  data = [],
  searchColumn,
  searchPlaceholder = "Filter...",
  isLoading = false,
  pageCount = 0,
  manualPagination = false,
  manualSorting = false,
  manualFiltering = false,
  onPaginationChange,
  onSortingChange,
  onFilterChange,
  filterableColumns = [],
}: DataTableProps<TData, TValue>) {
  const [sorting, setSorting] = useState<SortingState>([]);
  const [columnFilters, setColumnFilters] = useState<ColumnFiltersState>([]);
  const [columnVisibility, setColumnVisibility] = useState<VisibilityState>({});
  const [rowSelection, setRowSelection] = useState({});
  const [{ pageIndex, pageSize }, setPagination] = useState<PaginationState>({
    pageIndex: 0,
    pageSize: 10,
  });

  // Handle server-side operations
  const pagination = {
    pageIndex,
    pageSize,
  };

  // Handle filter changes if manual filtering is enabled
  useEffect(() => {
    if (manualFiltering && onFilterChange) {
      // Pass all active filters to the parent component
      onFilterChange(
        columnFilters.map((filter) => ({
          id: filter.id,
          value: filter.value as string,
        }))
      );
    }
  }, [columnFilters, manualFiltering, onFilterChange]);

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
    onSortingChange: manualSorting ? onSortingChange : setSorting,
    onColumnFiltersChange: setColumnFilters,
    onColumnVisibilityChange: setColumnVisibility,
    onRowSelectionChange: setRowSelection,
    onPaginationChange: manualPagination ? onPaginationChange : setPagination,
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

          {/* Keep the original global search if searchColumn is provided */}
          {searchColumn && !filterableColumns.includes(searchColumn) && (
            <div className="flex flex-col space-y-1">
              <label
                htmlFor="global-search"
                className="text-xs font-medium text-muted-foreground"
              >
                Global Search
              </label>
              <Input
                id="global-search"
                placeholder={searchPlaceholder}
                value={
                  (table.getColumn(searchColumn)?.getFilterValue() as string) ??
                  ""
                }
                onChange={(event) =>
                  table
                    .getColumn(searchColumn)
                    ?.setFilterValue(event.target.value)
                }
                className="h-8 w-[150px] sm:w-[200px]"
                disabled={isLoading}
              />
            </div>
          )}
        </div>
      )}

      {/* Show simple search if no filterableColumns and searchColumn exists */}
      {(!filterableColumns || filterableColumns.length === 0) &&
        searchColumn && (
          <div className="flex items-center py-4">
            <Input
              placeholder={searchPlaceholder}
              value={
                (table.getColumn(searchColumn)?.getFilterValue() as string) ??
                ""
              }
              onChange={(event) =>
                table
                  .getColumn(searchColumn)
                  ?.setFilterValue(event.target.value)
              }
              className="max-w-sm"
              disabled={isLoading}
            />
          </div>
        )}

      <div className="rounded-md border bg-card">
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
                            header.column.getCanSort()
                              ? "cursor-pointer select-none"
                              : ""
                          }`}
                          onClick={header.column.getToggleSortingHandler()}
                        >
                          {flexRender(
                            header.column.columnDef.header,
                            header.getContext()
                          )}

                          {header.column.getCanSort() && (
                            <div className="ml-2">
                              {{
                                asc: <ArrowUp className="h-4 w-4" />,
                                desc: <ArrowDown className="h-4 w-4" />,
                                false: (
                                  <ArrowUpDown className="h-4 w-4 opacity-50" />
                                ),
                              }[header.column.getIsSorted() as string] ?? null}
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
            {isLoading ? (
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
                    !table.getCanPreviousPage() || isLoading
                      ? "pointer-events-none opacity-50"
                      : ""
                  }
                  aria-disabled={!table.getCanPreviousPage() || isLoading}
                />
              </PaginationItem>

              {/* First page */}
              <PaginationItem>
                <PaginationLink
                  onClick={() => table.setPageIndex(0)}
                  isActive={table.getState().pagination.pageIndex === 0}
                  tabIndex={0}
                  className={isLoading ? "pointer-events-none opacity-50" : ""}
                  aria-disabled={isLoading}
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
                        isLoading ? "pointer-events-none opacity-50" : ""
                      }
                      aria-disabled={isLoading}
                    >
                      {table.getState().pagination.pageIndex + 1}
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
                      isLoading ? "pointer-events-none opacity-50" : ""
                    }
                    aria-disabled={isLoading}
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
                    !table.getCanNextPage() || isLoading
                      ? "pointer-events-none opacity-50"
                      : ""
                  }
                  aria-disabled={!table.getCanNextPage() || isLoading}
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
              disabled={isLoading}
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
