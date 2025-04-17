"use client";

import { useState } from "react";
import { CalendarClock, MessageSquare, Plus, Trash, User } from "lucide-react";
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
import { Textarea } from "@/components/ui/textarea";
import { Combobox, ComboboxOption } from "@/components/ui/combobox";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { formatDate } from "@/lib/utils";
import { api } from "@/lib/redux/api";

const clientInteractionsApi = api.injectEndpoints({
  endpoints: (build) => ({
    getClientInteractions: build.query<ClientInteraction[], string>({
      query: (clientId) => `/clients/${clientId}/interactions`,
      providesTags: (result, error, clientId) =>
        result
          ? [
              ...result.map(({ id }) => ({
                type: "Clients" as const,
                id,
              })),
              { type: "Clients", id: clientId },
            ]
          : [{ type: "Clients", id: clientId }],
    }),
    addInteraction: build.mutation<
      ClientInteraction,
      { clientId: string; [key: string]: any }
    >({
      query: ({ clientId, ...data }) => ({
        url: `/clients/${clientId}/interactions`,
        method: "POST",
        body: data,
      }),
      invalidatesTags: (result, error, { clientId }) => [
        { type: "Clients", id: clientId },
      ],
    }),
    deleteInteraction: build.mutation<
      void,
      { interactionId: string; clientId: string }
    >({
      query: ({ interactionId }) => ({
        url: `/interactions/${interactionId}`,
        method: "DELETE",
      }),
      invalidatesTags: (result, error, { clientId }) => [
        { type: "Clients", id: clientId },
      ],
    }),
  }),
});

export const {
  useGetClientInteractionsQuery,
  useAddInteractionMutation,
  useDeleteInteractionMutation,
} = clientInteractionsApi;

type ClientContact = {
  id: string;
  firstName: string;
  lastName: string;
};

type ClientInteraction = {
  id: string;
  type: string;
  date: Date;
  summary: string;
  details: string | null;
  followUpDate: Date | null;
  followUpNotes: string | null;
  employee: { id: string | null; name: string | null } | null;
  contact: { id: string; firstName: string; lastName: string } | null;
};

interface ClientInteractionsTabProps {
  clientId: string;
  interactions: ClientInteraction[];
  contacts: ClientContact[];
}

const interactionFormSchema = z.object({
  contactId: z.string().optional(),
  type: z.string().min(1, "Interaction type is required"),
  summary: z.string().min(5, "Summary must be at least 5 characters"),
  details: z.string().optional(),
  followUpDate: z.string().optional(),
  followUpNotes: z.string().optional(),
});

type InteractionFormValues = z.infer<typeof interactionFormSchema>;

function contactsToOptions(contacts: ClientContact[]): ComboboxOption[] {
  return [
    { value: "", label: "No specific contact" },
    ...contacts.map((contact) => ({
      value: contact.id,
      label: `${contact.firstName} ${contact.lastName}`,
    })),
  ];
}

function interactionTypesToOptions(
  types: { value: string; label: string }[]
): ComboboxOption[] {
  return types.map((type) => ({
    value: type.value,
    label: type.label,
  }));
}

