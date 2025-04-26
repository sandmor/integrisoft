"use client";

import { ColumnDef } from "@tanstack/react-table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Trash2 } from "lucide-react";
import { ProductVersion } from "@/lib/types/productVersions";
import { useDeleteVersionMutation } from "@/lib/redux/productVersionsApi";
import { toast } from "sonner";

const DeleteButton = ({ versionId }: { versionId: string }) => {
  const [deleteVersion, { isLoading }] = useDeleteVersionMutation();

  const handleDelete = async () => {
    if (confirm("Are you sure you want to delete this version?")) {
      try {
        await deleteVersion(versionId).unwrap();
        toast.success("Version deleted");
      } catch (e) {
        toast.error("Failed to delete version");
      }
    }
  };

  return (
    <Button
      variant="ghost"
      size="sm"
      onClick={handleDelete}
      disabled={isLoading}
    >
      <Trash2 className="h-4 w-4 text-destructive" />
    </Button>
  );
};

export const versionColumns: ColumnDef<ProductVersion>[] = [
  {
    accessorKey: "versionNumber",
    header: "Version",
  },
  {
    accessorKey: "status",
    header: "Status",
    cell: ({ row }) => {
      const status = row.getValue("status") as ProductVersion["status"];
      const variantMap: Record<
        ProductVersion["status"],
        "default" | "secondary" | "outline" | "destructive"
      > = {
        development: "secondary",
        qa: "outline",
        production: "default",
        deprecated: "destructive",
      };
      return <Badge variant={variantMap[status]}>{status}</Badge>;
    },
  },
  {
    accessorKey: "releaseDate",
    header: "Release Date",
    cell: ({ row }) => {
      const date = row.getValue("releaseDate") as string | null;
      return date ? new Date(date).toLocaleDateString() : "—";
    },
  },
  {
    accessorKey: "releaseNotes",
    header: "Notes",
    cell: ({ row }) => {
      const notes = row.getValue("releaseNotes") as string | null;
      return <span className="line-clamp-2 text-xs">{notes || "—"}</span>;
    },
  },
  {
    id: "actions",
    header: "",
    cell: ({ row }) => <DeleteButton versionId={row.original.id} />,
  },
];
