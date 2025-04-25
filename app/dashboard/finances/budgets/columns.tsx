"use client";

import { ColumnDef } from "@tanstack/react-table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import Link from "next/link";
import { Eye, Edit, Trash } from "lucide-react";
import { BudgetListItem } from "@/lib/types";

export const columns: ColumnDef<BudgetListItem>[] = [
  {
    accessorKey: "name",
    header: "Budget Name",
    enableSorting: true,
    cell: ({ row }) => {
      const id = row.original.id;
      return (
        <Link
          href={`/dashboard/finances/budgets/${id}`}
          className="font-medium text-blue-600 hover:text-blue-800"
        >
          {row.getValue("name")}
        </Link>
      );
    },
  },
  {
    accessorKey: "period",
    header: "Period",
    cell: ({ row }) => {
      const startDate = new Date(row.original.startDate);
      const endDate = new Date(row.original.endDate);
      const startYear = startDate.getFullYear();
      const endYear = endDate.getFullYear();

      if (startYear === endYear) {
        return <span>{startYear}</span>;
      }

      return (
        <span>
          {startYear} - {endYear}
        </span>
      );
    },
  },
  {
    accessorKey: "costCenter",
    header: "Cost Center",
    cell: ({ row }) => {
      return <span>{row.original.costCenter?.name || "N/A"}</span>;
    },
  },
  {
    accessorKey: "amount",
    header: "Allocated",
    cell: ({ row }) => {
      const amount = parseFloat(row.original.amount);
      // Format the amount as currency
      const formatted = new Intl.NumberFormat("en-US", {
        style: "currency",
        currency: "USD",
      }).format(amount);

      return <div className="font-medium">{formatted}</div>;
    },
  },
  {
    accessorKey: "spentAmount",
    header: "Spent",
    cell: ({ row }) => {
      const amount = parseFloat(row.original.spentAmount);
      // Format the amount as currency
      const formatted = new Intl.NumberFormat("en-US", {
        style: "currency",
        currency: "USD",
      }).format(amount);

      return <div className="font-medium">{formatted}</div>;
    },
  },
  {
    accessorKey: "status",
    header: "Status",
    cell: ({ row }) => {
      const utilizationPercentage = row.original.utilizationPercentage;
      const amount = parseFloat(row.original.amount);
      const spent = parseFloat(row.original.spentAmount);

      let status = "active";
      if (utilizationPercentage >= 100) {
        status = "completed";
      } else if (utilizationPercentage >= 90) {
        status = "danger";
      } else if (utilizationPercentage >= 70) {
        status = "warning";
      }

      return (
        <div className="flex flex-col space-y-1">
          <Badge
            className={`
            ${
              status === "active"
                ? "bg-green-100 text-green-800 hover:bg-green-200"
                : ""
            }
            ${
              status === "warning"
                ? "bg-yellow-100 text-yellow-800 hover:bg-yellow-200"
                : ""
            }
            ${
              status === "danger"
                ? "bg-red-100 text-red-800 hover:bg-red-200"
                : ""
            }
            ${
              status === "completed"
                ? "bg-blue-100 text-blue-800 hover:bg-blue-200"
                : ""
            }
            `}
          >
            {status === "active"
              ? "Active"
              : status === "warning"
              ? "Warning"
              : status === "danger"
              ? "Over Budget"
              : "Completed"}
          </Badge>
          <div className="w-full bg-gray-200 rounded-full h-2">
            <div
              className={`h-2 rounded-full ${
                utilizationPercentage < 70
                  ? "bg-green-500"
                  : utilizationPercentage < 90
                  ? "bg-yellow-500"
                  : "bg-red-500"
              }`}
              style={{ width: `${Math.min(utilizationPercentage, 100)}%` }}
            ></div>
          </div>
          <span className="text-xs text-gray-500">
            {utilizationPercentage.toFixed(1)}% used
          </span>
        </div>
      );
    },
  },
  {
    id: "actions",
    header: "Actions",
    cell: ({ row }) => {
      const budget = row.original;

      return (
        <div className="flex space-x-2">
          <Button asChild size="sm" variant="ghost">
            <Link href={`/dashboard/finances/budgets/${budget.id}`}>
              <Eye className="mr-1 h-4 w-4" />
              View
            </Link>
          </Button>
          <Button asChild size="sm" variant="ghost">
            <Link href={`/dashboard/finances/budgets/${budget.id}/edit`}>
              <Edit className="mr-1 h-4 w-4" />
              Edit
            </Link>
          </Button>
        </div>
      );
    },
  },
];
