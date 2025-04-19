"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import {
  Plus,
  LayoutGrid,
  List,
  Filter,
  Calendar,
  Loader2,
} from "lucide-react";

import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Skeleton } from "@/components/ui/skeleton";
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
  const [isManuallyLoading, setIsManuallyLoading] = useState(false);

  const {
    data: tasksData,
    isLoading,
    isFetching,
    isError,
    error: fetchError,
    refetch,
  } = useGetTasksQuery({
    projectId,
    orderByStatus: view === "board",
  });

  const isTasksLoading = isLoading || isFetching || isManuallyLoading;
  const [updateTask] = useUpdateTaskMutation();

  const tasks = tasksData
    ? Array.isArray(tasksData.data)
      ? tasksData.data
      : Object.values(tasksData.data).flat()
    : [];

  const error = isError
    ? (fetchError as any)?.data?.error || "Failed to load tasks"
    : null;

  // Refetch when view changes to get the appropriate data format
  useEffect(() => {
    refetch();
  }, [view, refetch]);

  const handleTaskMove = async (
    taskId: string,
    newStatus: string,
    destinationIndex?: number
  ) => {
    if (isTasksLoading) {
      toast.error("Please wait until the current operation completes");
      return Promise.reject(new Error("Operation in progress"));
    }

    try {
      // Set manual loading state immediately to show spinner
      setIsManuallyLoading(true);

      const validStatus = newStatus as
        | "todo"
        | "in_progress"
        | "review"
        | "done";
      const taskUpdate = {
        status: validStatus,
        positionIndex:
          destinationIndex !== undefined ? destinationIndex : undefined,
      };

      await updateTask({
        projectId,
        taskId,
        task: taskUpdate,
      }).unwrap();

      toast.success("Task updated");
    } catch (error) {
      toast.error("Failed to update task");
      throw error;
    } finally {
      setIsManuallyLoading(false);
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
          {isLoading ? (
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              {[1, 2, 3, 4].map((i) => (
                <div
                  key={i}
                  className="rounded-md bg-muted/30 p-2 min-h-[500px]"
                >
                  <div className="flex items-center justify-between mb-2 px-1">
                    <Skeleton className="h-5 w-24" />
                    <Skeleton className="h-5 w-6" />
                  </div>
                  {[1, 2, 3].map((j) => (
                    <Skeleton key={j} className="h-28 w-full mb-2" />
                  ))}
                </div>
              ))}
            </div>
          ) : error ? (
            <div className="bg-destructive/10 border border-destructive text-destructive px-4 py-3 rounded-md">
              <p>Error: {error}</p>
              <Button
                variant="outline"
                size="sm"
                className="mt-2"
                onClick={() => refetch()}
              >
                Try Again
              </Button>
            </div>
          ) : (
            <div className="relative min-h-[500px]">
              {/* Improved overlay positioning */}
              {isTasksLoading && (
                <div className="absolute inset-0 bg-background/60 z-10 flex items-center justify-center">
                  <div className="bg-background shadow-lg rounded-md p-4 flex items-center gap-2">
                    <Loader2 className="h-5 w-5 animate-spin text-primary" />
                    <span>Refreshing tasks...</span>
                  </div>
                </div>
              )}
              <TaskBoard
                projectId={projectId}
                initialTasks={
                  !Array.isArray(tasksData?.data)
                    ? Object.entries(tasksData?.data || {}).flatMap(
                        ([status, statusTasks]) =>
                          filters.status.includes(status)
                            ? statusTasks.filter((task) =>
                                filters.priority.includes(task.priority)
                              )
                            : []
                      )
                    : filteredTasks
                }
                onTaskMove={handleTaskMove}
                isDisabled={isTasksLoading}
              />
            </div>
          )}
        </TabsContent>

        <TabsContent value="list" className="mt-0">
          {isLoading ? (
            <div className="space-y-2">
              <Skeleton className="h-10 w-full" />
              {[1, 2, 3, 4, 5].map((i) => (
                <Skeleton key={i} className="h-16 w-full" />
              ))}
            </div>
          ) : error ? (
            <div className="bg-destructive/10 border border-destructive text-destructive px-4 py-3 rounded-md">
              <p>Error: {error}</p>
              <Button
                variant="outline"
                size="sm"
                className="mt-2"
                onClick={() => refetch()}
              >
                Try Again
              </Button>
            </div>
          ) : (
            <TaskList
              projectId={projectId}
              tasks={filteredTasks}
              onStatusChange={handleTaskMove}
            />
          )}
        </TabsContent>

        <TabsContent value="calendar" className="mt-0">
          {isLoading ? (
            <Skeleton className="h-[500px] w-full" />
          ) : error ? (
            <div className="bg-destructive/10 border border-destructive text-destructive px-4 py-3 rounded-md">
              <p>Error: {error}</p>
              <Button
                variant="outline"
                size="sm"
                className="mt-2"
                onClick={() => refetch()}
              >
                Try Again
              </Button>
            </div>
          ) : (
            <TaskCalendar projectId={projectId} tasks={filteredTasks} />
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}
