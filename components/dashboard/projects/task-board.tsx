"use client";

import { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import { DragDropContext, Droppable, Draggable } from "@hello-pangea/dnd";
import { PlusCircle, Loader2, MoreHorizontal, Bookmark } from "lucide-react";
import { format } from "date-fns";

import { cn } from "@/lib/utils";
import {
  useReorderTasksMutation,
  useUpdateTaskMutation,
} from "@/lib/redux/projectsApi";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Card, CardContent } from "@/components/ui/card";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Task } from "@/lib/redux/projectsApi";

type Column = {
  id: string;
  title: string;
  tasks: Task[];
};

type TaskBoardProps = {
  projectId: string;
  initialTasks: Task[];
  onTaskMove: (
    taskId: string,
    newStatus: string,
    destinationIndex?: number
  ) => Promise<void>;
  isDisabled?: boolean;
};

export function TaskBoard({
  projectId,
  initialTasks,
  onTaskMove,
  isDisabled = false,
}: TaskBoardProps) {
  const [columns, setColumns] = useState<Column[]>([
    { id: "todo", title: "To Do", tasks: [] },
    { id: "in_progress", title: "In Progress", tasks: [] },
    { id: "review", title: "Review", tasks: [] },
    { id: "done", title: "Done", tasks: [] },
  ]);
  const [isLoading, setIsLoading] = useState(false);
  const [loadingTaskId, setLoadingTaskId] = useState<string | null>(null);

  const [reorderTasks] = useReorderTasksMutation();
  const [updateTask] = useUpdateTaskMutation();

  useEffect(() => {
    distributeTasksToColumns(initialTasks);
  }, [initialTasks]);

  const distributeTasksToColumns = (tasks: Task[]) => {
    const newColumns = [...columns];

    // Reset tasks in all columns
    newColumns.forEach((column) => {
      column.tasks = [];
    });

    // Distribute tasks to respective columns
    tasks.forEach((task) => {
      const columnIndex = newColumns.findIndex((col) => col.id === task.status);
      if (columnIndex !== -1) {
        newColumns[columnIndex].tasks.push(task);
      }
    });

    setColumns(newColumns);
  };

  // Save column order
  const saveColumnOrder = useCallback(
    async (columnId: string, taskIds: string[]) => {
      if (taskIds.length === 0) return;

      try {
        // Apply the change optimistically first
        setColumns((prevColumns) => {
          return prevColumns.map((column) => {
            if (column.id === columnId) {
              // Build a map of tasks by ID
              const tasksMap = new Map(
                column.tasks.map((task) => [task.id, task])
              );

              // Create the new ordered array
              const orderedTasks = taskIds
                .map((id) => tasksMap.get(id))
                .filter(Boolean) as Task[];

              // Add any tasks that might be missing
              column.tasks.forEach((task) => {
                if (!taskIds.includes(task.id)) {
                  orderedTasks.push(task);
                }
              });

              return { ...column, tasks: orderedTasks };
            }
            return column;
          });
        });

        // Then send to the server
        await reorderTasks({
          projectId,
          status: columnId as "todo" | "in_progress" | "review" | "done",
          taskIds,
        });
      } catch (error) {
        console.error("Failed to save column order:", error);
        // Restore original order by refreshing from props
        distributeTasksToColumns(initialTasks);
      }
    },
    [projectId, reorderTasks, initialTasks]
  );

  const handleDragEnd = async (result: any) => {
    // Prevent dragging if the board is disabled
    if (isDisabled) return;

    const { source, destination, draggableId } = result;

    // Dropped outside the list
    if (!destination) return;

    // Dropped in the same position
    if (
      source.droppableId === destination.droppableId &&
      source.index === destination.index
    )
      return;

    // Find the task that was moved
    const task = initialTasks.find((t) => t.id === draggableId);
    if (!task) return;

    // If moving within the same column (reordering)
    if (source.droppableId === destination.droppableId) {
      const newColumns = [...columns];
      const columnIndex = newColumns.findIndex(
        (col) => col.id === source.droppableId
      );

      if (columnIndex !== -1) {
        const column = newColumns[columnIndex];
        const [removed] = column.tasks.splice(source.index, 1);
        column.tasks.splice(destination.index, 0, removed);

        // Apply the visual update immediately
        setColumns(newColumns);

        // Get the new order of task IDs
        const taskIds = column.tasks.map((task) => task.id);

        // Save the new order to the backend - this is necessary for reordering within the same column
        await saveColumnOrder(column.id, taskIds);
      }
    } else {
      // Moving between columns (status change)
      const newStatus = destination.droppableId;
      const destinationIndex = destination.index;

      // Update locally first for better UX - with exact position
      const newColumns = [...columns];

      // Remove task from source column
      const sourceColumnIndex = newColumns.findIndex(
        (col) => col.id === source.droppableId
      );

      if (sourceColumnIndex !== -1) {
        const sourceColumn = newColumns[sourceColumnIndex];
        const taskToMove = {
          ...sourceColumn.tasks[source.index],
          status: newStatus as any,
        };
        sourceColumn.tasks.splice(source.index, 1);

        // Add task to destination column at exact index
        const destinationColumnIndex = newColumns.findIndex(
          (col) => col.id === newStatus
        );

        if (destinationColumnIndex !== -1) {
          const destinationColumn = newColumns[destinationColumnIndex];
          destinationColumn.tasks.splice(destinationIndex, 0, taskToMove);

          // Update the UI immediately
          setColumns(newColumns);
          setLoadingTaskId(draggableId);

          try {
            await onTaskMove(draggableId, newStatus, destinationIndex);
          } catch (error) {
            console.error("Failed to update task status:", error);
            distributeTasksToColumns(initialTasks);
          } finally {
            setLoadingTaskId(null);
          }
        }
      }
    }
  };

  const getPriorityBadge = (priority: number) => {
    switch (priority) {
      case 1:
        return { label: "Low", variant: "outline" };
      case 2:
        return { label: "Medium", variant: "secondary" };
      case 3:
        return { label: "High", variant: "destructive" };
      default:
        return { label: "Medium", variant: "secondary" };
    }
  };

  return (
    <div
      className={cn(
        "w-full overflow-auto",
        isDisabled && "opacity-70 pointer-events-none"
      )}
    >
      <DragDropContext onDragEnd={handleDragEnd}>
        <div className="flex gap-4 pb-4 min-w-[800px]">
          {columns.map((column) => (
            <div key={column.id} className="flex flex-col w-72">
              <div className="flex items-center justify-between mb-2 px-1">
                <h3 className="text-sm font-medium">{column.title}</h3>
                <Badge variant="secondary" className="text-xs">
                  {column.tasks.length}
                </Badge>
              </div>

              <Droppable droppableId={column.id} isDropDisabled={isDisabled}>
                {(provided) => (
                  <div
                    ref={provided.innerRef}
                    {...provided.droppableProps}
                    className="bg-muted/30 rounded-md p-2 min-h-[500px] flex-1"
                  >
                    {column.tasks.map((task, index) => (
                      <Draggable
                        key={task.id}
                        draggableId={task.id}
                        index={index}
                      >
                        {(provided, snapshot) => (
                          <div
                            ref={provided.innerRef}
                            {...provided.draggableProps}
                            {...provided.dragHandleProps}
                            className={cn(
                              "mb-2 rounded-md border bg-card text-card-foreground shadow-sm",
                              snapshot.isDragging && "ring-2 ring-primary",
                              loadingTaskId === task.id && "opacity-70"
                            )}
                          >
                            <Card>
                              <CardContent className="p-3">
                                <div className="flex items-start justify-between mb-2">
                                  <Link
                                    href={`/dashboard/projects/${projectId}/tasks/${task.id}`}
                                    className="font-medium text-sm hover:underline"
                                  >
                                    {task.title}
                                  </Link>
                                  <DropdownMenu>
                                    <DropdownMenuTrigger asChild>
                                      <Button
                                        variant="ghost"
                                        size="sm"
                                        className="h-6 w-6 p-0"
                                      >
                                        <MoreHorizontal className="h-4 w-4" />
                                      </Button>
                                    </DropdownMenuTrigger>
                                    <DropdownMenuContent align="end">
                                      <DropdownMenuItem asChild>
                                        <Link
                                          href={`/dashboard/projects/${projectId}/tasks/${task.id}`}
                                        >
                                          View Details
                                        </Link>
                                      </DropdownMenuItem>
                                      <DropdownMenuItem asChild>
                                        <Link
                                          href={`/dashboard/projects/${projectId}/tasks/${task.id}/edit`}
                                        >
                                          Edit Task
                                        </Link>
                                      </DropdownMenuItem>
                                      <DropdownMenuSeparator />
                                      {column.id !== "todo" && (
                                        <DropdownMenuItem
                                          onClick={async () => {
                                            setLoadingTaskId(task.id);
                                            try {
                                              await onTaskMove(task.id, "todo");
                                            } finally {
                                              setLoadingTaskId(null);
                                            }
                                          }}
                                        >
                                          Move to To Do
                                        </DropdownMenuItem>
                                      )}
                                      {column.id !== "in_progress" && (
                                        <DropdownMenuItem
                                          onClick={async () => {
                                            setLoadingTaskId(task.id);
                                            try {
                                              await onTaskMove(
                                                task.id,
                                                "in_progress"
                                              );
                                            } finally {
                                              setLoadingTaskId(null);
                                            }
                                          }}
                                        >
                                          Move to In Progress
                                        </DropdownMenuItem>
                                      )}
                                      {column.id !== "review" && (
                                        <DropdownMenuItem
                                          onClick={async () => {
                                            setLoadingTaskId(task.id);
                                            try {
                                              await onTaskMove(
                                                task.id,
                                                "review"
                                              );
                                            } finally {
                                              setLoadingTaskId(null);
                                            }
                                          }}
                                        >
                                          Move to Review
                                        </DropdownMenuItem>
                                      )}
                                      {column.id !== "done" && (
                                        <DropdownMenuItem
                                          onClick={async () => {
                                            setLoadingTaskId(task.id);
                                            try {
                                              await onTaskMove(task.id, "done");
                                            } finally {
                                              setLoadingTaskId(null);
                                            }
                                          }}
                                        >
                                          Mark as Done
                                        </DropdownMenuItem>
                                      )}
                                    </DropdownMenuContent>
                                  </DropdownMenu>
                                </div>

                                {task.description && (
                                  <p className="text-xs text-muted-foreground line-clamp-2 mb-2">
                                    {task.description}
                                  </p>
                                )}

                                <div className="flex justify-between items-center mt-2">
                                  <Badge
                                    variant={
                                      getPriorityBadge(task.priority)
                                        .variant as any
                                    }
                                    className="text-xs"
                                  >
                                    {getPriorityBadge(task.priority).label}
                                  </Badge>

                                  {loadingTaskId === task.id ? (
                                    <Loader2 className="h-3 w-3 animate-spin" />
                                  ) : task.dueDate ? (
                                    <span className="text-xs text-muted-foreground">
                                      {format(new Date(task.dueDate), "MMM d")}
                                    </span>
                                  ) : null}
                                </div>

                                <div className="flex items-center justify-between mt-3 gap-2">
                                  {task.milestone && (
                                    <div className="flex items-center text-xs">
                                      <Bookmark className="h-3 w-3 mr-1 text-primary" />
                                      <span className="truncate max-w-[110px]">
                                        {task.milestone.name}
                                      </span>
                                    </div>
                                  )}

                                  {task.assignee && (
                                    <div className="flex items-center ml-auto">
                                      <Avatar className="h-5 w-5 mr-1">
                                        <AvatarFallback className="text-[10px]">
                                          {task.assignee.name
                                            .split(" ")
                                            .map((n) => n[0])
                                            .join("")}
                                        </AvatarFallback>
                                      </Avatar>
                                      <span className="text-xs truncate max-w-[80px]">
                                        {task.assignee.name}
                                      </span>
                                    </div>
                                  )}
                                </div>
                              </CardContent>
                            </Card>
                          </div>
                        )}
                      </Draggable>
                    ))}
                    {provided.placeholder}

                    {column.id === "todo" && (
                      <Button
                        variant="ghost"
                        className="w-full mt-2 text-muted-foreground"
                        size="sm"
                        asChild
                      >
                        <Link
                          href={`/dashboard/projects/${projectId}/tasks/new`}
                        >
                          <PlusCircle className="h-4 w-4 mr-1" />
                          Add Task
                        </Link>
                      </Button>
                    )}
                  </div>
                )}
              </Droppable>
            </div>
          ))}
        </div>
      </DragDropContext>
    </div>
  );
}
