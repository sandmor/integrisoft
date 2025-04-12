import { Suspense } from "react";
import Link from "next/link";
import { getEmployees } from "@/lib/actions/employees";
import { DataTable } from "@/components/ui/data-table";
import { Button } from "@/components/ui/button";
import { Plus } from "lucide-react";
import { columns } from "./columns";
import { tryCatch } from "@/lib/error-handler";
import { Spinner } from "@/components/ui/spinner";

async function EmployeesTable() {
  const employees =
    (await tryCatch(() => getEmployees(), {
      customErrorMessage: "Failed to load employees data",
    })) || [];

  return (
    <DataTable
      columns={columns}
      data={employees}
      searchColumn="name"
      searchPlaceholder="Search employees..."
    />
  );
}

function EmployeesTableFallback() {
  return (
    <div className="w-full flex justify-center items-center py-12">
      <Spinner size="large" />
      <span className="ml-3 text-lg">Loading employees...</span>
    </div>
  );
}

export default function EmployeesPage() {
  return (
    <>
      <div className="flex justify-between items-center border-b px-6 py-4">
        <div>
          <h2 className="text-xl font-semibold">Employees</h2>
          <p className="text-sm text-muted-foreground">
            Manage your company's employees
          </p>
        </div>
        <Button asChild>
          <Link href="/dashboard/employees/new">
            <Plus className="mr-2 h-4 w-4" />
            Add Employee
          </Link>
        </Button>
      </div>
      <div className="p-6">
        <Suspense fallback={<EmployeesTableFallback />}>
          <EmployeesTable />
        </Suspense>
      </div>
    </>
  );
}
