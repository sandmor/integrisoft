import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import {
  getEmployeeById,
  getDepartments,
  getPositions,
  getRoles,
} from "@/lib/actions/employees";
import { EmployeeForm } from "../../../../../components/dashboard/employees/employee-form";
import { Button } from "@/components/ui/button";
import { ArrowLeft } from "lucide-react";

export default async function EditEmployeePage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const [employee, departments, positions, roles] = await Promise.all([
    getEmployeeById(id),
    getDepartments(),
    getPositions(),
    getRoles(),
  ]);

  if (!employee) {
    notFound();
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-2">
          <Button variant="outline" size="sm" asChild>
            <Link href={`/dashboard/employees/${employee.id}`}>
              <ArrowLeft className="mr-2 h-4 w-4" />
              Back to Employee
            </Link>
          </Button>
        </div>
      </div>

      <div>
        <h2 className="text-2xl font-bold tracking-tight">
          Edit Employee: {employee.firstName} {employee.lastName}
        </h2>
        <p className="text-muted-foreground">
          Update the employee's information using the form below.
        </p>
      </div>

      <EmployeeForm
        initialData={employee}
        departments={departments}
        positions={positions}
        roles={roles}
        isEditing={true}
      />
    </div>
  );
}
