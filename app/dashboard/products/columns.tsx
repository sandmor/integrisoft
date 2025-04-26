"use client";

import { ColumnDef } from "@tanstack/react-table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import Link from "next/link";
import { Eye } from "lucide-react";
import { Product } from "@/lib/types/products";

export const columns: ColumnDef<Product>[] = [
  {
    accessorKey: "name",
    header: "Product",
    enableSorting: true,
  },
  {
    accessorKey: "productManager",
    header: "Manager",
    enableSorting: false,
    cell: ({ row }) => {
      const mgr = row.getValue("productManager") as
        | { name: string }
        | undefined;
      return <span>{mgr?.name || "—"}</span>;
    },
  },
  {
    accessorKey: "techLead",
    header: "Tech Lead",
    cell: ({ row }) => {
      const tl = row.getValue("techLead") as { name: string } | undefined;
      return <span>{tl?.name || "—"}</span>;
    },
  },
  {
    accessorKey: "versionCount",
    header: "Versions",
    cell: ({ row }) => {
      const count = row.getValue("versionCount") as number;
      return <Badge variant={count > 0 ? "default" : "outline"}>{count}</Badge>;
    },
  },
  {
    id: "actions",
    header: "",
    cell: ({ row }) => {
      const prod = row.original;
      return (
        <Button asChild size="sm" variant="ghost">
          <Link href={`/dashboard/products/${prod.id}`}>
            <Eye className="mr-2 h-4 w-4" />
            View
          </Link>
        </Button>
      );
    },
  },
];
