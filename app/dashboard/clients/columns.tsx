"use client";

import { ColumnDef } from "@tanstack/react-table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import Link from "next/link";
import { Eye } from "lucide-react";
import { Client } from "@/lib/types/clients";

export const columns: ColumnDef<Client>[] = [
  {
    accessorKey: "name",
    header: "Client Name",
    enableSorting: true,
  },
  {
    accessorKey: "industry",
    header: "Industry",
    enableSorting: true,
    cell: ({ row }) => {
      const industry = row.getValue("industry") as string | null;
      return <span>{industry || "N/A"}</span>;
    },
  },
  {
    accessorKey: "website",
    header: "Website",
    enableSorting: false,
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
    enableSorting: false,
    cell: ({ row }) => {
      const accountManager: Client["accountManager"] =
        row.getValue("accountManager");
      return <span>{accountManager?.name || "Unassigned"}</span>;
    },
  },
  {
    accessorKey: "projectCount",
    header: "Projects",
    enableSorting: true,
    cell: ({ row }) => {
      const count = row.getValue("projectCount") as number;
      return <Badge variant={count > 0 ? "default" : "outline"}>{count}</Badge>;
    },
  },
  {
    id: "actions",
    header: "Actions",
    enableSorting: false,
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
