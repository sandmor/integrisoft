"use client";

import { useState } from "react";
import {
  ColumnDef,
  ColumnFiltersState,
  SortingState,
  VisibilityState,
  flexRender,
  getCoreRowModel,
  getFilteredRowModel,
  getPaginationRowModel,
  getSortedRowModel,
  useReactTable,
} from "@tanstack/react-table";

import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Button } from "@/components/ui/button";
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
  data: TData[];
  searchColumn?: string;
  searchPlaceholder?: string;
  isLoading?: boolean;
}

export function DataTable<TData, TValue>({
  columns,
  data,
  searchColumn,
  searchPlaceholder = "Filter...",
  isLoading = false,
}: DataTableProps<TData, TValue>) {
  const [sorting, setSorting] = useState<SortingState>([]);
  const [columnFilters, setColumnFilters] = useState<ColumnFiltersState>([]);
  const [columnVisibility, setColumnVisibility] = useState<VisibilityState>({});
  const [rowSelection, setRowSelection] = useState({});

  const table = useReactTable({
    data,
    columns,
    onSortingChange: setSorting,
    onColumnFiltersChange: setColumnFilters,
    getCoreRowModel: getCoreRowModel(),
    getPaginationRowModel: getPaginationRowModel(),
    getSortedRowModel: getSortedRowModel(),
    getFilteredRowModel: getFilteredRowModel(),
    onColumnVisibilityChange: setColumnVisibility,
    onRowSelectionChange: setRowSelection,
    state: {
      sorting,
      columnFilters,
      columnVisibility,
      rowSelection,
    },
  });

  return (
    <div className="w-full">
      {searchColumn && (
        <div className="flex items-center py-4">
          <Input
            placeholder={searchPlaceholder}
            value={
              (table.getColumn(searchColumn)?.getFilterValue() as string) ?? ""
            }
            onChange={(event) =>
              table.getColumn(searchColumn)?.setFilterValue(event.target.value)
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
