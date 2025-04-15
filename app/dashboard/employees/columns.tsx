"use client";

import { ColumnDef } from "@tanstack/react-table";
import { Button } from "@/components/ui/button";
import { Employee } from "@/lib/actions/employees";
import { formatDate } from "@/lib/utils";
import { FileEdit, Trash2, Eye } from "lucide-react";
import Link from "next/link";

export const columns: ColumnDef<Employee>[] = [
  {
    accessorKey: "name",
    header: "First Name",
  },
  {
    accessorKey: "lastName",
    header: "Last Name",
  },
  {
    accessorKey: "email",
    header: "Email",
  },
  {
    accessorKey: "department",
    header: "Department",
    cell: ({ row }) => row.getValue("department") || "—",
  },
  {
    accessorKey: "position",
    header: "Position",
    cell: ({ row }) => row.getValue("position") || "—",
  },
  {
    accessorKey: "hireDate",
    header: "Hire Date",
    cell: ({ row }) => {
      const date = row.getValue("hireDate") as Date;
      return formatDate(date);
    },
  },
  {
    id: "actions",
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
          <Button variant="ghost" size="icon" title="Delete">
            <Trash2 className="h-4 w-4" />
          </Button>
        </div>
      );
    },
  },
];
