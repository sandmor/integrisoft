import { Suspense } from "react";
import Link from "next/link";
import { DataTable } from "@/components/ui/data-table";
import { Button } from "@/components/ui/button";
import { Plus } from "lucide-react";
import { columns } from "./columns";
import { tryCatch } from "@/lib/error-handler";
import { Spinner } from "@/components/ui/spinner";
import { getClients } from "@/lib/actions/clients";

async function ClientsTable() {
  const clients =
    (await tryCatch(() => getClients(), {
      customErrorMessage: "Failed to load clients data",
    })) || [];

  return (
    <DataTable
      columns={columns}
      data={clients}
      searchColumn="name"
      searchPlaceholder="Search clients..."
    />
  );
}

function ClientsTableFallback() {
  return (
    <div className="w-full flex justify-center items-center py-12">
      <Spinner size="large" />
      <span className="ml-3 text-lg">Loading clients...</span>
    </div>
  );
}

export default function ClientsPage() {
  return (
    <>
      <div className="flex justify-between items-center border-b px-6 py-4">
        <div>
          <h2 className="text-xl font-semibold">Clients</h2>
          <p className="text-sm text-muted-foreground">
            Manage your client relationships
          </p>
        </div>
        <Button asChild>
          <Link href="/dashboard/clients/new">
            <Plus className="mr-2 h-4 w-4" />
            Add Client
          </Link>
        </Button>
      </div>
      <div className="p-6">
        <Suspense fallback={<ClientsTableFallback />}>
          <ClientsTable />
        </Suspense>
      </div>
    </>
  );
}
