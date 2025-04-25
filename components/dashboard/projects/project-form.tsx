"use client";

import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { format } from "date-fns";
import { useRouter } from "next/navigation";
import { CalendarIcon, Loader2 } from "lucide-react";
import { toast } from "sonner";

import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Combobox, ComboboxOption } from "@/components/ui/combobox";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";
import {
  useAddProjectMutation,
  useUpdateProjectMutation,
} from "@/lib/redux/projectsApi";

// Project status options
const PROJECT_STATUS_OPTIONS = [
  { value: "planning", label: "Planning" },
  { value: "active", label: "Active" },
  { value: "on_hold", label: "On Hold" },
  { value: "completed", label: "Completed" },
  { value: "cancelled", label: "Cancelled" },
];

// Helper functions to convert options to ComboboxOption format
function clientsToOptions(
  clients: { id: string; name: string }[]
): ComboboxOption[] {
  return [
    { value: "", label: "No client assigned" },
    ...clients.map((client) => ({
      value: client.id,
      label: client.name,
    })),
  ];
}

function employeesToOptions(
  employees: { id: string; name: string }[]
): ComboboxOption[] {
  return [
    { value: "", label: "No manager assigned" },
    ...employees.map((employee) => ({
      value: employee.id,
      label: employee.name,
    })),
  ];
}

function productsToOptions(
  products: { id: string; name: string }[]
): ComboboxOption[] {
  return [
    { value: "", label: "No product associated" },
    ...products.map((product) => ({
      value: product.id,
      label: product.name,
    })),
  ];
}

// Validation schema for project form
const projectFormSchema = z.object({
  name: z
    .string()
    .min(1, "Project name is required")
    .max(100, "Project name is too long"),
  description: z.string().optional(),
  status: z.enum(["planning", "active", "on_hold", "completed", "cancelled"]),
  startDate: z.date().optional().nullable(),
  targetEndDate: z.date().optional().nullable(),
  budget: z.string().optional(),
  clientId: z.string().optional(),
  productId: z.string().optional(),
  managerId: z.string().optional(),
});

type ProjectFormValues = z.infer<typeof projectFormSchema>;

type ProjectFormProps = {
  initialData?: any;
  clientOptions?: { id: string; name: string }[];
  productOptions?: { id: string; name: string }[];
  employeeOptions?: { id: string; name: string }[];
};

