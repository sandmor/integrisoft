"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { createEmployee, type NewEmployeeData } from "@/lib/actions/employees";
import { EmployeeForm } from "../../../../components/dashboard/employees/employee-form";
import { Button } from "@/components/ui/button";
import { ArrowLeft } from "lucide-react";
import { toast } from "sonner";

export default function NewEmployeePage() {
  const router = useRouter();

  async function handleCreateEmployee(data: NewEmployeeData) {
    try {
      const result = await createEmployee(data);

      if (result.success) {
        toast.success("Employee created successfully");
        router.push("/dashboard/employees");
      } else {
        toast.error(result.error || "Failed to create employee");
      }
    } catch (error) {
      toast.error("An unexpected error occurred");
      console.error("Error creating employee:", error);
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
          Fill out the form below to create a new employee record.
        </p>
      </div>

      <EmployeeForm onSubmit={handleCreateEmployee} />
    </div>
  );
}
