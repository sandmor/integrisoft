"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Calendar } from "@/components/ui/calendar";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { format } from "date-fns";
import { CalendarIcon } from "lucide-react";
import { cn } from "@/lib/utils";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Employee,
  CreateEmployeeData,
  NewEmployeeData,
  Department,
  Position,
} from "@/lib/actions/employees";
import { toast } from "sonner";
import {
  Select,
  SelectTrigger,
  SelectValue,
  SelectContent,
  SelectItem,
} from "@/components/ui/select";
import { Combobox, ComboboxOption } from "@/components/ui/combobox";

// Base validation schema for employee form (without password validation)
const baseEmployeeSchema = z.object({
  name: z.string().min(2, {
    message: "First name must be at least 2 characters.",
  }),
  lastName: z.string().min(2, {
    message: "Last name must be at least 2 characters.",
  }),
  email: z.string().email({
    message: "Please enter a valid email address.",
  }),
  departmentId: z.string().optional(),
  positionId: z.string().optional(),
  hireDate: z.date({
    required_error: "Hire date is required.",
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
  role: z.enum(["admin", "manager", "employee"]),
  password: z.string().optional(),
  confirmPassword: z.string().optional(),
});

// Schema for editing - optional password with validation
const editEmployeeSchema = baseEmployeeSchema.refine(
  (data) => {
    // If one password field is filled, both must be filled and must match
    if (data.password || data.confirmPassword) {
      if (!data.password || !data.confirmPassword) {
        return false;
      }
      if (data.password !== data.confirmPassword) {
        return false;
      }
      if (data.password.length < 8) {
        return false;
      }
    }
    return true;
  },
  {
    message: "Passwords don't match or don't meet requirements",
    path: ["confirmPassword"],
  }
);

// Schema for new employees - required password
const newEmployeeSchema = z
  .object({
    name: z.string().min(2, {
      message: "First name must be at least 2 characters.",
    }),
    lastName: z.string().min(2, {
      message: "Last name must be at least 2 characters.",
    }),
    email: z.string().email({
      message: "Please enter a valid email address.",
    }),
    departmentId: z.string().optional(),
    positionId: z.string().optional(),
    hireDate: z.date({
      required_error: "Hire date is required.",
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
    role: z.enum(["admin", "manager", "employee"]),
    password: z.string().min(8, {
      message: "Password must be at least 8 characters.",
    }),
    confirmPassword: z.string(),
  })
  .refine((data) => data.password === data.confirmPassword, {
    message: "Passwords don't match",
    path: ["confirmPassword"],
  });

// Create our own type based on the schema
type EmployeeFormValues = z.infer<typeof baseEmployeeSchema>;
type NewEmployeeFormValues = z.infer<typeof newEmployeeSchema>;

interface UnifiedEmployeeFormProps {
  initialData?: Employee;
  departments: Department[];
  positions: Position[];
  onSubmit: (
    data: CreateEmployeeData | NewEmployeeData
  ) => Promise<{ error?: string } | void>;
  isSubmitting?: boolean;
  isEditing?: boolean;
}

// Helper to convert departments to combobox options
function departmentsToOptions(departments: Department[]): ComboboxOption[] {
  return departments.map((dep) => ({
    value: dep.id,
    label: dep.name,
  }));
}

// Helper to convert positions to combobox options
function positionsToOptions(positions: Position[]): ComboboxOption[] {
  return positions.map((pos) => ({
    value: pos.id,
    label: pos.title,
  }));
}

// Filter positions by department
function getPositionsForDepartment(
  positions: Position[],
  departmentId?: string
): Position[] {
  if (!departmentId) return positions;
  return positions.filter((position) => position.departmentId === departmentId);
}

export function EmployeeForm({
  initialData,
  departments,
  positions,
  onSubmit,
  isSubmitting = false,
  isEditing = false,
}: UnifiedEmployeeFormProps) {
  const router = useRouter();
  const [isSaving, setIsSaving] = useState(isSubmitting);
  const [departmentOptions, setDepartmentOptions] = useState<ComboboxOption[]>(
    []
  );
  const [positionOptions, setPositionOptions] = useState<ComboboxOption[]>([]);
  const [selectedDepartmentId, setSelectedDepartmentId] = useState<
    string | undefined
  >(undefined);
  const [initialDepartmentId, setInitialDepartmentId] = useState<
    string | undefined
  >(undefined);
  const [initialPositionId, setInitialPositionId] = useState<
    string | undefined
  >(undefined);
  const [filteredPositions, setFilteredPositions] =
    useState<Position[]>(positions);
  const [isInitialized, setIsInitialized] = useState(false);

  // Map department name to ID for initial data
  useEffect(() => {
    setDepartmentOptions(departmentsToOptions(departments));

    // Find department ID for initial department name
    let departmentId: string | undefined;
    if (initialData?.department) {
      const foundDepartment = departments.find(
        (d) => d.name === initialData.department
      );
      departmentId = foundDepartment?.id;

      if (departmentId) {
        setSelectedDepartmentId(departmentId);
        setInitialDepartmentId(departmentId);
      }
    }

    // Find position ID for initial position title
    let positionId: string | undefined;
    if (initialData?.position) {
      const foundPosition = positions.find(
        (p) => p.title === initialData.position
      );
      positionId = foundPosition?.id;
      setInitialPositionId(positionId);
    }

    // Filter positions by department if a department is selected
    if (departmentId) {
      const departmentPositions = getPositionsForDepartment(
        positions,
        departmentId
      );
      setFilteredPositions(departmentPositions);
      setPositionOptions(positionsToOptions(departmentPositions));
    } else {
      setFilteredPositions(positions);
      setPositionOptions(positionsToOptions(positions));
    }

    setIsInitialized(true);
  }, [departments, positions, initialData]);

  // Set default values based on provided data or empty form
  const defaultValues: Partial<EmployeeFormValues> = {
    name: initialData?.name || "",
    lastName: initialData?.lastName || "",
    email: initialData?.email || "",
    departmentId: initialDepartmentId || "",
    positionId: initialPositionId || "",
    hireDate: initialData?.hireDate
      ? new Date(initialData.hireDate)
      : new Date(),
    salary: initialData?.salary?.toString() || "",
    contactEmail: initialData?.contactEmail || "",
    contactPhone: initialData?.contactPhone || "",
    role: "employee",
    password: "",
    confirmPassword: "",
  };

  // Use the appropriate schema based on whether we're creating or editing
  const schema = isEditing ? editEmployeeSchema : newEmployeeSchema;

  const form = useForm<EmployeeFormValues | NewEmployeeFormValues>({
    resolver: zodResolver(schema),
    defaultValues,
    mode: "onBlur",
  });

  // Set form values after initialization
  useEffect(() => {
    if (isInitialized) {
      if (initialDepartmentId) {
        form.setValue("departmentId", initialDepartmentId);
      }

      if (initialPositionId) {
        form.setValue("positionId", initialPositionId);
      }

      // For existing employees, set the role if available
      if (isEditing && initialData) {
        const existingRole =
          initialData.role === "admin" ||
          initialData.role === "manager" ||
          initialData.role === "employee"
            ? initialData.role
            : "employee";
        form.setValue("role", existingRole);
      }
    }
  }, [
    isInitialized,
    initialDepartmentId,
    initialPositionId,
    form,
    isEditing,
    initialData,
  ]);

  // Update position options when department changes
  const handleDepartmentChange = (departmentId: string) => {
    setSelectedDepartmentId(departmentId);
    const departmentPositions = getPositionsForDepartment(
      positions,
      departmentId
    );
    setFilteredPositions(departmentPositions);
    setPositionOptions(positionsToOptions(departmentPositions));
    form.setValue("positionId", ""); // Reset position when department changes
  };

  async function handleSubmit(
    data: EmployeeFormValues | NewEmployeeFormValues
  ) {
    try {
      setIsSaving(true);

      // Find department and position names from IDs
      const selectedDepartment = departments.find(
        (d) => d.id === data.departmentId
      );
      const selectedPosition = positions.find((p) => p.id === data.positionId);

      // Convert form data to expected format
      const employeeData: CreateEmployeeData = {
        name: data.name,
        lastName: data.lastName,
        email: data.email,
        department: selectedDepartment?.name,
        position: selectedPosition?.title,
        hireDate: data.hireDate,
        salary: data.salary,
        contactEmail: data.contactEmail || undefined,
        contactPhone: data.contactPhone || undefined,
        password: data.password || "", // Empty string will be handled by server
        role: data.role,
      };

      const result = await onSubmit(employeeData);

      // Check if there's an error returned from the server action
      if (result && "error" in result) {
        toast.error(result.error);
        return;
      }

      toast.success(
        isEditing
          ? "Employee updated successfully!"
          : "Employee created successfully!"
      );
      router.push("/dashboard/employees");
    } catch (error) {
      console.error("Error submitting form:", error);
      toast.error(
        `An error occurred while ${
          isEditing ? "updating" : "creating"
        } the employee data. Please try again.`
      );
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
              <label htmlFor="departmentId" className="text-sm font-medium">
                Department
              </label>
              <Combobox
                options={departmentOptions}
                value={form.watch("departmentId") || ""}
                onValueChange={(value) => {
                  form.setValue("departmentId", value);
                  handleDepartmentChange(value);
                }}
                placeholder="Select Department"
                emptyMessage="No departments found."
              />
              {form.formState.errors.departmentId && (
                <p className="text-sm text-red-500">
                  {form.formState.errors.departmentId.message}
                </p>
              )}
            </div>

            <div className="space-y-2">
              <label htmlFor="positionId" className="text-sm font-medium">
                Position
              </label>
              <Combobox
                options={positionOptions}
                value={form.watch("positionId") || ""}
                onValueChange={(value) => {
                  form.setValue("positionId", value);
                }}
                placeholder="Select Position"
                emptyMessage="No positions found."
                disabled={!form.watch("departmentId")}
              />
              {form.formState.errors.positionId && (
                <p className="text-sm text-red-500">
                  {form.formState.errors.positionId.message}
                </p>
              )}
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-2">
              <label htmlFor="hireDate" className="text-sm font-medium">
                Hire Date
              </label>
              <Popover>
                <PopoverTrigger asChild>
                  <Button
                    variant={"outline"}
                    className={cn(
                      "w-full justify-start text-left font-normal",
                      !form.watch("hireDate") && "text-muted-foreground"
                    )}
                  >
                    <CalendarIcon className="mr-2 h-4 w-4" />
                    {form.watch("hireDate")
                      ? format(form.watch("hireDate"), "PPP")
                      : "Pick a date"}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0" align="start">
                  <Calendar
                    mode="single"
                    selected={form.watch("hireDate")}
                    onSelect={(date) => {
                      if (date) {
                        form.setValue("hireDate", date);
                      }
                    }}
                    disabled={(date) =>
                      date > new Date() || date < new Date("1900-01-01")
                    }
                    initialFocus
                  />
                </PopoverContent>
              </Popover>
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

      {/* Account Details Card */}
      <Card>
        <CardHeader>
          <CardTitle>Account Information</CardTitle>
          <CardDescription>
            {isEditing
              ? "Update account credentials for the employee (leave password blank to keep unchanged)."
              : "Create account credentials for the employee."}
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-2">
              <label htmlFor="password" className="text-sm font-medium">
                {isEditing ? "New Password (Optional)" : "Password"}
              </label>
              <Input
                id="password"
                type="password"
                placeholder={
                  isEditing ? "Enter new password" : "Create a password"
                }
                {...form.register("password")}
              />
              {form.formState.errors.password && (
                <p className="text-sm text-red-500">
                  {form.formState.errors.password.message}
                </p>
              )}
            </div>

            <div className="space-y-2">
              <label htmlFor="confirmPassword" className="text-sm font-medium">
                {isEditing ? "Confirm New Password" : "Confirm Password"}
              </label>
              <Input
                id="confirmPassword"
                type="password"
                placeholder={
                  isEditing ? "Confirm new password" : "Confirm password"
                }
                {...form.register("confirmPassword")}
              />
              {form.formState.errors.confirmPassword && (
                <p className="text-sm text-red-500">
                  {form.formState.errors.confirmPassword.message}
                </p>
              )}
            </div>
          </div>

          <div className="space-y-2">
            <label htmlFor="role" className="text-sm font-medium">
              User Role
            </label>
            <Select
              defaultValue={form.getValues("role")}
              onValueChange={(value) =>
                form.setValue("role", value as "admin" | "manager" | "employee")
              }
            >
              <SelectTrigger id="role" className="w-full">
                <SelectValue placeholder="Select a role" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="admin">Administrator</SelectItem>
                <SelectItem value="manager">Manager</SelectItem>
                <SelectItem value="employee">Employee</SelectItem>
              </SelectContent>
            </Select>
            {form.formState.errors.role && (
              <p className="text-sm text-red-500">
                {form.formState.errors.role.message}
              </p>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Form Actions */}
      <div className="flex justify-end gap-4">
        <Button type="button" variant="outline" onClick={() => router.back()}>
          Cancel
        </Button>
        <Button type="submit" disabled={isSaving}>
          {isSaving
            ? isEditing
              ? "Saving..."
              : "Creating..."
            : isEditing
            ? "Save Employee"
            : "Create Employee"}
        </Button>
      </div>
    </form>
  );
}

export function NewEmployeeForm(
  props: Omit<UnifiedEmployeeFormProps, "isEditing">
) {
  return <EmployeeForm {...props} isEditing={false} />;
}
