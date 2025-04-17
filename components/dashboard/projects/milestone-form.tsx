"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { z } from "zod";
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
import { Switch } from "@/components/ui/switch";
import { Calendar } from "@/components/ui/calendar";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { format } from "date-fns";
import { CalendarIcon } from "lucide-react";
import { cn } from "@/lib/utils";
import {
  useAddMilestoneMutation,
  useUpdateMilestoneMutation,
} from "@/lib/redux/projectsApi";
import { toast } from "sonner";

// Schema for milestone form validation
const milestoneSchema = z.object({
  name: z.string().min(1, "Milestone name is required"),
  description: z.string().optional(),
  dueDate: z.date({ required_error: "Due date is required" }),
  isCompleted: z.boolean(),
  completedDate: z.date().optional().nullable(),
});

type MilestoneFormValues = z.infer<typeof milestoneSchema>;

type MilestoneFormProps = {
  projectId: string;
  milestoneId?: string;
  defaultValues?: Partial<MilestoneFormValues>;
  onSuccess?: () => void;
};

export function MilestoneForm({
  projectId,
  milestoneId,
  defaultValues,
  onSuccess,
}: MilestoneFormProps) {
  const router = useRouter();

  const [addMilestone, { isLoading: isAddLoading, error: addError }] =
    useAddMilestoneMutation();
  const [updateMilestone, { isLoading: isUpdateLoading, error: updateError }] =
    useUpdateMilestoneMutation();

  const isLoading = isAddLoading || isUpdateLoading;
  const error = addError || updateError;

  const form = useForm<MilestoneFormValues>({
    resolver: zodResolver(milestoneSchema),
    defaultValues: defaultValues || {
      name: "",
      description: "",
      dueDate: new Date(),
      isCompleted: false,
      completedDate: null,
    },
  });

  const onSubmit = async (values: MilestoneFormValues) => {
    try {
      const milestone = {
        name: values.name,
        description: values.description ?? null,
        dueDate: values.dueDate,
        isCompleted: values.isCompleted,
        completedDate: values.completedDate ?? null,
      };

      if (milestoneId) {
        // Update existing milestone
        await updateMilestone({
          projectId,
          milestoneId,
          milestone: milestone,
        }).unwrap();
        toast.success("Milestone updated successfully");
      } else {
        // Create new milestone
        await addMilestone({
          projectId,
          milestone: milestone,
        }).unwrap();
        toast.success("Milestone created successfully");
      }

      if (onSuccess) {
        onSuccess();
      } else {
        // Otherwise, redirect back to the project detail page
        router.push(`/dashboard/projects/${projectId}`);
        router.refresh();
      }
    } catch (error) {
      console.error("Error saving milestone:", error);
      toast.error(
        error instanceof Error ? error.message : "Failed to save milestone"
      );
    }
  };

  // Watch for completion status to conditionally show completed date
  const isCompleted = form.watch("isCompleted");

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Milestone Name */}
          <div className="md:col-span-2">
            <FormField
              control={form.control}
              name="name"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Milestone Name</FormLabel>
                  <FormControl>
                    <Input placeholder="Enter milestone name" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
          </div>

          {/* Milestone Description */}
          <div className="md:col-span-2">
            <FormField
              control={form.control}
              name="description"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Description</FormLabel>
                  <FormControl>
                    <Textarea
                      placeholder="Enter milestone description"
                      className="resize-none min-h-[100px]"
                      {...field}
                      value={field.value || ""}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
          </div>

          {/* Due Date */}
          <FormField
            control={form.control}
            name="dueDate"
            render={({ field }) => (
              <FormItem className="flex flex-col">
                <FormLabel>Due Date</FormLabel>
                <Popover>
                  <PopoverTrigger asChild>
                    <FormControl>
                      <Button
                        variant={"outline"}
                        className={cn(
                          "w-full pl-3 text-left font-normal",
                          !field.value && "text-muted-foreground"
                        )}
                      >
                        {field.value ? (
                          format(field.value, "PPP")
                        ) : (
                          <span>Select due date</span>
                        )}
                        <CalendarIcon className="ml-auto h-4 w-4 opacity-50" />
                      </Button>
                    </FormControl>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0" align="start">
                    <Calendar
                      mode="single"
                      selected={field.value}
                      onSelect={field.onChange}
                      initialFocus
                    />
                  </PopoverContent>
                </Popover>
                <FormMessage />
              </FormItem>
            )}
          />

          {/* Completion Status */}
          <FormField
            control={form.control}
            name="isCompleted"
            render={({ field }) => (
              <FormItem className="flex flex-row items-center justify-between space-x-2 space-y-0 rounded-md border p-4">
                <div className="space-y-0.5">
                  <FormLabel className="text-base">Completed</FormLabel>
                  <FormMessage />
                </div>
                <FormControl>
                  <Switch
                    checked={field.value}
                    onCheckedChange={(checked) => {
                      field.onChange(checked);
                      if (checked) {
                        form.setValue("completedDate", new Date());
                      } else {
                        form.setValue("completedDate", null);
                      }
                    }}
                  />
                </FormControl>
              </FormItem>
            )}
          />

          {/* Completed Date (shown only when milestone is marked as completed) */}
          {isCompleted && (
            <FormField
              control={form.control}
              name="completedDate"
              render={({ field }) => (
                <FormItem className="flex flex-col">
                  <FormLabel>Completion Date</FormLabel>
                  <Popover>
                    <PopoverTrigger asChild>
                      <FormControl>
                        <Button
                          variant={"outline"}
                          className={cn(
                            "w-full pl-3 text-left font-normal",
                            !field.value && "text-muted-foreground"
                          )}
                        >
                          {field.value ? (
                            format(field.value, "PPP")
                          ) : (
                            <span>Select completion date</span>
                          )}
                          <CalendarIcon className="ml-auto h-4 w-4 opacity-50" />
                        </Button>
                      </FormControl>
                    </PopoverTrigger>
                    <PopoverContent className="w-auto p-0" align="start">
                      <Calendar
                        mode="single"
                        selected={field.value || undefined}
                        onSelect={field.onChange}
                        defaultMonth={field.value || new Date()}
                        initialFocus
                      />
                    </PopoverContent>
                  </Popover>
                  <FormMessage />
                </FormItem>
              )}
            />
          )}
        </div>

        {/* Error message display */}
        {error && (
          <div className="text-red-600 text-sm">
            {error instanceof Error ? error.message : "An error occurred"}
          </div>
        )}

        {/* Form Actions */}
        <div className="flex justify-end space-x-4">
          <Button
            type="button"
            variant="outline"
            onClick={() => router.back()}
            disabled={isLoading}
          >
            Cancel
          </Button>
          <Button type="submit" disabled={isLoading}>
            {isLoading ? (
              <>
                <span className="animate-spin mr-2">⋯</span>
                Saving...
              </>
            ) : (
              <>{milestoneId ? "Update" : "Create"} Milestone</>
            )}
          </Button>
        </div>
      </form>
    </Form>
  );
}
