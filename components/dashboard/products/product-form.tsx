"use client";

import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { toast } from "sonner";
import { Box, Save } from "lucide-react";
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
import { Combobox, ComboboxOption } from "@/components/ui/combobox";
import {
  useAddProductMutation,
  useUpdateProductMutation,
} from "@/lib/redux/productsApi";
import { Product } from "@/lib/types/products";

const productFormSchema = z.object({
  name: z.string().min(2, "Name must be at least 2 characters"),
  description: z.string().optional(),
  repositoryUrl: z
    .string()
    .url("Please enter a valid URL")
    .optional()
    .or(z.literal("")),
  documentationUrl: z
    .string()
    .url("Please enter a valid URL")
    .optional()
    .or(z.literal("")),
  productManagerId: z.string().optional(),
  techLeadId: z.string().optional(),
});

type ProductFormValues = z.infer<typeof productFormSchema>;

interface ProductFormProps {
  product?: Product;
  employees: { id: string; name: string }[];
}

function toOptions(
  list: { id: string; name: string }[],
  blankLabel: string
): ComboboxOption[] {
  return [
    { value: "", label: blankLabel },
    ...list.map((e) => ({ value: e.id, label: e.name })),
  ];
}

export function ProductForm({ product, employees }: ProductFormProps) {
  const router = useRouter();
  const isEditing = Boolean(product);
  const [addProduct, { isLoading: isCreating }] = useAddProductMutation();
  const [updateProduct, { isLoading: isUpdating }] = useUpdateProductMutation();
  const isSubmitting = isCreating || isUpdating;

  const form = useForm<ProductFormValues>({
    resolver: zodResolver(productFormSchema),
    defaultValues: {
      name: product?.name || "",
      description: product?.description || "",
      repositoryUrl: product?.repositoryUrl || "",
      documentationUrl: product?.documentationUrl || "",
      productManagerId: product?.productManager?.id || "",
      techLeadId: product?.techLead?.id || "",
    },
  });

  async function onSubmit(data: ProductFormValues) {
    try {
      if (isEditing && product) {
        await updateProduct({ id: product.id, product: data }).unwrap();
        toast.success("Product updated successfully");
      } else {
        const result = await addProduct(data).unwrap();
        toast.success("Product created successfully");
        if (result?.id) router.push(`/dashboard/products/${result.id}`);
        else router.push("/dashboard/products");
      }
    } catch (error: any) {
      console.error("Failed to save product:", error);
      toast.error(
        `Failed to save product: ${error.data?.error || error.message}`
      );
    }
  }

  const managerOptions = toOptions(employees, "Unassigned");
  const leadOptions = toOptions(employees, "Unassigned");

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
        <div className="space-y-4">
          <FormField
            control={form.control}
            name="name"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Product Name</FormLabel>
                <FormControl>
                  <Input placeholder="My Product" {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="description"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Description</FormLabel>
                <FormControl>
                  <Textarea placeholder="Short description" {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="repositoryUrl"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Repository URL</FormLabel>
                <FormControl>
                  <Input placeholder="https://github.com/..." {...field} />
                </FormControl>
                <FormDescription>Include https://</FormDescription>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="documentationUrl"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Documentation URL</FormLabel>
                <FormControl>
                  <Input placeholder="https://docs..." {...field} />
                </FormControl>
                <FormDescription>Include https://</FormDescription>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="productManagerId"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Product Manager</FormLabel>
                <FormControl>
                  <Combobox
                    options={managerOptions}
                    value={field.value ?? ""}
                    onValueChange={field.onChange}
                    placeholder="Select a manager"
                    emptyMessage="No employees"
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="techLeadId"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Tech Lead</FormLabel>
                <FormControl>
                  <Combobox
                    options={leadOptions}
                    value={field.value ?? ""}
                    onValueChange={field.onChange}
                    placeholder="Select a tech lead"
                    emptyMessage="No employees"
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>

        <div className="flex justify-end">
          <Button
            type="button"
            variant="outline"
            onClick={() => router.back()}
            disabled={isSubmitting}
            className="mr-2"
          >
            Cancel
          </Button>
          <Button type="submit" disabled={isSubmitting}>
            <Save className="mr-2 h-4 w-4" />
            {isSubmitting
              ? "Saving..."
              : isEditing
              ? "Save Product"
              : "Create Product"}
          </Button>
        </div>
      </form>
    </Form>
  );
}
