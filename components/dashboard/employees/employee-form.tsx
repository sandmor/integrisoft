"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Employee } from "@/lib/actions/employees";

// Define validation schema for employee form
const employeeFormSchema = z.object({
  name: z.string().min(2, {
    message: "First name must be at least 2 characters.",
  }),
  lastName: z.string().min(2, {
    message: "Last name must be at least 2 characters.",
  }),
  email: z.string().email({
    message: "Please enter a valid email address.",
  }),
  department: z.string().optional(),
  position: z.string().optional(),
  hireDate: z.string().min(1, {
    message: "Hire date is required.",
  }),
  salary: z.string().optional(),
  contactEmail: z
    .string()
    .email({
      message: "Please enter a valid email address.",
    })
    .optional()
    .or(z.literal("")),
  contactPhone: z.string().optional(),
});

type EmployeeFormValues = z.infer<typeof employeeFormSchema>;

interface EmployeeFormProps {
  initialData?: Employee;
  onSubmit: (data: EmployeeFormValues) => Promise<void>;
  isSubmitting?: boolean;
}

export function EmployeeForm({
  initialData,
  onSubmit,
  isSubmitting = false,
}: EmployeeFormProps) {
  const router = useRouter();
  const [isSaving, setIsSaving] = useState(isSubmitting);

  // Set default values based on provided data or empty form
  const defaultValues: Partial<EmployeeFormValues> = initialData
    ? {
        name: initialData.name,
        lastName: initialData.lastName,
        email: initialData.email,
        department: initialData.department || undefined,
        position: initialData.position || undefined,
        hireDate: initialData.hireDate
          ? new Date(initialData.hireDate).toISOString().split("T")[0]
          : "",
        salary: initialData.salary?.toString() || "",
        contactEmail: initialData.contactEmail || "",
        contactPhone: initialData.contactPhone || "",
      }
    : {
        name: "",
        lastName: "",
        email: "",
        department: "",
        position: "",
        hireDate: new Date().toISOString().split("T")[0],
        salary: "",
        contactEmail: "",
        contactPhone: "",
      };

  const form = useForm<EmployeeFormValues>({
    resolver: zodResolver(employeeFormSchema),
    defaultValues,
  });

  async function handleSubmit(data: EmployeeFormValues) {
    try {
      setIsSaving(true);
      await onSubmit(data);
      router.refresh();
    } catch (error) {
      console.error("Error submitting form:", error);
    } finally {
      setIsSaving(false);
    }
  }

  return (
    <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-6">
      {/* Personal Details Card */}
      <Card>
        <CardHeader>
          <CardTitle>Personal Details</CardTitle>
          <CardDescription>
            Enter the employee's personal information.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-2">
              <label htmlFor="name" className="text-sm font-medium">
                First Name
              </label>
              <Input
                id="name"
                placeholder="First name"
                {...form.register("name")}
              />
              {form.formState.errors.name && (
                <p className="text-sm text-red-500">
                  {form.formState.errors.name.message}
                </p>
              )}
            </div>

            <div className="space-y-2">
              <label htmlFor="lastName" className="text-sm font-medium">
                Last Name
              </label>
              <Input
                id="lastName"
                placeholder="Last name"
                {...form.register("lastName")}
              />
              {form.formState.errors.lastName && (
                <p className="text-sm text-red-500">
                  {form.formState.errors.lastName.message}
                </p>
              )}
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-2">
              <label htmlFor="email" className="text-sm font-medium">
                Email Address
              </label>
              <Input
                id="email"
                type="email"
                placeholder="Email address"
                {...form.register("email")}
              />
              {form.formState.errors.email && (
                <p className="text-sm text-red-500">
                  {form.formState.errors.email.message}
                </p>
              )}
            </div>

            <div className="space-y-2">
              <label htmlFor="contactPhone" className="text-sm font-medium">
                Phone Number
              </label>
              <Input
                id="contactPhone"
                placeholder="Phone number"
                {...form.register("contactPhone")}
              />
              {form.formState.errors.contactPhone && (
                <p className="text-sm text-red-500">
                  {form.formState.errors.contactPhone.message}
                </p>
              )}
            </div>
          </div>

          <div className="space-y-2">
            <label htmlFor="contactEmail" className="text-sm font-medium">
              Contact Email (Optional)
            </label>
            <Input
              id="contactEmail"
              type="email"
              placeholder="Alternative contact email"
              {...form.register("contactEmail")}
            />
            {form.formState.errors.contactEmail && (
              <p className="text-sm text-red-500">
                {form.formState.errors.contactEmail.message}
              </p>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Employment Details Card */}
      <Card>
        <CardHeader>
          <CardTitle>Employment Details</CardTitle>
          <CardDescription>
            Enter the employee's work-related information.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-2">
              <label htmlFor="department" className="text-sm font-medium">
                Department
              </label>
              <Input
                id="department"
                placeholder="Department"
                {...form.register("department")}
              />
              {form.formState.errors.department && (
                <p className="text-sm text-red-500">
                  {form.formState.errors.department.message}
                </p>
              )}
            </div>

            <div className="space-y-2">
              <label htmlFor="position" className="text-sm font-medium">
                Position
              </label>
              <Input
                id="position"
                placeholder="Position"
                {...form.register("position")}
              />
              {form.formState.errors.position && (
                <p className="text-sm text-red-500">
                  {form.formState.errors.position.message}
                </p>
              )}
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-2">
              <label htmlFor="hireDate" className="text-sm font-medium">
                Hire Date
              </label>
              <Input id="hireDate" type="date" {...form.register("hireDate")} />
              {form.formState.errors.hireDate && (
                <p className="text-sm text-red-500">
                  {form.formState.errors.hireDate.message}
                </p>
              )}
            </div>

            <div className="space-y-2">
              <label htmlFor="salary" className="text-sm font-medium">
                Salary
              </label>
              <Input
                id="salary"
                type="number"
                step="0.01"
                min="0"
                placeholder="Annual salary"
                {...form.register("salary")}
              />
              {form.formState.errors.salary && (
                <p className="text-sm text-red-500">
                  {form.formState.errors.salary.message}
                </p>
              )}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Form Actions */}
      <div className="flex justify-end gap-4">
        <Button type="button" variant="outline" onClick={() => router.back()}>
          Cancel
        </Button>
        <Button type="submit" disabled={isSaving}>
          {isSaving ? "Saving..." : "Save Employee"}
        </Button>
      </div>
    </form>
  );
}
