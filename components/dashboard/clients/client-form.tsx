"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { toast } from "sonner";
import { Building2, Save } from "lucide-react";
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
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Combobox, ComboboxOption } from "@/components/ui/combobox";
import { createClient, updateClient } from "@/lib/actions/clients";

// Define the form schema with validation
const clientFormSchema = z.object({
  name: z.string().min(2, "Name must be at least 2 characters"),
  industry: z.string().optional(),
  website: z
    .string()
    .url("Please enter a valid URL")
    .optional()
    .or(z.literal("")),
  address: z.string().optional(),
  accountManagerId: z.string().optional(),
});

type ClientFormValues = z.infer<typeof clientFormSchema>;

interface ClientFormProps {
  client?: {
    id: string;
    name: string;
    industry: string | null;
    website: string | null;
    address: string | null;
    accountManagerId: string | null;
  };
  accountManagers: { id: string; name: string }[];
}

// Helper to convert account managers to combobox options
function managersToOptions(
  managers: { id: string; name: string }[]
): ComboboxOption[] {
  // Add an "Unassigned" option at the beginning
  return [
    { value: "", label: "Unassigned" },
    ...managers.map((manager) => ({
      value: manager.id,
      label: manager.name,
    })),
  ];
}

export function ClientForm({ client, accountManagers }: ClientFormProps) {
  const router = useRouter();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const isEditing = !!client;
  const accountManagerOptions = managersToOptions(accountManagers);

  // Initialize form with client data or defaults
  const form = useForm<ClientFormValues>({
    resolver: zodResolver(clientFormSchema),
    defaultValues: {
      name: client?.name || "",
      industry: client?.industry || "",
      website: client?.website || "",
      address: client?.address || "",
      accountManagerId: client?.accountManagerId || "",
    },
  });

  async function onSubmit(data: ClientFormValues) {
    setIsSubmitting(true);
    try {
      if (isEditing && client) {
        await updateClient(client.id, data);
        toast.success("Client updated successfully");
        router.push(`/dashboard/clients/${client.id}`);
      } else {
        const newClientId = await createClient(data);
        toast.success("Client created successfully");
        router.push(`/dashboard/clients/${newClientId}`);
      }
    } catch (error) {
      console.error("Failed to save client:", error);
      toast.error("Failed to save client. Please try again.");
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center">
              <Building2 className="mr-2 h-5 w-5" />
              {isEditing ? "Edit Client" : "New Client"}
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <FormField
              control={form.control}
              name="name"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Client Name</FormLabel>
                  <FormControl>
                    <Input placeholder="ACME Corporation" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="industry"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Industry</FormLabel>
                  <FormControl>
                    <Input
                      placeholder="e.g. Technology, Healthcare, Finance"
                      {...field}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="website"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Website</FormLabel>
                  <FormControl>
                    <Input placeholder="https://example.com" {...field} />
                  </FormControl>
                  <FormDescription>
                    Include the full URL (https://).
                  </FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="address"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Address</FormLabel>
                  <FormControl>
                    <Input
                      placeholder="123 Main St, City, Country"
                      {...field}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="accountManagerId"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Account Manager</FormLabel>
                  <FormControl>
                    <Combobox
                      options={accountManagerOptions}
                      value={field.value || ""}
                      onValueChange={field.onChange}
                      placeholder="Select an account manager"
                      emptyMessage="No account managers found."
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
          </CardContent>
        </Card>

        <div className="flex justify-end">
          <Button
            type="button"
            variant="outline"
            onClick={() => router.back()}
            className="mr-2"
            disabled={isSubmitting}
          >
            Cancel
          </Button>
          <Button type="submit" disabled={isSubmitting}>
            <Save className="mr-2 h-4 w-4" />
            {isSubmitting ? "Saving..." : "Save Client"}
          </Button>
        </div>
      </form>
    </Form>
  );
}