export function ClientInteractionsTab({
  clientId,
  interactions: initialInteractions,
  contacts,
}: ClientInteractionsTabProps) {
  const [isAddingInteraction, setIsAddingInteraction] = useState(false);
  const contactOptions = contactsToOptions(contacts);

  const { data: reduxInteractions, isLoading } = useGetClientInteractionsQuery(
    clientId,
    {
      skip: initialInteractions.length > 0,
    }
  );

  const [addInteraction, { isLoading: isAddingInteractionLoading }] =
    useAddInteractionMutation();
  const [deleteInteraction, { isLoading: isDeletingInteraction }] =
    useDeleteInteractionMutation();

  const interactions = reduxInteractions || initialInteractions;

  const interactionTypes = [
    { value: "meeting", label: "Meeting" },
    { value: "call", label: "Phone Call" },
    { value: "email", label: "Email" },
    { value: "site_visit", label: "Site Visit" },
    { value: "demo", label: "Product Demo" },
    { value: "support", label: "Support" },
    { value: "other", label: "Other" },
  ];

  const interactionTypeOptions = interactionTypesToOptions(interactionTypes);

  const form = useForm<InteractionFormValues>({
    resolver: zodResolver(interactionFormSchema),
    defaultValues: {
      contactId: "",
      type: "meeting",
      summary: "",
      details: "",
      followUpDate: "",
      followUpNotes: "",
    },
  });

  async function onSubmit(data: InteractionFormValues) {
    try {
      await addInteraction({ clientId, ...data }).unwrap();
      toast.success("Interaction added successfully");
      form.reset();
      setIsAddingInteraction(false);
    } catch (error) {
      console.error("Failed to add interaction:", error);
      toast.error("Failed to add interaction. Please try again.");
    }
  }

  async function handleDeleteInteraction(interactionId: string) {
    try {
      await deleteInteraction({ interactionId, clientId }).unwrap();
      toast.success("Interaction deleted successfully");
    } catch (error) {
      console.error("Failed to delete interaction:", error);
      toast.error("Failed to delete interaction. Please try again.");
    }
  }

  const formatType = (type: string) => {
    return type.charAt(0).toUpperCase() + type.slice(1);
  };

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <h3 className="text-lg font-medium">Client Interactions</h3>
        <Dialog
          open={isAddingInteraction}
          onOpenChange={setIsAddingInteraction}
        >
          <DialogTrigger asChild>
            <Button size="sm">
              <Plus className="mr-2 h-4 w-4" />
              Add Interaction
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Add Interaction</DialogTitle>
              <DialogDescription>
                Record a new interaction with this client.
              </DialogDescription>
            </DialogHeader>
            <Form {...form}>
              <form
                onSubmit={form.handleSubmit(onSubmit)}
                className="space-y-4"
              >
                <FormField
                  control={form.control}
                  name="contactId"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Contact</FormLabel>
                      <FormControl>
                        <Combobox
                          options={contactOptions}
                          value={field.value || ""}
                          onValueChange={field.onChange}
                          placeholder="Select a contact (optional)"
                          emptyMessage="No contacts found."
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="type"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Interaction Type</FormLabel>
                      <FormControl>
                        <Combobox
                          options={interactionTypeOptions}
                          value={field.value || ""}
                          onValueChange={field.onChange}
                          placeholder="Select interaction type"
                          emptyMessage="No interaction types found."
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="summary"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Summary</FormLabel>
                      <FormControl>
                        <Input
                          placeholder="Brief summary of the interaction"
                          {...field}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="details"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Details</FormLabel>
                      <FormControl>
                        <Textarea
                          placeholder="Detailed notes about the interaction"
                          className="min-h-24"
                          {...field}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="followUpDate"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Follow Up Date</FormLabel>
                      <FormControl>
                        <Input type="date" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="followUpNotes"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Follow Up Notes</FormLabel>
                      <FormControl>
                        <Textarea
                          placeholder="Notes for follow up"
                          className="min-h-20"
                          {...field}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <DialogFooter>
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => setIsAddingInteraction(false)}
                    disabled={isAddingInteractionLoading}
                  >
                    Cancel
                  </Button>
                  <Button type="submit" disabled={isAddingInteractionLoading}>
                    {isAddingInteractionLoading
                      ? "Adding..."
                      : "Add Interaction"}
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
          <span className="ml-3">Loading interactions...</span>
        </div>
      ) : interactions.length === 0 ? (
        <Card>
          <CardContent className="p-6 text-center text-muted-foreground">
            No interactions recorded yet. Add an interaction to start tracking
            client communications.
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-4">
          {interactions.map((interaction) => (
            <Card key={interaction.id}>
              <CardHeader className="pb-2">
                <div className="flex justify-between items-start">
                  <CardTitle className="text-base flex items-center">
                    <MessageSquare className="mr-2 h-4 w-4" />
                    {formatType(interaction.type)}
                    {interaction.followUpDate && (
                      <span className="ml-2 text-xs bg-amber-100 text-amber-800 px-2 py-0.5 rounded-full">
                        Follow-up: {formatDate(interaction.followUpDate)}
                      </span>
                    )}
                  </CardTitle>
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => handleDeleteInteraction(interaction.id)}
                    className="h-8 w-8 text-muted-foreground hover:text-destructive"
                    disabled={isDeletingInteraction}
                  >
                    <Trash className="h-4 w-4" />
                  </Button>
                </div>
                <div className="flex items-center text-sm text-muted-foreground">
                  <CalendarClock className="mr-1 h-3 w-3" />
                  {formatDate(interaction.date)}
                </div>
              </CardHeader>
              <CardContent className="space-y-2 pt-0">
                <p className="font-medium text-sm">{interaction.summary}</p>
                {interaction.details && (
                  <p className="text-sm text-muted-foreground">
                    {interaction.details}
                  </p>
                )}
                <div className="text-xs space-y-1 pt-2">
                  {interaction.contact && (
                    <div className="flex items-center">
                      <User className="mr-1 h-3 w-3 text-muted-foreground" />
                      <span>
                        Contact: {interaction.contact.firstName}{" "}
                        {interaction.contact.lastName}
                      </span>
                    </div>
                  )}
                  {interaction.employee && (
                    <div>Recorded by: {interaction.employee.name}</div>
                  )}
                  {interaction.followUpNotes && (
                    <div className="mt-2 pt-2 border-t">
                      <p className="font-medium">Follow-up Notes:</p>
                      <p>{interaction.followUpNotes}</p>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
