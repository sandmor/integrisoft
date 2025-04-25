"use client";

import { ColumnDef } from "@tanstack/react-table";
import { TransactionListItem } from "@/lib/types";
import { format } from "date-fns";
import Link from "next/link";
import { Button } from "@/components/ui/button";

export const columns: ColumnDef<TransactionListItem>[] = [
  {
    accessorKey: "date",
    header: "Date",
    enableSorting: true,
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
    accessorKey: "category.name",
    header: "Category",
    cell: ({ row }) => {
      return <div>{row.original.category?.name || "Uncategorized"}</div>;
    },
  },
  {
    accessorKey: "amount",
    header: "Amount",
    cell: ({ row }) => {
      const amount = parseFloat(row.original.amount);
      const type = row.original.type;

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
      const description = row.original.description;
      return <div className="truncate max-w-[200px]">{description || "-"}</div>;
    },
  },
  {
    accessorKey: "approvedAt",
    header: "Status",
    cell: ({ row }) => {
      const approvedAt = row.original.approvedAt;
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
    id: "actions",
    header: "Actions",
    cell: ({ row }) => {
      const id = row.original.id;
      return (
        <div className="flex items-center gap-2">
          <Button asChild variant="outline" size="sm">
            <Link href={`/dashboard/finances/transactions/${id}`}>View</Link>
          </Button>
        </div>
      );
    },
  },
];
