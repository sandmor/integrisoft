"use client";

import { ColumnDef } from "@tanstack/react-table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import Link from "next/link";
import { ArrowUpDown, Eye } from "lucide-react";

type AccountManagerInfo = {
  id: string | null;
  name: string | null;
};

export type ClientTableItem = {
  id: string;
  name: string;
  industry: string | null;
  website: string | null;
  accountManager: AccountManagerInfo | null;
  projectCount: number;
};

export const columns: ColumnDef<ClientTableItem>[] = [
  {
    accessorKey: "name",
    header: ({ column }) => {
      return (
        <Button
          variant="ghost"
          onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
        >
          Client Name
          <ArrowUpDown className="ml-2 h-4 w-4" />
        </Button>
      );
    },
  },
  {
    accessorKey: "industry",
    header: "Industry",
    cell: ({ row }) => {
      const industry = row.getValue("industry") as string | null;
      return <span>{industry || "N/A"}</span>;
    },
  },
  {
    accessorKey: "website",
    header: "Website",
    cell: ({ row }) => {
      const website = row.getValue("website") as string | null;
      return website ? (
        <a
          href={website.startsWith("http") ? website : `https://${website}`}
          target="_blank"
          rel="noopener noreferrer"
          className="text-blue-600 hover:underline"
        >
          {website}
        </a>
      ) : (
        <span className="text-muted-foreground">No website</span>
      );
    },
  },
  {
    accessorKey: "accountManager",
    header: "Account Manager",
    cell: ({ row }) => {
      const accountManager = row.getValue(
        "accountManager"
      ) as AccountManagerInfo | null;
      return <span>{accountManager?.name || "Unassigned"}</span>;
    },
  },
  {
    accessorKey: "projectCount",
    header: ({ column }) => {
      return (
        <Button
          variant="ghost"
          onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
        >
          Projects
          <ArrowUpDown className="ml-2 h-4 w-4" />
        </Button>
      );
    },
    cell: ({ row }) => {
      const count = row.getValue("projectCount") as number;
      return <Badge variant={count > 0 ? "default" : "outline"}>{count}</Badge>;
    },
  },
  {
    id: "actions",
    cell: ({ row }) => {
      const client = row.original;
      return (
        <Button asChild size="sm" variant="ghost">
          <Link href={`/dashboard/clients/${client.id}`}>
            <Eye className="mr-2 h-4 w-4" />
            View
          </Link>
        </Button>
      );
    },
  },
];
