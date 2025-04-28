"use client";

import { useForm, Controller } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import {
  useUpdateTransactionMutation,
  useCreateTransactionMutation,
} from "@/lib/redux/financesApi";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Calendar } from "@/components/ui/calendar";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { format, parseISO } from "date-fns";
import { CalendarIcon } from "lucide-react";
import Link from "next/link";
import { Spinner } from "@/components/ui/spinner";
import { transactionTypeEnum } from "@/lib/db/schema";
import { TransactionDetail } from "@/lib/types/finances";
import { Project } from "@/lib/types/projects";
import { TransactionCategoryItem } from "@/lib/types/finances";
import { CostCenterListItem } from "@/lib/types/finances";
import { Combobox } from "@/components/ui/combobox";
import type {
  TransactionCreateInput,
  TransactionUpdateInput,
} from "@/lib/types/finances";

interface EditTransactionFormClientProps {
  transaction?: TransactionDetail;
  categories: TransactionCategoryItem[];
  costCenters: CostCenterListItem[];
  projects: Project[];
}

export default function EditTransactionFormClient({
  transaction,
  categories,
  costCenters,
  projects,
}: EditTransactionFormClientProps) {
  const router = useRouter();
  const [createTransaction, { isLoading: isCreating }] =
    useCreateTransactionMutation();
  const [updateTransaction, { isLoading: isUpdating }] =
    useUpdateTransactionMutation();
  const isSaving = isCreating || isUpdating;

  // Prepare default form values
  const defaultValues = {
    type: transaction?.type ?? transactionTypeEnum.enumValues[0],
    amount: transaction?.amount ?? "",
    date: transaction?.date ? parseISO(transaction.date) : new Date(),
    categoryId: transaction?.categoryId ?? categories[0]?.id,
    costCenterId: transaction?.costCenterId ?? "none",
    projectId: transaction?.projectId ?? "none",
    description: transaction?.description ?? "",
  };

  // Zod schema
  const transactionSchema = z.object({
    type: z.enum(transactionTypeEnum.enumValues as [string, ...string[]]),
    amount: z.string().nonempty({ message: "Amount is required." }),
    date: z.date({ required_error: "Date is required." }),
    categoryId: z.string().nonempty({ message: "Category is required." }),
    costCenterId: z.string(),
    projectId: z.string(),
    description: z.string().optional(),
  });
  type TransactionFormValues = z.infer<typeof transactionSchema>;

  const form = useForm<TransactionFormValues>({
    resolver: zodResolver(transactionSchema),
    defaultValues,
    mode: "onBlur",
  });

  const onSubmit = async (data: TransactionFormValues) => {
    try {
      if (transaction) {
        // Build update payload with exact field types
        const {
          type,
          amount,
          date,
          categoryId,
          costCenterId,
          projectId,
          description,
        } = data;
        const updatePayload: TransactionUpdateInput = {
          type: type as TransactionUpdateInput["type"],
          amount,
          date: date.toISOString(),
          categoryId,
          costCenterId: costCenterId !== "none" ? costCenterId : undefined,
          projectId: projectId !== "none" ? projectId : undefined,
          description: description || undefined,
        };
        await updateTransaction({
          id: transaction.id,
          transaction: updatePayload,
        }).unwrap();
        toast.success("Transaction updated successfully!");
        router.push(`/dashboard/finances/transactions/${transaction.id}`);
        router.refresh();
      } else {
        // Build create payload with exact field types
        const {
          type,
          amount,
          date,
          categoryId,
          costCenterId,
          projectId,
          description,
        } = data;
        const createPayload: TransactionCreateInput = {
          type: type as TransactionCreateInput["type"],
          amount,
          date: date.toISOString(),
          categoryId,
          costCenterId: costCenterId !== "none" ? costCenterId : undefined,
          projectId: projectId !== "none" ? projectId : undefined,
          description: description || undefined,
        };
        await createTransaction(createPayload).unwrap();
        toast.success("Transaction created successfully!");
        router.push(`/dashboard/finances/transactions`);
      }
    } catch (error) {
      console.error(
        transaction
          ? "Failed to update transaction:"
          : "Failed to create transaction:",
        error
      );
      toast.error(
        `An error occurred while ${
          transaction ? "updating" : "creating"
        } the transaction. Please try again.`
      );
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Transaction Details</CardTitle>
        <CardDescription>
          Edit the details of this financial transaction
        </CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Transaction Type */}
            <div className="space-y-2">
              <Label htmlFor="type">Transaction Type</Label>
              <Controller
                name="type"
                control={form.control}
                render={({ field }) => (
                  <Select onValueChange={field.onChange} value={field.value}>
                    <SelectTrigger id="type">
                      <SelectValue placeholder="Select type" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="income">Income</SelectItem>
                      <SelectItem value="expense">Expense</SelectItem>
                      <SelectItem value="transfer">Transfer</SelectItem>
                    </SelectContent>
                  </Select>
                )}
              />
              {form.formState.errors.type && (
                <p className="text-sm text-red-500">
                  {form.formState.errors.type.message}
                </p>
              )}
            </div>

            {/* Amount */}
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

            {/* Date */}
            <div className="space-y-2">
              <Label htmlFor="date">Date</Label>
              <Controller
                name="date"
                control={form.control}
                render={({ field }) => (
                  <Popover>
                    <PopoverTrigger asChild>
                      <Button
                        variant="outline"
                        className="w-full justify-start text-left font-normal"
                        id="date"
                      >
                        <CalendarIcon className="mr-2 h-4 w-4" />
                        {field.value ? (
                          format(field.value, "PPP")
                        ) : (
                          <span>Select a date</span>
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
              {form.formState.errors.date && (
                <p className="text-sm text-red-500">
                  {form.formState.errors.date.message}
                </p>
              )}
            </div>

            {/* Category */}
            <div className="space-y-2">
              <Label htmlFor="category">Category</Label>
              <Controller
                name="categoryId"
                control={form.control}
                render={({ field }) => (
                  <Combobox
                    options={categories.map((cat) => ({
                      value: cat.id,
                      label: cat.name,
                    }))}
                    value={field.value}
                    onValueChange={field.onChange}
                    placeholder="Select category"
                    emptyMessage="No categories found"
                  />
                )}
              />
              {form.formState.errors.categoryId && (
                <p className="text-sm text-red-500">
                  {form.formState.errors.categoryId.message}
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
                      ...costCenters.map((cc) => ({
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
                      ...projects.map((p) => ({ value: p.id, label: p.name })),
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
              placeholder="Enter transaction details..."
              {...form.register("description")}
            />
          </div>

          {/* Form Actions */}
          <div className="flex justify-end space-x-2">
            <Link href={`/dashboard/finances/transactions/${transaction?.id}`}>
              <Button
                type="button"
                variant="outline"
                className="mr-2"
                disabled={isSaving}
              >
                Cancel
              </Button>
            </Link>
            <Button type="submit" disabled={isSaving}>
              {isSaving && <Spinner className="mr-2 h-4 w-4 animate-spin" />}
              {isSaving
                ? "Saving..."
                : transaction
                ? "Save Changes"
                : "Create Transaction"}
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  );
}
