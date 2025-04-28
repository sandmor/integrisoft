"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import {
  useCreateBudgetMutation,
  useGetCostCentersQuery,
  useUpdateBudgetMutation,
} from "@/lib/redux/financesApi";
import { toast } from "sonner";
import {
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardContent,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Spinner } from "@/components/ui/spinner";
import { useGetProjectsQuery } from "@/lib/redux/projectsApi";

interface BudgetFormClientProps {
  budget?: {
    id: string;
    name: string;
    amount: string;
    description: string | null;
    startDate: string;
    endDate: string;
    costCenterId?: string | null;
    projectId?: string | null;
  };
  isNew?: boolean;
}

export default function BudgetFormClient({
  budget,
  isNew = false,
}: BudgetFormClientProps) {
  const router = useRouter();
  const [createBudget, { isLoading: isCreating }] = useCreateBudgetMutation();
  const [updateBudget, { isLoading: isSaving }] = useUpdateBudgetMutation();

  const { data: costCenters } = useGetCostCentersQuery({ withStats: false });
  const { data: projectsResponse } = useGetProjectsQuery({
    page: 0,
    pageSize: 100,
  });
  const projects = projectsResponse?.data || [];

  const [name, setName] = useState(budget?.name || "");
  const [amount, setAmount] = useState(budget?.amount || "");
  const [description, setDescription] = useState(budget?.description || "");
  const [startDate, setStartDate] = useState(budget?.startDate || "");
  const [endDate, setEndDate] = useState(budget?.endDate || "");
  const [costCenterId, setCostCenterId] = useState(budget?.costCenterId || "");
  const [projectId, setProjectId] = useState(budget?.projectId || "");
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!name.trim()) {
      setError("Name is required");
      return;
    }

    try {
      if (isNew) {
        await createBudget({
          name,
          amount,
          description: description || undefined,
          startDate,
          endDate,
          costCenterId: costCenterId || undefined,
          projectId: projectId || undefined,
        }).unwrap();
        toast.success("Budget created successfully");
        router.push("/dashboard/finances/budgets");
      } else if (budget) {
        await updateBudget({
          id: budget.id,
          budget: {
            name,
            amount,
            description: description || null,
            startDate,
            endDate,
          },
        }).unwrap();
        toast.success("Budget updated successfully");
        router.push(`/dashboard/finances/budgets/${budget.id}`);
      }
    } catch (err: any) {
      console.error(err);
      toast.error(
        `Failed to ${isNew ? "create" : "update"} budget: ${
          err.data?.error || err.message
        }`
      );
      setError(
        err?.data?.error || `Failed to ${isNew ? "create" : "update"} budget`
      );
    }
  };

  const isLoading = isCreating || isSaving;

  return (
    <Card>
      <CardHeader>
        <CardTitle>{isNew ? "New Budget" : "Edit Budget"}</CardTitle>
        <CardDescription>
          {isNew
            ? "Fill in details to create a new budget"
            : "Update budget details"}
        </CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-1">
            <Label htmlFor="name">Name</Label>
            <Input
              id="name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              required
            />
          </div>
          <div className="space-y-1">
            <Label htmlFor="amount">Amount</Label>
            <Input
              id="amount"
              type="number"
              step="0.01"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              required
            />
          </div>
          <div className="space-y-1">
            <Label htmlFor="startDate">Start Date</Label>
            <Input
              id="startDate"
              type="date"
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
              required
            />
          </div>
          <div className="space-y-1">
            <Label htmlFor="endDate">End Date</Label>
            <Input
              id="endDate"
              type="date"
              value={endDate}
              onChange={(e) => setEndDate(e.target.value)}
              required
            />
          </div>
          <div className="space-y-1">
            <Label htmlFor="costCenter">Cost Center</Label>
            <select
              id="costCenter"
              value={costCenterId}
              onChange={(e) => setCostCenterId(e.target.value)}
            >
              <option value="">None</option>
              {costCenters?.map((cc) => (
                <option key={cc.id} value={cc.id}>
                  {cc.name}
                </option>
              ))}
            </select>
          </div>
          <div className="space-y-1">
            <Label htmlFor="project">Project</Label>
            <select
              id="project"
              value={projectId}
              onChange={(e) => setProjectId(e.target.value)}
            >
              <option value="">None</option>
              {projects.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.name}
                </option>
              ))}
            </select>
          </div>
          <div className="space-y-1">
            <Label htmlFor="description">Description</Label>
            <Textarea
              id="description"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
            />
          </div>
          {error && <p className="text-red-600">{error}</p>}
          <div className="flex justify-end space-x-2">
            <Link
              href={
                isNew
                  ? "/dashboard/finances/budgets"
                  : `/dashboard/finances/budgets/${budget?.id}`
              }
            >
              <Button type="button" variant="outline">
                Cancel
              </Button>
            </Link>
            <Button type="submit" disabled={isLoading}>
              {isLoading
                ? "Saving..."
                : isNew
                ? "Create Budget"
                : "Save Changes"}
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  );
}
