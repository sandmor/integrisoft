"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { toast } from "sonner";
import { zodResolver } from "@hookform/resolvers/zod";
import { format } from "date-fns";
import { CalendarIcon } from "lucide-react";
import * as z from "zod";

import { cn } from "@/lib/utils";
import {
  useGetMilestonesQuery,
  useGetTeamMembersQuery,
  useCreateTaskMutation,
  useUpdateTaskMutation,
} from "@/lib/redux/projectsApi";
import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Skeleton } from "@/components/ui/skeleton";
import { Spinner } from "@/components/ui/spinner";

const taskFormSchema = z.object({
  title: z.string().min(1, "Title is required").max(200, "Title is too long"),
  description: z.string().optional(),
  status: z.enum(["todo", "in_progress", "review", "done"]),
  priority: z.coerce.number().min(1).max(3),
  milestoneId: z.string().optional().nullable(),
  assignedToId: z.string().optional().nullable(),
  dueDate: z.date().optional().nullable(),
  startDate: z.date().optional().nullable(),
  estimatedHours: z.coerce.number().optional().nullable(),
});

type TaskFormValues = z.infer<typeof taskFormSchema>;

type Employee = {
  id: string;
  name: string;
};

type Milestone = {
  id: string;
  name: string;
};

type TaskFormProps = {
  projectId: string;
  task?: {
    id: string;
    title: string;
    description?: string;
    status: string;
    priority: number;
    milestoneId?: string;
    assignedToId?: string;
    dueDate?: string;
    startDate?: string;
    estimatedHours?: number;
    actualHours?: number;
    completedDate?: string;
  };
  defaultValues?: Partial<TaskFormValues>;
  isEdit?: boolean;
};

