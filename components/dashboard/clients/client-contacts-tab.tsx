"use client";

import { useState } from "react";
import { Mail, Phone, Plus, Trash, User } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Spinner } from "@/components/ui/spinner";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { api } from "@/lib/redux/api";

const clientContactsApi = api.injectEndpoints({
  endpoints: (build) => ({
    getClientContacts: build.query({
      query: (clientId) => `/clients/${clientId}/contacts`,
      providesTags: (result: ClientContact[] | undefined, error, clientId) =>
        result
          ? [
              ...result.map(({ id }) => ({ type: "Clients" as const, id })),
              { type: "Clients", id: clientId },
            ]
          : [{ type: "Clients", id: clientId }],
    }),
    addContact: build.mutation({
      query: ({ clientId, ...data }) => ({
        url: `/clients/${clientId}/contacts`,
        method: "POST",
        body: data,
      }),
      invalidatesTags: (result, error, { clientId }) => [
        { type: "Clients", id: clientId },
      ],
    }),
    deleteContact: build.mutation({
      query: ({ contactId }) => ({
        url: `/contacts/${contactId}`,
        method: "DELETE",
      }),
      invalidatesTags: (result, error, { clientId }) => [
        { type: "Clients", id: clientId },
      ],
    }),
  }),
});

export const {
  useGetClientContactsQuery,
  useAddContactMutation,
  useDeleteContactMutation,
} = clientContactsApi;

type ClientContact = {
  id: string;
  firstName: string;
  lastName: string;
  position: string | null;
  email: string | null;
  phone: string | null;
  isPrimary: boolean;
};

interface ClientContactsTabProps {
  clientId: string;
  contacts: ClientContact[];
}

const contactFormSchema = z.object({
  firstName: z.string().min(2, "First name must be at least 2 characters"),
  lastName: z.string().min(2, "Last name must be at least 2 characters"),
  position: z.string().optional(),
  email: z.string().email("Invalid email address").optional().or(z.literal("")),
  phone: z.string().optional(),
  isPrimary: z.boolean(),
});

type ContactFormValues = z.infer<typeof contactFormSchema>;

export function ClientContactsTab({
  clientId,
  contacts: initialContacts,
}: ClientContactsTabProps) {
  const [isAddingContact, setIsAddingContact] = useState(false);

  const { data: reduxContacts, isLoading } = useGetClientContactsQuery(
    clientId,
    {
      skip: initialContacts.length > 0,
    }
  );

  const [addContact, { isLoading: isAddingContactLoading }] =
    useAddContactMutation();
  const [deleteContact, { isLoading: isDeletingContact }] =
    useDeleteContactMutation();

  const contacts = reduxContacts || initialContacts;

  const form = useForm<ContactFormValues>({
    resolver: zodResolver(contactFormSchema),
    defaultValues: {
      firstName: "",
      lastName: "",
      position: "",
      email: "",
      phone: "",
      isPrimary: false,
    },
  });

  async function onSubmit(data: ContactFormValues) {
    try {
      await addContact({ clientId, ...data }).unwrap();
      toast.success("Contact added successfully");
      form.reset();
      setIsAddingContact(false);
    } catch (error) {
      console.error("Failed to add contact:", error);
      toast.error("Failed to add contact. Please try again.");
    }
  }

  async function handleDeleteContact(contactId: string) {
    try {
      await deleteContact({ contactId, clientId }).unwrap();
      toast.success("Contact deleted successfully");
    } catch (error) {
      console.error("Failed to delete contact:", error);
      toast.error("Failed to delete contact. Please try again.");
    }
  }

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <h3 className="text-lg font-medium">Client Contacts</h3>
        <Dialog open={isAddingContact} onOpenChange={setIsAddingContact}>
          <DialogTrigger asChild>
            <Button size="sm">
              <Plus className="mr-2 h-4 w-4" />
              Add Contact
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Add Contact</DialogTitle>
              <DialogDescription>
                Add a new contact for this client.
              </DialogDescription>
            </DialogHeader>
            <Form {...form}>
              <form
                onSubmit={form.handleSubmit(onSubmit)}
                className="space-y-4"
              >
                <div className="grid grid-cols-2 gap-4">
                  <FormField
                    control={form.control}
                    name="firstName"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>First Name</FormLabel>
                        <FormControl>
                          <Input placeholder="John" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="lastName"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Last Name</FormLabel>
                        <FormControl>
                          <Input placeholder="Doe" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>
                <FormField
                  control={form.control}
                  name="position"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Position</FormLabel>
                      <FormControl>
                        <Input placeholder="CEO" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="email"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Email</FormLabel>
                      <FormControl>
                        <Input placeholder="john.doe@example.com" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="phone"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Phone</FormLabel>
                      <FormControl>
                        <Input placeholder="+1 (555) 123-4567" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <DialogFooter>
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => setIsAddingContact(false)}
                    disabled={isAddingContactLoading}
                  >
                    Cancel
                  </Button>
                  <Button type="submit" disabled={isAddingContactLoading}>
                    {isAddingContactLoading ? "Adding..." : "Add Contact"}
                  </Button>
                </DialogFooter>
              </form>
            </Form>
          </DialogContent>
        </Dialog>
      </div>

      {isLoading ? (
        <div className="flex justify-center items-center py-12">
          <Spinner />
          <span className="ml-3">Loading contacts...</span>
        </div>
      ) : contacts.length === 0 ? (
        <Card>
          <CardContent className="p-6 text-center text-muted-foreground">
            No contacts added yet. Add a contact to get started.
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {contacts.map((contact) => (
            <Card key={contact.id}>
              <CardHeader className="pb-2">
                <div className="flex justify-between items-start">
                  <CardTitle className="text-base flex items-center">
                    <User className="mr-2 h-4 w-4" />
                    {contact.firstName} {contact.lastName}
                    {contact.isPrimary && (
                      <span className="ml-2 text-xs bg-blue-100 text-blue-800 px-2 py-0.5 rounded-full">
                        Primary
                      </span>
                    )}
                  </CardTitle>
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => handleDeleteContact(contact.id)}
                    className="h-8 w-8 text-muted-foreground hover:text-destructive"
                    disabled={isDeletingContact}
                  >
                    <Trash className="h-4 w-4" />
                  </Button>
                </div>
                {contact.position && (
                  <p className="text-sm text-muted-foreground mt-1">
                    {contact.position}
                  </p>
                )}
              </CardHeader>
              <CardContent className="text-sm space-y-1 pt-0">
                {contact.email && (
                  <div className="flex items-center">
                    <Mail className="mr-2 h-4 w-4 text-muted-foreground" />
                    <a
                      href={`mailto:${contact.email}`}
                      className="text-blue-600 hover:underline"
                    >
                      {contact.email}
                    </a>
                  </div>
                )}
                {contact.phone && (
                  <div className="flex items-center">
                    <Phone className="mr-2 h-4 w-4 text-muted-foreground" />
                    <a
                      href={`tel:${contact.phone}`}
                      className="text-blue-600 hover:underline"
                    >
                      {contact.phone}
                    </a>
                  </div>
                )}
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
