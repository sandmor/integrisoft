"use client";

import { useForm, Controller } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Combobox } from "@/components/ui/combobox";
import { Spinner } from "@/components/ui/spinner";
import Link from "next/link";
import {
  useUpdateBudgetMutation,
  useGetCostCentersQuery,
} from "@/lib/redux/financesApi";
import { useGetProjectsQuery } from "@/lib/redux/projectsApi";
import { BudgetDetail } from "@/lib/types/finances";
import { Calendar } from "@/components/ui/calendar";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { format, parseISO } from "date-fns";
import { CalendarIcon } from "lucide-react";

// Define schema for the budget form
const budgetFormSchema = z
  .object({
    name: z.string().min(2, "Name must be at least 2 characters"),
    amount: z.string().min(1, "Amount is required"),
    description: z.string().optional(),
    startDate: z.date({ required_error: "Start date is required" }),
    endDate: z.date({ required_error: "End date is required" }),
    costCenterId: z.string(),
    projectId: z.string(),
  })
  .refine((data) => data.endDate >= data.startDate, {
    message: "End date must be after or equal to the start date",
    path: ["endDate"],
  });

type BudgetFormValues = z.infer<typeof budgetFormSchema>;

export default function BudgetEditFormClient({
  budget,
}: {
  budget: BudgetDetail;
}) {
  const router = useRouter();
  const [updateBudget, { isLoading }] = useUpdateBudgetMutation();
  const { data: costCenters = [] } = useGetCostCentersQuery({
    withStats: false,
  });
  const { data: projectsResponse } = useGetProjectsQuery({
    page: 0,
    pageSize: 100,
  });
  const projects = projectsResponse?.data || [];

  // Prepare default values
  const defaultValues = {
    name: budget.name || "",
    amount: budget.amount || "",
    description: budget.description ?? "",
    startDate: budget.startDate ? parseISO(budget.startDate) : new Date(),
    endDate: budget.endDate ? parseISO(budget.endDate) : new Date(),
    costCenterId: budget.costCenterId ?? "none",
    projectId: budget.projectId ?? "none",
  };

  const form = useForm<BudgetFormValues>({
    resolver: zodResolver(budgetFormSchema),
    defaultValues,
    mode: "onBlur",
  });

  const onSubmit = async (values: BudgetFormValues) => {
    try {
      // Prepare data for the API
      const budgetDataToUpdate = {
        name: values.name,
        amount: values.amount,
        startDate: values.startDate.toISOString(),
        endDate: values.endDate.toISOString(),
        description: values.description || undefined,
        costCenterId:
          values.costCenterId !== "none" ? values.costCenterId : undefined,
        projectId: values.projectId !== "none" ? values.projectId : undefined,
      };

      await updateBudget({
        id: budget.id,
        budget: budgetDataToUpdate,
      }).unwrap();
      toast.success("Budget updated successfully");
      router.push(`/dashboard/finances/budgets/${budget.id}`);
      router.refresh();
    } catch (err: any) {
      toast.error(`Failed to update budget: ${err.data?.error || err.message}`);
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Budget Details</CardTitle>
        <CardDescription>Edit the details of this budget</CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Budget Name */}
            <div className="space-y-2">
              <Label htmlFor="name">Name</Label>
              <Input
                id="name"
                placeholder="Budget name"
                {...form.register("name")}
              />
              {form.formState.errors.name && (
                <p className="text-sm text-red-500">
                  {form.formState.errors.name.message}
                </p>
              )}
            </div>

            {/* Budget Amount */}
            <div className="space-y-2">
              <Label htmlFor="amount">Amount</Label>
              <div className="relative">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500">
                  $
                </span>
                <Input
                  id="amount"
                  type="number"
                  step="0.01"
                  min="0"
                  placeholder="0.00"
                  className="pl-8"
                  {...form.register("amount")}
                />
                {form.formState.errors.amount && (
                  <p className="text-sm text-red-500">
                    {form.formState.errors.amount.message}
                  </p>
                )}
              </div>
            </div>

            {/* Start Date */}
            <div className="space-y-2">
              <Label htmlFor="startDate">Start Date</Label>
              <Controller
                name="startDate"
                control={form.control}
                render={({ field }) => (
                  <Popover>
                    <PopoverTrigger asChild>
                      <Button
                        variant="outline"
                        className="w-full justify-start text-left font-normal"
                        id="startDate"
                      >
                        <CalendarIcon className="mr-2 h-4 w-4" />
                        {field.value ? (
                          format(field.value, "PPP")
                        ) : (
                          <span>Select a start date</span>
                        )}
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-auto p-0">
                      <Calendar
                        mode="single"
                        selected={field.value}
                        onSelect={(date) => date && field.onChange(date)}
                        initialFocus
                      />
                    </PopoverContent>
                  </Popover>
                )}
              />
              {form.formState.errors.startDate && (
                <p className="text-sm text-red-500">
                  {form.formState.errors.startDate.message}
                </p>
              )}
            </div>

            {/* End Date */}
            <div className="space-y-2">
              <Label htmlFor="endDate">End Date</Label>
              <Controller
                name="endDate"
                control={form.control}
                render={({ field }) => (
                  <Popover>
                    <PopoverTrigger asChild>
                      <Button
                        variant="outline"
                        className="w-full justify-start text-left font-normal"
                        id="endDate"
                      >
                        <CalendarIcon className="mr-2 h-4 w-4" />
                        {field.value ? (
                          format(field.value, "PPP")
                        ) : (
                          <span>Select an end date</span>
                        )}
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-auto p-0">
                      <Calendar
                        mode="single"
                        selected={field.value}
                        onSelect={(date) => date && field.onChange(date)}
                        initialFocus
                      />
                    </PopoverContent>
                  </Popover>
                )}
              />
              {form.formState.errors.endDate && (
                <p className="text-sm text-red-500">
                  {form.formState.errors.endDate.message}
                </p>
              )}
            </div>

            {/* Cost Center */}
            <div className="space-y-2">
              <Label htmlFor="costCenter">Cost Center (Optional)</Label>
              <Controller
                name="costCenterId"
                control={form.control}
                render={({ field }) => (
                  <Combobox
                    options={[
                      { value: "none", label: "None" },
                      ...costCenters.map((cc: any) => ({
                        value: cc.id,
                        label: cc.name,
                      })),
                    ]}
                    value={field.value}
                    onValueChange={field.onChange}
                    placeholder="Select cost center"
                    emptyMessage="No cost centers found"
                  />
                )}
              />
            </div>

            {/* Project */}
            <div className="space-y-2">
              <Label htmlFor="project">Project (Optional)</Label>
              <Controller
                name="projectId"
                control={form.control}
                render={({ field }) => (
                  <Combobox
                    options={[
                      { value: "none", label: "None" },
                      ...projects.map((p: any) => ({
                        value: p.id,
                        label: p.name,
                      })),
                    ]}
                    value={field.value}
                    onValueChange={field.onChange}
                    placeholder="Select project"
                    emptyMessage="No projects found"
                  />
                )}
              />
            </div>
          </div>

          {/* Description */}
          <div className="space-y-2">
            <Label htmlFor="description">Description</Label>
            <Textarea
              id="description"
              placeholder="Enter budget details..."
              {...form.register("description")}
            />
          </div>

          {/* Form Actions */}
          <div className="flex justify-end space-x-2">
            <Link href={`/dashboard/finances/budgets/${budget.id}`}>
              <Button
                type="button"
                variant="outline"
                className="mr-2"
                disabled={isLoading}
              >
                Cancel
              </Button>
            </Link>
            <Button type="submit" disabled={isLoading}>
              {isLoading && <Spinner className="mr-2 h-4 w-4 animate-spin" />}
              {isLoading ? "Saving..." : "Save Changes"}
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  );
}
