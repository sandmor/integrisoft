"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { format } from "date-fns";
import { CalendarIcon, Loader2 } from "lucide-react";
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Combobox, ComboboxOption } from "@/components/ui/combobox";
import { Calendar } from "@/components/ui/calendar";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";

// Schema for form validation
const teamMemberSchema = z.object({
  employeeId: z.string().min(1, "Employee is required"),
  role: z.string().min(1, "Role is required"),
  allocationPercentage: z.coerce
    .number()
    .min(1, "Must be at least 1%")
    .max(100, "Cannot exceed 100%"),
  startDate: z.date({ required_error: "Start date is required" }),
  endDate: z.date().nullable().optional(),
});

// Define the type for form values
type TeamMemberFormValues = z.infer<typeof teamMemberSchema>;

type Employee = {
  id: string;
  name: string;
};

type TeamMemberFormProps = {
  projectId: string;
  teamMemberId?: string;
  onClose: () => void;
  employees: Employee[];
  onSuccess: () => void;
};

// Helper function to convert employees to ComboboxOption format
function employeesToOptions(employees: Employee[]): ComboboxOption[] {
  return employees.map((employee) => ({
    value: employee.id,
    label: employee.name,
  }));
}

export function TeamMemberForm({
  projectId,
  teamMemberId,
  employees,
  onClose,
  onSuccess,
}: TeamMemberFormProps) {
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(false);
  const [isFetching, setIsFetching] = useState(!!teamMemberId);

  // Initialize the form with default values
  const form = useForm<TeamMemberFormValues>({
    resolver: zodResolver(teamMemberSchema),
    defaultValues: {
      employeeId: "",
      role: "",
      allocationPercentage: 100,
      startDate: new Date(),
      endDate: null,
    },
  });

  // If editing, fetch the existing team member data
  useEffect(() => {
    if (teamMemberId) {
      const fetchTeamMember = async () => {
        try {
          setIsFetching(true);
          const response = await fetch(
            `/api/projects/${projectId}/team-members/${teamMemberId}`
          );
          if (response.ok) {
            const data = await response.json();
            // Format dates for the form
            form.reset({
              employeeId: data.employeeId,
              role: data.role,
              allocationPercentage: data.allocationPercentage,
              startDate: data.startDate ? new Date(data.startDate) : new Date(),
              endDate: data.endDate ? new Date(data.endDate) : null,
            });
          } else {
            toast.error("Failed to load team member data");
            onClose();
          }
        } catch (error) {
          console.error("Error fetching team member:", error);
          toast.error("Failed to load team member data");
          onClose();
        } finally {
          setIsFetching(false);
        }
      };

      fetchTeamMember();
    }
  }, [teamMemberId, projectId, form, onClose]);

  // Common project roles for team members
  const roles = [
    "Developer",
    "Senior Developer",
    "UI/UX Designer",
    "QA Engineer",
    "DevOps Engineer",
    "Business Analyst",
    "Database Administrator",
    "Technical Writer",
    "Product Owner",
    "Scrum Master",
    "UX Researcher",
    "Frontend Developer",
    "Backend Developer",
    "Full Stack Developer",
    "Mobile Developer",
    "Data Scientist",
    "Security Specialist",
    "Performance Engineer",
    "Project Manager",
    "Technical Lead",
    "Team Lead",
  ];

  const onSubmit = async (values: TeamMemberFormValues) => {
    try {
      setIsLoading(true);

      const url = teamMemberId
        ? `/api/projects/${projectId}/team-members/${teamMemberId}`
        : `/api/projects/${projectId}/team-members`;

      const method = teamMemberId ? "PATCH" : "POST";

      const response = await fetch(url, {
        method,
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(values),
      });

      if (response.ok) {
        toast.success(
          teamMemberId
            ? "Team member updated successfully"
            : "Team member added successfully"
        );
        // Refresh the page data
        router.refresh();
        onSuccess();
      } else {
        const error = await response.json();
        toast.error(error.error || "Failed to save team member");
      }
    } catch (error) {
      console.error("Error saving team member:", error);
      toast.error("Failed to save team member");
    } finally {
      setIsLoading(false);
    }
  };

  if (isFetching) {
    return (
      <div className="flex justify-center items-center p-6">
        <Loader2 className="h-6 w-6 animate-spin" />
      </div>
    );
  }

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
        {/* Employee Selection */}
        <FormField
          control={form.control}
          name="employeeId"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Employee</FormLabel>
              <FormControl>
                <Combobox
                  options={employeesToOptions(employees)}
                  value={field.value}
                  onValueChange={field.onChange}
                  placeholder="Select an employee"
                  emptyMessage="No employees found"
                  disabled={isLoading || !!teamMemberId}
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        {/* Role Selection */}
        <FormField
          control={form.control}
          name="role"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Role</FormLabel>
              <Select
                disabled={isLoading}
                onValueChange={field.onChange}
                defaultValue={field.value}
              >
                <FormControl>
                  <SelectTrigger>
                    <SelectValue placeholder="Select a role" />
                  </SelectTrigger>
                </FormControl>
                <SelectContent>
                  {roles.map((role) => (
                    <SelectItem key={role} value={role}>
                      {role}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <FormMessage />
            </FormItem>
          )}
        />

        {/* Allocation Percentage */}
        <FormField
          control={form.control}
          name="allocationPercentage"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Allocation Percentage</FormLabel>
              <FormControl>
                <Input
                  type="number"
                  min={1}
                  max={100}
                  placeholder="100"
                  disabled={isLoading}
                  {...field}
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        {/* Start Date */}
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
                      variant={"outline"}
                      className={`w-full pl-3 text-left font-normal ${
                        !field.value && "text-muted-foreground"
                      }`}
                      disabled={isLoading}
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
                    initialFocus
                  />
                </PopoverContent>
              </Popover>
              <FormMessage />
            </FormItem>
          )}
        />

        {/* End Date */}
        <FormField
          control={form.control}
          name="endDate"
          render={({ field }) => (
            <FormItem className="flex flex-col">
              <FormLabel>End Date (Optional)</FormLabel>
              <Popover>
                <PopoverTrigger asChild>
                  <FormControl>
                    <Button
                      variant={"outline"}
                      className={`w-full pl-3 text-left font-normal ${
                        !field.value && "text-muted-foreground"
                      }`}
                      disabled={isLoading}
                    >
                      {field.value ? (
                        format(field.value, "PPP")
                      ) : (
                        <span>No end date</span>
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
                    initialFocus
                    disabled={(date) => {
                      // Disable dates before the start date
                      const startDate = form.getValues("startDate");
                      return startDate && date < startDate;
                    }}
                  />
                </PopoverContent>
              </Popover>
              <FormMessage />
            </FormItem>
          )}
        />

        {/* Form Actions */}
        <div className="flex justify-end space-x-2">
          <Button
            type="button"
            variant="outline"
            onClick={onClose}
            disabled={isLoading}
          >
            Cancel
          </Button>
          <Button type="submit" disabled={isLoading}>
            {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            {teamMemberId ? "Update" : "Add"} Team Member
          </Button>
        </div>
      </form>
    </Form>
  );
}
