import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import {
  getEmployee,
  NewEmployeeData,
  updateEmployee,
  getDepartments,
  getPositions,
  Department,
  Position,
} from "@/lib/actions/employees";
import { EmployeeForm } from "../../../../../components/dashboard/employees/employee-form";
import { Button } from "@/components/ui/button";
import { ArrowLeft } from "lucide-react";

interface EditEmployeePageProps {
  params: {
    id: string;
  };
}

export default async function EditEmployeePage({
  params,
}: EditEmployeePageProps) {
  const { id } = await params;
  const [employee, departments, positions] = await Promise.all([
    getEmployee(id),
    getDepartments(),
    getPositions(),
  ]);

  if (!employee) {
    notFound();
  }

  async function handleUpdateEmployee(data: NewEmployeeData) {
    "use server";
    try {
      const result = await updateEmployee({
        ...data,
        id: employee!.id,
      });

      if (result.success) {
        return {};
      } else {
        return { error: result.error || "Failed to update employee" };
      }
    } catch (error) {
      console.error("Error updating employee:", error);
      return { error: "An unexpected error occurred" };
    }
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
          Edit Employee: {employee.name} {employee.lastName}
        </h2>
        <p className="text-muted-foreground">
          Update the employee's information using the form below.
        </p>
      </div>

      <EmployeeForm
        initialData={employee}
        departments={departments}
        positions={positions}
        onSubmit={handleUpdateEmployee}
        isEditing={true}
      />
    </div>
  );
}
