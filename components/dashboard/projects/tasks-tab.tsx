"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Plus, LayoutGrid, List, Filter, Calendar } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Spinner } from "@/components/ui/spinner";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuCheckboxItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

import { TaskBoard } from "./task-board";
import { TaskList } from "./task-list";
import { TaskCalendar } from "./task-calendar";
import {
  useGetTasksQuery,
  useUpdateTaskMutation,
  Task,
} from "@/lib/redux/projectsApi";

type TasksTabProps = {
  projectId: string;
};

export function TasksTab({ projectId }: TasksTabProps) {
  const router = useRouter();
  const [view, setView] = useState("board");
  const [filters, setFilters] = useState({
    status: ["todo", "in_progress", "review", "done"],
    priority: [1, 2, 3],
  });

  const {
    data: tasksData,
    isLoading,
    isError,
    error: fetchError,
  } = useGetTasksQuery(projectId);

  const [updateTask] = useUpdateTaskMutation();

  const tasks = tasksData?.data || [];
  const error = isError
    ? (fetchError as any)?.data?.error || "Failed to load tasks"
    : null;

  const handleTaskMove = async (taskId: string, newStatus: string) => {
    try {
      const validStatus = newStatus as
        | "todo"
        | "in_progress"
        | "review"
        | "done";
      const taskUpdate = { status: validStatus };

      await updateTask({
        projectId,
        taskId,
        task: taskUpdate,
      }).unwrap();

      toast.success("Task updated");
    } catch (error) {
      toast.error("Failed to update task");
      throw error;
    }
  };

  const filteredTasks = tasks.filter(
    (task: Task) =>
      filters.status.includes(task.status) &&
      filters.priority.includes(task.priority)
  );

  const toggleFilter = (type: "status" | "priority", value: any) => {
    setFilters((prev) => {
      const currentValues = [...prev[type]];

      if (currentValues.includes(value)) {
        if (currentValues.length === 1) return prev;
        return {
          ...prev,
          [type]: currentValues.filter((v) => v !== value),
        };
      } else {
        return {
          ...prev,
          [type]: [...currentValues, value],
        };
      }
    });
  };

  if (isLoading) {
    return (
      <div className="flex justify-center items-center h-[300px]">
        <Spinner />
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-destructive/10 border border-destructive text-destructive px-4 py-3 rounded-md">
        <p>Error: {error}</p>
        <Button
          variant="outline"
          size="sm"
          className="mt-2"
          onClick={() => router.refresh()}
        >
          Try Again
        </Button>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <Button asChild>
          <Link href={`/dashboard/projects/${projectId}/tasks/new`}>
            <Plus className="h-4 w-4 mr-2" />
            Add Task
          </Link>
        </Button>

        <div className="flex items-center space-x-2">
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline" size="sm">
                <Filter className="h-4 w-4 mr-2" />
                Filter
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-[200px]">
              <div className="p-2">
                <p className="text-xs font-medium mb-1">Status</p>
                <DropdownMenuCheckboxItem
                  checked={filters.status.includes("todo")}
                  onCheckedChange={() => toggleFilter("status", "todo")}
                >
                  To Do
                </DropdownMenuCheckboxItem>
                <DropdownMenuCheckboxItem
                  checked={filters.status.includes("in_progress")}
                  onCheckedChange={() => toggleFilter("status", "in_progress")}
                >
                  In Progress
                </DropdownMenuCheckboxItem>
                <DropdownMenuCheckboxItem
                  checked={filters.status.includes("review")}
                  onCheckedChange={() => toggleFilter("status", "review")}
                >
                  Review
                </DropdownMenuCheckboxItem>
                <DropdownMenuCheckboxItem
                  checked={filters.status.includes("done")}
                  onCheckedChange={() => toggleFilter("status", "done")}
                >
                  Done
                </DropdownMenuCheckboxItem>
              </div>
              <div className="p-2 border-t">
                <p className="text-xs font-medium mb-1">Priority</p>
                <DropdownMenuCheckboxItem
                  checked={filters.priority.includes(1)}
                  onCheckedChange={() => toggleFilter("priority", 1)}
                >
                  Low
                </DropdownMenuCheckboxItem>
                <DropdownMenuCheckboxItem
                  checked={filters.priority.includes(2)}
                  onCheckedChange={() => toggleFilter("priority", 2)}
                >
                  Medium
                </DropdownMenuCheckboxItem>
                <DropdownMenuCheckboxItem
                  checked={filters.priority.includes(3)}
                  onCheckedChange={() => toggleFilter("priority", 3)}
                >
                  High
                </DropdownMenuCheckboxItem>
              </div>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>

      <Tabs
        defaultValue="board"
        value={view}
        onValueChange={setView}
        className="w-full"
      >
        <div className="flex justify-between items-center mb-4">
          <TabsList>
            <TabsTrigger value="board" className="flex items-center">
              <LayoutGrid className="h-4 w-4 mr-2" />
              Board
            </TabsTrigger>
            <TabsTrigger value="list" className="flex items-center">
              <List className="h-4 w-4 mr-2" />
              List
            </TabsTrigger>
            <TabsTrigger value="calendar" className="flex items-center">
              <Calendar className="h-4 w-4 mr-2" />
              Calendar
            </TabsTrigger>
          </TabsList>
        </div>

        <TabsContent value="board" className="mt-0">
          <TaskBoard
            projectId={projectId}
            initialTasks={filteredTasks}
            onTaskMove={handleTaskMove}
          />
        </TabsContent>

        <TabsContent value="list" className="mt-0">
          <TaskList
            projectId={projectId}
            tasks={filteredTasks}
            onStatusChange={handleTaskMove}
          />
        </TabsContent>

        <TabsContent value="calendar" className="mt-0">
          <TaskCalendar projectId={projectId} tasks={filteredTasks} />
        </TabsContent>
      </Tabs>
    </div>
  );
}
