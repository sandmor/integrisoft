"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import {
  useUpdateCostCenterMutation,
  useCreateCostCenterMutation,
} from "@/lib/redux/financesApi";
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
import { CostCenterDetail } from "@/lib/types/finances";

interface CostCenterFormClientProps {
  costCenter?: CostCenterDetail;
  isNew?: boolean;
}

export default function CostCenterFormClient({
  costCenter,
  isNew = false,
}: CostCenterFormClientProps) {
  const router = useRouter();

  const [updateCostCenter, { isLoading: isSaving }] =
    useUpdateCostCenterMutation();
  const [createCostCenter, { isLoading: isCreating }] =
    useCreateCostCenterMutation();

  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [budget, setBudget] = useState<string>("");
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (costCenter && !isNew) {
      setName(costCenter.name || "");
      setDescription(costCenter.description || "");
      setBudget(costCenter.budget || "");
    }
  }, [costCenter, isNew]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    if (!name.trim()) {
      setError("Name is required");
      return;
    }

    try {
      if (isNew) {
        await createCostCenter({
          name,
          description,
          budget: budget || undefined,
        }).unwrap();
        router.push("/dashboard/finances/cost-centers");
      } else if (costCenter) {
        await updateCostCenter({
          id: costCenter.id,
          costCenter: {
            name,
            description,
            budget: budget || null,
          },
        }).unwrap();
        router.push(`/dashboard/finances/cost-centers/${costCenter.id}`);
      }
    } catch (err: any) {
      setError(
        err?.data?.error ||
          `Failed to ${isNew ? "create" : "update"} cost center`
      );
    }
  };

  const isLoading = isCreating || isSaving;

  return (
    <Card>
      <CardHeader>
        <CardTitle>
          {isNew ? "Create New Cost Center" : "Edit Cost Center"}
        </CardTitle>
        <CardDescription>
          {isNew
            ? "Enter details for the new cost center"
            : "Update the cost center information"}
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
              placeholder="Cost Center Name"
              required
            />
          </div>
          <div className="space-y-1">
            <Label htmlFor="description">Description</Label>
            <Textarea
              id="description"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Description (optional)"
            />
          </div>
          <div className="space-y-1">
            <Label htmlFor="budget">Budget</Label>
            <Input
              id="budget"
              type="number"
              step="0.01"
              value={budget}
              onChange={(e) => setBudget(e.target.value)}
              placeholder="0.00"
            />
          </div>
          {error && <p className="text-red-600">{error}</p>}
          <div className="pt-4 flex justify-between">
            <Button
              variant="outline"
              onClick={() =>
                router.push(
                  isNew
                    ? "/dashboard/finances/cost-centers"
                    : `/dashboard/finances/cost-centers/${costCenter?.id}`
                )
              }
              type="button"
            >
              Cancel
            </Button>
            <Button type="submit" disabled={isLoading}>
              {isLoading ? (
                <>
                  <Spinner className="mr-2 h-4 w-4" />
                  {isNew ? "Creating..." : "Saving..."}
                </>
              ) : isNew ? (
                "Create Cost Center"
              ) : (
                "Save Changes"
              )}
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  );
}