export function ProjectForm({
  initialData,
  clientOptions = [],
  productOptions = [],
  employeeOptions = [],
}: ProjectFormProps) {
  const router = useRouter();
  const isEditMode = !!initialData;

  // RTK Query mutations
  const [addProject, { isLoading: isCreating }] = useAddProjectMutation();
  const [updateProject, { isLoading: isUpdating }] = useUpdateProjectMutation();

  const isSubmitting = isCreating || isUpdating;

  // Set up the form with validation and initial values
  const form = useForm<ProjectFormValues>({
    resolver: zodResolver(projectFormSchema),
    defaultValues: initialData
      ? {
          ...initialData,
          startDate: initialData.startDate
            ? new Date(initialData.startDate)
            : null,
          targetEndDate: initialData.targetEndDate
            ? new Date(initialData.targetEndDate)
            : null,
          budget: initialData.budget?.toString() || "",
        }
      : {
          name: "",
          description: "",
          status: "planning",
          startDate: null,
          targetEndDate: null,
          budget: "",
          clientId: undefined,
          productId: undefined,
          managerId: undefined,
        },
  });

  const onSubmit = async (values: ProjectFormValues) => {
    try {
      const projectData = {
        ...values,
        startDate: values.startDate
          ? values.startDate.toISOString()
          : undefined,
        targetEndDate: values.targetEndDate
          ? values.targetEndDate.toISOString()
          : undefined,
      };

      if (isEditMode) {
        await updateProject({
          id: initialData.id,
          ...projectData,
        }).unwrap();
        toast.success("Project updated successfully");
      } else {
        const result = await addProject(projectData).unwrap();
        toast.success("Project created successfully");
      }

      // Redirect to the project list page after successful submission
      router.push("/dashboard/projects");
      router.refresh();
    } catch (error) {
      console.error("Failed to save project:", error);
      toast.error("Failed to save project. Please try again.");
    }
  };

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
        <div className="grid gap-6 md:grid-cols-2">
          <FormField
            control={form.control}
            name="name"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Project Name</FormLabel>
                <FormControl>
                  <Input placeholder="Enter project name" {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="status"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Status</FormLabel>
                <Select
                  onValueChange={field.onChange}
                  defaultValue={field.value}
                >
                  <FormControl>
                    <SelectTrigger>
                      <SelectValue placeholder="Select status" />
                    </SelectTrigger>
                  </FormControl>
                  <SelectContent>
                    {PROJECT_STATUS_OPTIONS.map((option) => (
                      <SelectItem key={option.value} value={option.value}>
                        {option.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>

        <FormField
          control={form.control}
          name="description"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Description</FormLabel>
              <FormControl>
                <Textarea
                  placeholder="Enter project description"
                  className="resize-none min-h-[120px]"
                  {...field}
                  value={field.value || ""}
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <div className="grid gap-6 md:grid-cols-2">
          <FormField
            control={form.control}
            name="startDate"
            render={({ field }) => (
              <FormItem className="flex flex-col">
                <FormLabel>Start Date</FormLabel>
                <Popover>
                  <PopoverTrigger asChild>
                    <FormControl>
                      <Button
                        variant={"outline"}
                        className={cn(
                          "pl-3 text-left font-normal",
                          !field.value && "text-muted-foreground"
                        )}
                      >
                        {field.value ? (
                          format(field.value, "PPP")
                        ) : (
                          <span>Pick a date</span>
                        )}
                        <CalendarIcon className="ml-auto h-4 w-4 opacity-50" />
                      </Button>
                    </FormControl>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0" align="start">
                    <Calendar
                      mode="single"
                      selected={field.value || undefined}
                      onSelect={field.onChange}
                      initialFocus
                    />
                  </PopoverContent>
                </Popover>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="targetEndDate"
            render={({ field }) => (
              <FormItem className="flex flex-col">
                <FormLabel>Target End Date</FormLabel>
                <Popover>
                  <PopoverTrigger asChild>
                    <FormControl>
                      <Button
                        variant={"outline"}
                        className={cn(
                          "pl-3 text-left font-normal",
                          !field.value && "text-muted-foreground"
                        )}
                      >
                        {field.value ? (
                          format(field.value, "PPP")
                        ) : (
                          <span>Pick a date</span>
                        )}
                        <CalendarIcon className="ml-auto h-4 w-4 opacity-50" />
                      </Button>
                    </FormControl>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0" align="start">
                    <Calendar
                      mode="single"
                      selected={field.value || undefined}
                      onSelect={field.onChange}
                      initialFocus
                    />
                  </PopoverContent>
                </Popover>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>

        <div className="grid gap-6 md:grid-cols-3">
          <FormField
            control={form.control}
            name="budget"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Budget</FormLabel>
                <FormControl>
                  <Input
                    type="number"
                    placeholder="Enter budget amount"
                    {...field}
                    value={field.value || ""}
                  />
                </FormControl>
                <FormDescription>Project budget in dollars</FormDescription>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="clientId"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Client</FormLabel>
                <FormControl>
                  <Combobox
                    options={clientsToOptions(clientOptions)}
                    value={field.value || ""}
                    onValueChange={field.onChange}
                    placeholder="Select client"
                    emptyMessage="No clients found."
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="managerId"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Project Manager</FormLabel>
                <FormControl>
                  <Combobox
                    options={employeesToOptions(employeeOptions)}
                    value={field.value || ""}
                    onValueChange={field.onChange}
                    placeholder="Select manager"
                    emptyMessage="No managers found."
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>

        <FormField
          control={form.control}
          name="productId"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Associated Product</FormLabel>
              <FormControl>
                <Combobox
                  options={productsToOptions(productOptions)}
                  value={field.value || ""}
                  onValueChange={field.onChange}
                  placeholder="Select product"
                  emptyMessage="No products found."
                />
              </FormControl>
              <FormDescription>
                Associate this project with a product
              </FormDescription>
              <FormMessage />
            </FormItem>
          )}
        />

        <div className="flex justify-end space-x-4">
          <Button type="button" variant="outline" onClick={() => router.back()}>
            Cancel
          </Button>
          <Button type="submit" disabled={isSubmitting}>
            {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            {isEditMode ? "Update Project" : "Create Project"}
          </Button>
        </div>
      </form>
    </Form>
  );
}
