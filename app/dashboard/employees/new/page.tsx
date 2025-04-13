import Link from "next/link";
import {
  createEmployee,
  getDepartments,
  getPositions,
  type CreateEmployeeData,
} from "@/lib/actions/employees";
import { EmployeeForm } from "@/components/dashboard/employees/employee-form";
import { Button } from "@/components/ui/button";
import { ArrowLeft } from "lucide-react";

export default async function NewEmployeePage() {
  // Fetch data server-side
  const [departments, positions] = await Promise.all([
    getDepartments(),
    getPositions(),
  ]);

  async function handleCreateEmployee(data: any) {
    "use server";

    const employeeData: CreateEmployeeData = data as CreateEmployeeData;
    try {
      const result = await createEmployee(employeeData);

      if (result.success) {
        return {};
      } else {
        return { error: result.error || "Failed to create employee" };
      }
    } catch (error) {
      console.error("Error creating employee:", error);
      return { error: "An unexpected error occurred" };
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-2">
          <Button variant="outline" size="sm" asChild>
            <Link href="/dashboard/employees">
              <ArrowLeft className="mr-2 h-4 w-4" />
              Back to Employees
            </Link>
          </Button>
        </div>
      </div>

      <div>
        <h2 className="text-2xl font-bold tracking-tight">Add New Employee</h2>
        <p className="text-muted-foreground">
          Fill out the form below to create a new employee record with user
          account access.
        </p>
      </div>

      <EmployeeForm
        departments={departments}
        positions={positions}
        onSubmit={handleCreateEmployee}
        isEditing={false}
      />
    </div>
  );
}