export function TaskForm({
  projectId,
  task,
  defaultValues = {},
  isEdit = false,
}: TaskFormProps) {
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(false);

  // Fetch milestones and team members data
  const { data: milestones = [], isLoading: isMilestonesLoading } =
    useGetMilestonesQuery(projectId);

  const { data: teamMembersData = [], isLoading: isTeamMembersLoading } =
    useGetTeamMembersQuery(projectId);

  // Setup mutation hooks for create/update
  const [createTask] = useCreateTaskMutation();
  const [updateTask] = useUpdateTaskMutation();

  // Transform team members data
  const teamMembers = teamMembersData.map((member: any) => ({
    id: member.employeeId,
    name: member.employee?.name || "Unknown",
  }));

  const isFetchingData = isMilestonesLoading || isTeamMembersLoading;

  // Create form with default values
  const form = useForm<TaskFormValues>({
    resolver: zodResolver(taskFormSchema),
    defaultValues: {
      title: task?.title || defaultValues.title || "",
      description: task?.description || defaultValues.description || "",
      status: (task?.status as any) || defaultValues.status || "todo",
      priority: task?.priority || defaultValues.priority || 2,
      milestoneId: task?.milestoneId || defaultValues.milestoneId || null,
      assignedToId: task?.assignedToId || defaultValues.assignedToId || null,
      dueDate: task?.dueDate
        ? new Date(task.dueDate)
        : defaultValues.dueDate || null,
      startDate: task?.startDate
        ? new Date(task.startDate)
        : defaultValues.startDate || null,
      estimatedHours:
        task?.estimatedHours || defaultValues.estimatedHours || null,
    },
  });

  const onSubmit = async (values: TaskFormValues) => {
    setIsLoading(true);

    try {
      const formattedValues = {
        ...values,
        priority: (values.priority ?? 2) as 1 | 2 | 3,
        startDate: values.startDate
          ? values.startDate.toISOString()
          : values.startDate,
        dueDate: values.dueDate ? values.dueDate.toISOString() : values.dueDate,
        estimatedHours: values.estimatedHours
          ? values.estimatedHours.toString()
          : null,
      };

      if (isEdit && task) {
        // Update existing task
        await updateTask({
          projectId,
          taskId: task.id,
          task: formattedValues,
        }).unwrap();

        toast.success("Task updated successfully");
        router.push(`/dashboard/projects/${projectId}/tasks/${task.id}`);
      } else {
        // Create new task
        const response = await createTask({
          projectId,
          task: formattedValues,
        }).unwrap();

        toast.success("Task created successfully");
        router.push(`/dashboard/projects/${projectId}/tasks/${response.id}`);
      }

      router.refresh();
    } catch (error) {
      console.error("Error submitting form:", error);
      toast.error(
        error instanceof Error ? error.message : "Something went wrong"
      );
    } finally {
      setIsLoading(false);
    }
  };

  const handleReset = () => form.reset();
  const handleCancel = () => router.back();

  // Render form skeleton while loading data
  if (isFetchingData) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-8 w-full max-w-sm" />
        <Skeleton className="h-20 w-full" />
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <Skeleton className="h-10 w-full" />
          <Skeleton className="h-10 w-full" />
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <Skeleton className="h-10 w-full" />
          <Skeleton className="h-10 w-full" />
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <Skeleton className="h-10 w-full" />
          <Skeleton className="h-10 w-full" />
        </div>
        <div className="flex space-x-2">
          <Skeleton className="h-10 w-20" />
          <Skeleton className="h-10 w-20" />
        </div>
      </div>
    );
  }

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
        <FormField
          control={form.control}
          name="title"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Task Title</FormLabel>
              <FormControl>
                <Input placeholder="Enter task title" {...field} />
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
                <Textarea
                  placeholder="Enter task description"
                  className="min-h-[120px]"
                  {...field}
                  value={field.value || ""}
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <FormField
            control={form.control}
            name="status"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Status</FormLabel>
                <Select
                  onValueChange={field.onChange}
                  defaultValue={field.value}
                >
                  <FormControl>
                    <SelectTrigger>
                      <SelectValue placeholder="Select status" />
                    </SelectTrigger>
                  </FormControl>
                  <SelectContent>
                    <SelectItem value="todo">To Do</SelectItem>
                    <SelectItem value="in_progress">In Progress</SelectItem>
                    <SelectItem value="review">Review</SelectItem>
                    <SelectItem value="done">Done</SelectItem>
                  </SelectContent>
                </Select>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="priority"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Priority</FormLabel>
                <Select
                  onValueChange={(value) => field.onChange(parseInt(value))}
                  defaultValue={field.value?.toString()}
                >
                  <FormControl>
                    <SelectTrigger>
                      <SelectValue placeholder="Select priority" />
                    </SelectTrigger>
                  </FormControl>
                  <SelectContent>
                    <SelectItem value="1">Low</SelectItem>
                    <SelectItem value="2">Medium</SelectItem>
                    <SelectItem value="3">High</SelectItem>
                  </SelectContent>
                </Select>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <FormField
            control={form.control}
            name="milestoneId"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Milestone</FormLabel>
                <Select
                  onValueChange={field.onChange}
                  defaultValue={field.value || ""}
                >
                  <FormControl>
                    <SelectTrigger>
                      <SelectValue placeholder="Select milestone" />
                    </SelectTrigger>
                  </FormControl>
                  <SelectContent>
                    <SelectItem value="">None</SelectItem>
                    {milestones.map((milestone) => (
                      <SelectItem key={milestone.id} value={milestone.id}>
                        {milestone.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="assignedToId"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Assigned To</FormLabel>
                <Select
                  onValueChange={field.onChange}
                  defaultValue={field.value || ""}
                >
                  <FormControl>
                    <SelectTrigger>
                      <SelectValue placeholder="Select assignee" />
                    </SelectTrigger>
                  </FormControl>
                  <SelectContent>
                    <SelectItem value="">Unassigned</SelectItem>
                    {teamMembers.map((member) => (
                      <SelectItem key={member.id} value={member.id}>
                        {member.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <FormField
            control={form.control}
            name="startDate"
            render={({ field }) => (
              <FormItem className="flex flex-col">
                <FormLabel>Start Date</FormLabel>
                <Popover>
                  <PopoverTrigger asChild>
                    <FormControl>
                      <Button
                        variant="outline"
                        className={cn(
                          "pl-3 text-left font-normal",
                          !field.value && "text-muted-foreground"
                        )}
                      >
                        {field.value ? (
                          format(field.value, "PPP")
                        ) : (
                          <span>Pick a date</span>
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
                      disabled={(date) => date < new Date("1900-01-01")}
                      initialFocus
                    />
                  </PopoverContent>
                </Popover>
                <FormMessage />
              </FormItem>
            )}
          />

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
                        variant="outline"
                        className={cn(
                          "pl-3 text-left font-normal",
                          !field.value && "text-muted-foreground"
                        )}
                      >
                        {field.value ? (
                          format(field.value, "PPP")
                        ) : (
                          <span>Pick a date</span>
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
                      disabled={(date) => date < new Date("1900-01-01")}
                      initialFocus
                    />
                  </PopoverContent>
                </Popover>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>

        <FormField
          control={form.control}
          name="estimatedHours"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Estimated Hours</FormLabel>
              <FormControl>
                <Input
                  type="number"
                  placeholder="Enter estimated hours"
                  {...field}
                  value={field.value === null ? "" : field.value}
                  onChange={(e) => {
                    const value =
                      e.target.value === "" ? null : parseFloat(e.target.value);
                    field.onChange(value);
                  }}
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <div className="flex justify-between">
          <div className="space-x-2">
            <Button type="button" variant="outline" onClick={handleCancel}>
              Cancel
            </Button>
            <Button type="button" variant="secondary" onClick={handleReset}>
              Reset
            </Button>
          </div>
          <Button type="submit" disabled={isLoading}>
            {isLoading && <Spinner className="mr-2 h-4 w-4" />}
            {isEdit ? "Update" : "Create"} Task
          </Button>
        </div>
      </form>
    </Form>
  );
}
