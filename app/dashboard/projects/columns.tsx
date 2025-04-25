"use client";

import { ColumnDef } from "@tanstack/react-table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import Link from "next/link";
import { Eye } from "lucide-react";
import { formatDate } from "@/lib/utils";
import { Project } from "@/lib/types";

type BadgeVariant =
  | "default"
  | "secondary"
  | "destructive"
  | "outline"
  | "success"
  | "warning"
  | "info";

// Project status map for badge variants
const statusVariantMap: Record<string, BadgeVariant> = {
  planning: "secondary",
  active: "success",
  on_hold: "warning",
  completed: "default",
  cancelled: "destructive",
};

export const columns: ColumnDef<Project>[] = [
  {
    accessorKey: "name",
    header: "Project Name",
    enableSorting: true,
  },
  {
    accessorKey: "status",
    header: "Status",
    enableSorting: true,
    cell: ({ row }) => {
      const status = row.getValue("status") as string;
      return (
        <Badge variant={statusVariantMap[status] || "default"}>
          {status.replace("_", " ").replace(/\b\w/g, (l) => l.toUpperCase())}
        </Badge>
      );
    },
  },
  {
    accessorKey: "client",
    header: "Client",
    enableSorting: false,
    cell: ({ row }) => {
      const client: Project["client"] = row.getValue("client");
      return <span>{client?.name || "Internal Project"}</span>;
    },
  },
  {
    accessorKey: "manager",
    header: "Project Manager",
    enableSorting: false,
    cell: ({ row }) => {
      const manager: Project["manager"] = row.getValue("manager");
      return <span>{manager?.name || "Unassigned"}</span>;
    },
  },
  {
    accessorKey: "startDate",
    header: "Start Date",
    enableSorting: true,
    cell: ({ row }) => {
      const date = row.getValue("startDate") as string | null;
      return <span>{date ? formatDate(date) : "Not scheduled"}</span>;
    },
  },
  {
    accessorKey: "targetEndDate",
    header: "Target End Date",
    enableSorting: true,
    cell: ({ row }) => {
      const date = row.getValue("targetEndDate") as string | null;
      return <span>{date ? formatDate(date) : "Not set"}</span>;
    },
  },
  {
    accessorKey: "budget",
    header: "Budget",
    enableSorting: true,
    cell: ({ row }) => {
      const budget = row.getValue("budget") as number | null;
      return <span>{budget ? `$${budget.toLocaleString()}` : "Not set"}</span>;
    },
  },
  {
    accessorKey: "progress",
    header: "Progress",
    enableSorting: false,
    cell: ({ row }) => {
      const progress = row.getValue("progress") as number;
      return (
        <div className="w-full bg-gray-200 rounded-full h-2.5">
          <div
            className="bg-primary h-2.5 rounded-full"
            style={{ width: `${progress}%` }}
          ></div>
        </div>
      );
    },
  },
  {
    id: "actions",
    header: "Actions",
    enableSorting: false,
    cell: ({ row }) => {
      const project = row.original;
      return (
        <Button asChild size="sm" variant="ghost">
          <Link href={`/dashboard/projects/${project.id}`}>
            <Eye className="mr-2 h-4 w-4" />
            View
          </Link>
        </Button>
      );
    },
  },
];
