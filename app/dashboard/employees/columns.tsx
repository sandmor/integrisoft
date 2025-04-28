"use client";

import { ColumnDef } from "@tanstack/react-table";
import { Button } from "@/components/ui/button";
import { formatDate } from "@/lib/utils";
import { FileEdit, Trash2, Eye } from "lucide-react";
import Link from "next/link";
import { Employee } from "@/lib/types/employees";

export const columns: ColumnDef<Employee>[] = [
  {
    accessorKey: "firstName",
    header: "First Name",
    enableSorting: true,
  },
  {
    accessorKey: "lastName",
    header: "Last Name",
    enableSorting: true,
  },
  {
    accessorKey: "email",
    header: "Email",
    enableSorting: true,
  },
  {
    accessorKey: "department",
    header: "Department",
    enableSorting: true,
    cell: ({ row }) => row.getValue("department") || "—",
  },
  {
    accessorKey: "position",
    header: "Position",
    enableSorting: true,
    cell: ({ row }) => row.getValue("position") || "—",
  },
  {
    accessorKey: "hireDate",
    header: "Hire Date",
    enableSorting: true,
    cell: ({ row }) => {
      const date = row.getValue("hireDate") as Date;
      return formatDate(date);
    },
  },
  {
    id: "actions",
    header: "Actions",
    enableSorting: false,
    cell: ({ row }) => {
      const employee = row.original;

      return (
        <div className="flex items-center gap-2">
          <Link href={`/dashboard/employees/${employee.id}`}>
            <Button variant="ghost" size="icon" title="View">
              <Eye className="h-4 w-4" />
            </Button>
          </Link>
          <Link href={`/dashboard/employees/${employee.id}/edit`}>
            <Button variant="ghost" size="icon" title="Edit">
              <FileEdit className="h-4 w-4" />
            </Button>
          </Link>
        </div>
      );
    },
  },
];
