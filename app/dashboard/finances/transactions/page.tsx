"use client";

import { Button } from "@/components/ui/button";
import { PlusCircle, Download, Filter } from "lucide-react";
import { Input } from "@/components/ui/input";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import Link from "next/link";
import { DataTable } from "@/components/ui/data-table";
import { useGetTransactionsQuery } from "@/lib/redux/financesApi";
import { useState } from "react";
import {
  ColumnDef,
  SortingState,
  PaginationState,
} from "@tanstack/react-table";
import { format } from "date-fns";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { TransactionListItem } from "@/lib/types";

type TransactionTableItem = {
  id: string;
  date: string;
  type: "income" | "expense" | "transfer";
  amount: number;
  description: string | null;
  categoryName?: string | null;
  approvedAt: string | null;
  costCenterName?: string | null;
  projectName?: string | null;
};

export default function TransactionsPage() {
  // Set up proper pagination state using PaginationState type
  const [pagination, setPagination] = useState<PaginationState>({
    pageIndex: 0,
    pageSize: 10,
  });

  // Add sorting state
  const [sorting, setSorting] = useState<SortingState>([]);

  // Add filter state to track filters coming from DataTable and custom filters
  const [filters, setFilters] = useState<{ id: string; value: string }[]>([]);
  const [transactionType, setTransactionType] = useState<
    "income" | "expense" | "transfer" | "all"
  >("all");
  const [searchTerm, setSearchTerm] = useState("");

  // Calculate API page number (1-based) from pageIndex (0-based)
  const page = pagination.pageIndex + 1;
  const pageSize = pagination.pageSize;

  // Build filters object combining DataTable filters and custom filters
  const filtersObject = {
    ...(searchTerm ? { description: searchTerm } : {}),
    ...(transactionType && transactionType !== "all"
      ? { type: transactionType }
      : {}),
    ...filters.reduce(
      (acc, filter) => ({ ...acc, [filter.id]: filter.value }),
      {}
    ),
  };

  // Fetch transactions data using the Redux hook
  const {
    data: transactionsData,
    isLoading,
    isFetching,
    error,
  } = useGetTransactionsQuery({
    page,
    pageSize,
    sorts:
      sorting.length > 0
        ? sorting.map((sort) => `${sort.desc ? "-" : ""}${sort.id}`)
        : ["-date"], // Default sort by date descending
    filters: Object.keys(filtersObject).length > 0 ? filtersObject : undefined,
  });

  // Handle filter changes from DataTable
  function handleFilterChange(filters: { id: string; value: string }[]) {
    setFilters(filters.filter((f) => f.value !== ""));
    setPagination((prev) => ({ ...prev, pageIndex: 0 })); // Reset to first page when filtering
  }

  // Apply search term and transaction type filter
  const handleSearch = () => {
    setPagination((prev) => ({ ...prev, pageIndex: 0 })); // Reset to first page when filtering
  };

  // Define columns with proper typing
  const columns: ColumnDef<TransactionTableItem>[] = [
    {
      accessorKey: "date",
      header: "Date",
      cell: ({ row }) => {
        const dateValue = row.getValue("date") as string;
        return dateValue ? (
          <div>{format(new Date(dateValue), "yyyy-MM-dd")}</div>
        ) : null;
      },
    },
    {
      accessorKey: "type",
      header: "Type",
      cell: ({ row }) => {
        const type = row.getValue("type") as string;
        return (
          <div
            className={`
            px-2 py-1 rounded-md text-xs font-medium inline-block
            ${type === "income" ? "bg-green-100 text-green-800" : ""}
            ${type === "expense" ? "bg-red-100 text-red-800" : ""}
            ${type === "transfer" ? "bg-blue-100 text-blue-800" : ""}
          `}
          >
            {type === "income"
              ? "Income"
              : type === "expense"
              ? "Expense"
              : "Transfer"}
          </div>
        );
      },
    },
    {
      accessorKey: "categoryName",
      header: "Category",
      cell: ({ row }) => {
        const categoryName = row.getValue("categoryName") as string | null;
        return <div>{categoryName || "Uncategorized"}</div>;
      },
    },
    {
      accessorKey: "amount",
      header: "Amount",
      cell: ({ row }) => {
        const amount = row.getValue("amount") as number;
        const type = row.getValue("type") as string;

        // Format the amount as currency
        const formatted = new Intl.NumberFormat("en-US", {
          style: "currency",
          currency: "USD",
        }).format(amount);

        return (
          <div
            className={`font-medium ${
              type === "expense" ? "text-red-600" : "text-green-600"
            }`}
          >
            {formatted}
          </div>
        );
      },
    },
    {
      accessorKey: "description",
      header: "Description",
      cell: ({ row }) => {
        const description = row.getValue("description") as string | null;
        return (
          <div className="truncate max-w-[200px]">{description || "-"}</div>
        );
      },
    },
    {
      accessorKey: "approvedAt",
      header: "Status",
      cell: ({ row }) => {
        const approvedAt = row.getValue("approvedAt") as string | null;
        const status = approvedAt ? "approved" : "pending";

        return (
          <div
            className={`
            px-2 py-1 rounded-md text-xs font-medium inline-block
            ${status === "approved" ? "bg-green-100 text-green-800" : ""}
            ${status === "pending" ? "bg-yellow-100 text-yellow-800" : ""}
          `}
          >
            {status === "approved" ? "Approved" : "Pending"}
          </div>
        );
      },
    },
    {
      accessorKey: "id",
      header: "Actions",
      cell: ({ row }) => {
        const id = row.getValue("id") as string;
        return (
          <div className="flex items-center gap-2">
            <Link href={`/dashboard/finances/transactions/${id}`}>
              <Button variant="outline" size="sm">
                View
              </Button>
            </Link>
          </div>
        );
      },
    },
  ];

  // Transform API data to table format
  const transformedData: TransactionTableItem[] =
    transactionsData?.data?.map((transaction: TransactionListItem) => ({
      id: transaction.id,
      date: transaction.date,
      type: transaction.type,
      amount: parseFloat(transaction.amount),
      description: transaction.description,
      categoryName: transaction.category?.name,
      approvedAt: transaction.approvedAt,
      costCenterName: transaction.costCenter?.name,
      projectName: transaction.project?.name,
    })) || [];

  return (
    <div className="flex flex-col space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-3xl font-bold">Transactions</h1>
        <Link href="/dashboard/finances/transactions/new">
          <Button>
            <PlusCircle className="mr-2 h-4 w-4" />
            New Transaction
          </Button>
        </Link>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Transactions List</CardTitle>
          <CardDescription>
            View and manage all financial transactions
          </CardDescription>
          <div className="flex items-center space-x-2">
            <div className="flex-1">
              <Input
                placeholder="Search transactions..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && handleSearch()}
              />
            </div>
            <Select
              value={transactionType}
              onValueChange={(
                value: "income" | "expense" | "transfer" | "all"
              ) => {
                setTransactionType(value);
                handleSearch();
              }}
            >
              <SelectTrigger className="w-[180px]">
                <SelectValue placeholder="Type" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Types</SelectItem>
                <SelectItem value="income">Income</SelectItem>
                <SelectItem value="expense">Expense</SelectItem>
                <SelectItem value="transfer">Transfer</SelectItem>
              </SelectContent>
            </Select>
            <Button variant="outline" size="icon">
              <Filter className="h-4 w-4" />
            </Button>
            <Button variant="outline" size="sm">
              <Download className="mr-2 h-4 w-4" />
              Export
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          {error ? (
            <div className="flex justify-center py-8 text-red-500">
              Error loading transactions. Please try again.
            </div>
          ) : (
            <DataTable
              columns={columns}
              data={transformedData}
              isLoading={isLoading}
              isPaginationLoading={isFetching && !isLoading}
              isSortingLoading={isFetching && !isLoading}
              isFilteringLoading={isFetching && !isLoading}
              pageCount={transactionsData?.pageCount || 1}
              manualPagination={true}
              manualSorting={true}
              manualFiltering={true}
              onPaginationChange={setPagination}
              onSortingChange={setSorting}
              onFilterChange={handleFilterChange}
              filterableColumns={["categoryName", "description"]}
            />
          )}
        </CardContent>
      </Card>
    </div>
  );
}
