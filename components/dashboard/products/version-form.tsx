"use client";

import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Combobox, ComboboxOption } from "@/components/ui/combobox";
import {
  useAddVersionMutation,
  useGetVersionsByProductIdQuery,
} from "@/lib/redux/productVersionsApi";
import { CreateProductVersionRequest } from "@/lib/types/productVersions";

const versionFormSchema = z.object({
  versionNumber: z.string().min(1, "Required"),
  status: z.enum(["development", "qa", "production", "deprecated"]),
  releaseDate: z.string().optional(),
  releaseNotes: z.string().optional(),
});

type VersionFormValues = z.infer<typeof versionFormSchema>;

const statusOptions: ComboboxOption[] = [
  { value: "development", label: "Development" },
  { value: "qa", label: "QA" },
  { value: "production", label: "Production" },
  { value: "deprecated", label: "Deprecated" },
];

interface VersionFormProps {
  productId: string;
}

export function VersionForm({ productId }: VersionFormProps) {
  const [addVersion, { isLoading }] = useAddVersionMutation();
  const form = useForm<VersionFormValues>({
    resolver: zodResolver(versionFormSchema),
    defaultValues: {
      versionNumber: "",
      status: "development",
      releaseDate: "",
      releaseNotes: "",
    },
  });

  async function onSubmit(values: VersionFormValues) {
    try {
      await addVersion({ ...values, productId }).unwrap();
      toast.success("Version added");
    } catch (e: any) {
      toast.error(`Failed to add version: ${e.data?.error || e.message}`);
    }
  }

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
        <div className="grid grid-cols-3 gap-4">
          <FormField
            control={form.control}
            name="versionNumber"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Version</FormLabel>
                <FormControl>
                  <Input placeholder="v1.0.0" {...field} />
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
                <FormControl>
                  <Combobox
                    options={statusOptions}
                    value={field.value}
                    onValueChange={field.onChange}
                    placeholder="Select status"
                    emptyMessage="No status found"
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
          <FormField
            control={form.control}
            name="releaseDate"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Release Date</FormLabel>
                <FormControl>
                  <Input type="date" {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>
        <FormField
          control={form.control}
          name="releaseNotes"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Notes</FormLabel>
              <FormControl>
                <Textarea placeholder="Release notes" {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        <Button type="submit" disabled={isLoading} className="mt-2">
          Add Version
        </Button>
      </form>
    </Form>
  );
}
