"use client";

import { useRouter } from "next/navigation";
import Link from "next/link";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import {
  useUpdateCostCenterMutation,
  useCreateCostCenterMutation,
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

  const isLoading = isCreating || isSaving;

  // Define Zod schema for form validation
  const costCenterSchema = z.object({
    name: z.string().nonempty({ message: "Name is required" }),
    description: z.string().optional(),
    budget: z.string().optional(),
  });

  type CostCenterFormValues = z.infer<typeof costCenterSchema>;

  // Prepare default form values
  const defaultValues = {
    name: costCenter?.name || "",
    description: costCenter?.description || "",
    budget: costCenter?.budget || "",
  };

  // Initialize React Hook Form
  const form = useForm<CostCenterFormValues>({
    resolver: zodResolver(costCenterSchema),
    defaultValues,
    mode: "onBlur",
  });

  const onSubmit = async (data: CostCenterFormValues) => {
    try {
      if (isNew) {
        await createCostCenter({
          name: data.name,
          description: data.description,
          budget: data.budget || undefined,
        }).unwrap();
        toast.success("Cost center created successfully");
        router.push("/dashboard/finances/cost-centers");
      } else if (costCenter) {
        await updateCostCenter({
          id: costCenter.id,
          costCenter: {
            name: data.name,
            description: data.description || undefined,
            budget: data.budget || null,
          },
        }).unwrap();
        toast.success("Cost center updated successfully");
        router.push(`/dashboard/finances/cost-centers/${costCenter.id}`);
      }
    } catch (err: any) {
      console.error(err);
      toast.error(
        `Failed to ${isNew ? "create" : "update"} cost center: ${
          err.data?.error || err.message
        }`
      );
    }
  };

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
        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
          <div className="space-y-1">
            <Label htmlFor="name">Name</Label>
            <Input
              id="name"
              {...form.register("name")}
              placeholder="Cost Center Name"
            />
            {form.formState.errors.name && (
              <p className="text-sm text-red-500">
                {form.formState.errors.name.message}
              </p>
            )}
          </div>

          <div className="space-y-1">
            <Label htmlFor="description">Description</Label>
            <Textarea
              id="description"
              {...form.register("description")}
              placeholder="Description (optional)"
            />
            {form.formState.errors.description && (
              <p className="text-sm text-red-500">
                {form.formState.errors.description.message}
              </p>
            )}
          </div>

          <div className="space-y-1">
            <Label htmlFor="budget">Budget</Label>
            <Input
              id="budget"
              type="number"
              step="0.01"
              {...form.register("budget")}
              placeholder="0.00"
            />
            {form.formState.errors.budget && (
              <p className="text-sm text-red-500">
                {form.formState.errors.budget.message}
              </p>
            )}
          </div>

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
              disabled={isLoading}
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
