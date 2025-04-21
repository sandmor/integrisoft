"use client";

import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
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
import { Calendar } from "@/components/ui/calendar";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { format } from "date-fns";
import { CalendarIcon } from "lucide-react";
import { cn } from "@/lib/utils";
import { Combobox } from "@/components/ui/combobox";
import {
  useCreateBudgetMutation,
  useUpdateBudgetMutation,
} from "@/lib/redux/financesApi";
import { BudgetCreateInput, BudgetUpdateInput } from "@/lib/types/finances";

// Define the form schema
const formSchema = z
  .object({
    name: z.string().min(3, {
      message: "Name must be at least 3 characters.",
    }),
    amount: z.coerce.number().positive({
      message: "Amount must be a positive number.",
    }),
    description: z.string().optional(),
    startDate: z.date({
      required_error: "Start date is required.",
    }),
    endDate: z.date({
      required_error: "End date is required.",
    }),
    costCenterId: z.string().optional(),
    projectId: z.string().optional(),
  })
  .refine((data) => data.costCenterId || data.projectId, {
    message: "Either Cost Center or Project must be selected.",
    path: ["costCenterId"],
  })
  .refine(
    (data) => {
      // Check that the end date is after the start date
      return data.endDate > data.startDate;
    },
    {
      message: "End date must be after start date.",
      path: ["endDate"],
    }
  );

type FormValues = z.infer<typeof formSchema>;

interface BudgetFormProps {
  initialData?: (FormValues & { id: string }) | null;
  costCenters?: { id: string; name: string }[];
  projects?: { id: string; name: string }[];
}

export function BudgetForm({
  initialData = null,
  costCenters = [],
  projects = [],
}: BudgetFormProps) {
  const router = useRouter();
  const [createBudget, { isLoading: isCreating }] = useCreateBudgetMutation();
  const [updateBudget, { isLoading: isUpdating }] = useUpdateBudgetMutation();
  const isLoading = isCreating || isUpdating;

  const defaultValues: FormValues = initialData || {
    name: "",
    amount: 0,
    description: "",
    startDate: new Date(),
    endDate: new Date(new Date().setMonth(new Date().getMonth() + 1)),
    costCenterId: undefined,
    projectId: undefined,
  };

  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues,
  });

  async function onSubmit(values: FormValues) {
    try {
      if (initialData?.id) {
        // Format data for update API
        const updateData: BudgetUpdateInput = {
          name: values.name,
          amount: values.amount.toString(),
          description: values.description,
          startDate: values.startDate.toISOString(),
          endDate: values.endDate.toISOString(),
        };

        // Update existing budget
        await updateBudget({
          id: initialData.id,
          budget: updateData,
        }).unwrap();
        toast.success("Budget updated successfully");
      } else {
        // Format data for create API
        const createData: BudgetCreateInput = {
          name: values.name,
          amount: values.amount.toString(),
          description: values.description,
          startDate: values.startDate.toISOString(),
          endDate: values.endDate.toISOString(),
          costCenterId: values.costCenterId,
          projectId: values.projectId,
        };

        // Create new budget
        await createBudget(createData).unwrap();
        toast.success("Budget created successfully");
      }
      router.push("/dashboard/finances/budgets");
      router.refresh();
    } catch (error) {
      console.error(error);
      toast.error("Something went wrong. Please try again.");
    }
  }

  const costCenterOptions = costCenters.map((costCenter) => ({
    label: costCenter.name,
    value: costCenter.id,
  }));

  const projectOptions = projects.map((project) => ({
    label: project.name,
    value: project.id,
  }));

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <FormField
            control={form.control}
            name="name"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Name</FormLabel>
                <FormControl>
                  <Input placeholder="Budget name" {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
          <FormField
            control={form.control}
            name="amount"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Amount</FormLabel>
                <FormControl>
                  <Input
                    type="number"
                    step="0.01"
                    placeholder="0.00"
                    {...field}
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

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
                          "w-full pl-3 text-left font-normal",
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
                      selected={field.value}
                      onSelect={field.onChange}
                      disabled={(date) =>
                        date <
                        new Date(new Date().setDate(new Date().getDate() - 1))
                      }
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
            name="endDate"
            render={({ field }) => (
              <FormItem className="flex flex-col">
                <FormLabel>End Date</FormLabel>
                <Popover>
                  <PopoverTrigger asChild>
                    <FormControl>
                      <Button
                        variant={"outline"}
                        className={cn(
                          "w-full pl-3 text-left font-normal",
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
                      selected={field.value}
                      onSelect={field.onChange}
                      disabled={(date) => date < form.getValues("startDate")}
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
            name="costCenterId"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Cost Center</FormLabel>
                <FormControl>
                  <Combobox
                    options={costCenterOptions}
                    value={field.value || ""}
                    onValueChange={field.onChange}
                    placeholder="Select a cost center"
                    emptyMessage="No cost centers found."
                  />
                </FormControl>
                <FormDescription>
                  Select a cost center or project below
                </FormDescription>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="projectId"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Project</FormLabel>
                <FormControl>
                  <Combobox
                    options={projectOptions}
                    value={field.value || ""}
                    onValueChange={field.onChange}
                    placeholder="Select a project"
                    emptyMessage="No projects found."
                  />
                </FormControl>
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
                <Textarea placeholder="Enter budget details..." {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <div className="flex justify-end gap-2">
          <Button
            type="button"
            variant="outline"
            onClick={() => router.push("/dashboard/finances/budgets")}
            disabled={isLoading}
          >
            Cancel
          </Button>
          <Button type="submit" disabled={isLoading}>
            {isLoading
              ? "Saving..."
              : initialData
              ? "Update Budget"
              : "Create Budget"}
          </Button>
        </div>
      </form>
    </Form>
  );
}
