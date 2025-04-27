"use client";

import { useState, useEffect, FormEvent } from "react";
import { useRouter, useParams } from "next/navigation";
import {
  useGetTransactionQuery,
  useUpdateTransactionMutation,
  useGetTransactionCategoriesQuery,
  useGetCostCentersQuery,
} from "@/lib/redux/financesApi";
import { useGetProjectsQuery } from "@/lib/redux/projectsApi";
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

export default function EditTransactionClient() {
  const params = useParams();
  const id = params.id as string;
  const router = useRouter();
  const { data: transaction, isLoading: isLoadingTransaction } =
    useGetTransactionQuery(id);
  const [updateTransaction, { isLoading: isSaving }] =
    useUpdateTransactionMutation();

  // Form state
  const [type, setType] =
    useState<(typeof transactionTypeEnum.enumValues)[number]>("transfer");
  const [amount, setAmount] = useState<string>("");
  const [date, setDate] = useState<Date | undefined>(undefined);
  const [categoryId, setCategoryId] = useState<string>("");
  const [costCenterId, setCostCenterId] = useState<string>("");
  const [projectId, setProjectId] = useState<string>("");
  const [description, setDescription] = useState<string>("");

  // Fetch data for selects
  const { data: categories } = useGetTransactionCategoriesQuery({ flat: true });
  const { data: costCenters } = useGetCostCentersQuery({});
  const { data: projectsResponse } = useGetProjectsQuery({
    page: 1,
    pageSize: 100,
  });
  const projects = projectsResponse?.data || [];

  // Initialize form with transaction data when loaded
  useEffect(() => {
    if (transaction) {
      setType(transaction.type);
      setAmount(transaction.amount);
      setDate(transaction.date ? parseISO(transaction.date) : undefined);
      setCategoryId(transaction.categoryId || "");
      setCostCenterId(transaction.costCenterId || "");
      setProjectId(transaction.projectId || "");
      setDescription(transaction.description || "");
    }
  }, [transaction]);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    try {
      await updateTransaction({
        id,
        transaction: {
          type,
          amount,
          date: date?.toISOString(),
          categoryId,
          costCenterId: costCenterId || undefined,
          projectId: projectId || undefined,
          description,
        },
      }).unwrap();
      router.push(`/dashboard/finances/transactions/${id}`);
    } catch (error) {
      console.error("Failed to update transaction:", error);
    }
  };

  if (isLoadingTransaction) {
    return (
      <div className="flex justify-center items-center min-h-[400px]">
        <Spinner className="h-8 w-8" />
        <span className="ml-3 text-lg">Loading transaction data...</span>
      </div>
    );
  }

  if (!transaction) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[400px]">
        <h2 className="text-xl font-semibold text-red-600 mb-2">
          Transaction not found
        </h2>
        <p className="text-muted-foreground">
          The transaction you're trying to edit could not be found.
        </p>
        <Link href="/dashboard/finances/transactions" className="mt-4">
          <Button variant="outline">Back to Transactions</Button>
        </Link>
      </div>
    );
  }

  return (
    <div className="flex flex-col space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-3xl font-bold">Edit Transaction</h1>
        <Link href={`/dashboard/finances/transactions/${id}`}>
          <Button variant="outline">Cancel</Button>
        </Link>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Transaction Details</CardTitle>
          <CardDescription>
            Edit the details of this financial transaction
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Transaction Type */}
              <div className="space-y-2">
                <Label htmlFor="type">Transaction Type</Label>
                <Select
                  onValueChange={(v) =>
                    setType(
                      v as (typeof transactionTypeEnum.enumValues)[number]
                    )
                  }
                  value={type}
                >
                  <SelectTrigger id="type">
                    <SelectValue placeholder="Select type" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="income">Income</SelectItem>
                    <SelectItem value="expense">Expense</SelectItem>
                    <SelectItem value="transfer">Transfer</SelectItem>
                  </SelectContent>
                </Select>
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
                    value={amount}
                    onChange={(e) => setAmount(e.target.value)}
                  />
                </div>
              </div>

              {/* Date */}
              <div className="space-y-2">
                <Label htmlFor="date">Date</Label>
                <Popover>
                  <PopoverTrigger asChild>
                    <Button
                      variant="outline"
                      className="w-full justify-start text-left font-normal"
                      id="date"
                    >
                      <CalendarIcon className="mr-2 h-4 w-4" />
                      {date ? format(date, "PPP") : <span>Select a date</span>}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0">
                    <Calendar
                      mode="single"
                      selected={date}
                      onSelect={setDate}
                      initialFocus
                    />
                  </PopoverContent>
                </Popover>
              </div>

              {/* Category */}
              <div className="space-y-2">
                <Label htmlFor="category">Category</Label>
                <Select onValueChange={setCategoryId} value={categoryId}>
                  <SelectTrigger id="category">
                    <SelectValue placeholder="Select category" />
                  </SelectTrigger>
                  <SelectContent>
                    {categories?.map((cat) => (
                      <SelectItem key={cat.id} value={cat.id}>
                        {cat.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* Cost Center */}
              <div className="space-y-2">
                <Label htmlFor="costCenter">Cost Center (Optional)</Label>
                <Select onValueChange={setCostCenterId} value={costCenterId}>
                  <SelectTrigger id="costCenter">
                    <SelectValue placeholder="Select cost center" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="">None</SelectItem>
                    {costCenters?.map((cc) => (
                      <SelectItem key={cc.id} value={cc.id}>
                        {cc.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* Project */}
              <div className="space-y-2">
                <Label htmlFor="project">Project (Optional)</Label>
                <Select onValueChange={setProjectId} value={projectId}>
                  <SelectTrigger id="project">
                    <SelectValue placeholder="Select project" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="">None</SelectItem>
                    {projects.map((p) => (
                      <SelectItem key={p.id} value={p.id}>
                        {p.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            {/* Description */}
            <div className="space-y-2">
              <Label htmlFor="description">Description</Label>
              <Textarea
                id="description"
                placeholder="Enter transaction details..."
                value={description}
                onChange={(e) => setDescription(e.target.value)}
              />
            </div>

            {/* Form Actions */}
            <div className="flex justify-end space-x-2">
              <Link href={`/dashboard/finances/transactions/${id}`}>
                <Button type="button" variant="outline" className="mr-2">
                  Cancel
                </Button>
              </Link>
              <Button type="submit" disabled={isSaving}>
                {isSaving ? "Saving..." : "Save Changes"}
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
