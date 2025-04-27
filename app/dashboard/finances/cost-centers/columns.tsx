"use client";

import { ColumnDef } from "@tanstack/react-table";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Eye, Edit } from "lucide-react";
import { CostCenterListItem } from "@/lib/types/finances";

export const columns: ColumnDef<CostCenterListItem>[] = [
  {
    accessorKey: "name",
    header: "Name",
    cell: ({ row }) => {
      const id = row.original.id;
      return (
        <Link
          href={`/dashboard/finances/cost-centers/${id}`}
          className="font-medium text-blue-600 hover:text-blue-800"
        >
          {row.getValue("name")}
        </Link>
      );
    },
  },
  {
    accessorKey: "budget",
    header: "Budget",
    cell: ({ row }) => {
      const raw = row.original.budget;
      const amount = raw ? parseFloat(raw) : 0;
      const formatted = new Intl.NumberFormat("en-US", {
        style: "currency",
        currency: "USD",
      }).format(amount);
      return <span className="font-medium">{formatted}</span>;
    },
  },
  {
    id: "actions",
    header: "Actions",
    cell: ({ row }) => {
      const id = row.original.id;
      return (
        <div className="flex space-x-2">
          <Button asChild size="sm" variant="ghost">
            <Link href={`/dashboard/finances/cost-centers/${id}`}>
              <Eye className="mr-1 h-4 w-4" /> View
            </Link>
          </Button>
          <Button asChild size="sm" variant="ghost">
            <Link href={`/dashboard/finances/cost-centers/${id}/edit`}>
              <Edit className="mr-1 h-4 w-4" /> Edit
            </Link>
          </Button>
        </div>
      );
    },
  },
];
