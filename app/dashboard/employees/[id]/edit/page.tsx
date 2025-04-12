"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { notFound } from "next/navigation";
import {
  getEmployee,
  updateEmployee,
  type UpdateEmployeeData,
} from "@/lib/actions/employees";
import { EmployeeForm } from "../../../../../components/dashboard/employees/employee-form";
import { Button } from "@/components/ui/button";
import { ArrowLeft } from "lucide-react";
import { toast } from "sonner";

interface EditEmployeePageProps {
  params: {
    id: string;
  };
}

export default async function EditEmployeePage({
  params,
}: EditEmployeePageProps) {
  const router = useRouter();
  const employee = await getEmployee(params.id);

  if (!employee) {
    notFound();
  }

  async function handleUpdateEmployee(data: UpdateEmployeeData) {
    try {
      const result = await updateEmployee({
        ...data,
        id: employee!.id,
      });

      if (result.success) {
        toast.success("Employee updated successfully");
        router.push(`/dashboard/employees/${employee!.id}`);
      } else {
        toast.error(result.error || "Failed to update employee");
      }
    } catch (error) {
      toast.error("An unexpected error occurred");
      console.error("Error updating employee:", error);
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
        onSubmit={(data) => handleUpdateEmployee({ ...data, id: employee.id })}
      />
    </div>
  );
}
