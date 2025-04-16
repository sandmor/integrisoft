"use client";

import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Plus, MoreHorizontal } from "lucide-react";
import Link from "next/link";

// Task status types and colors
const statusColumns = [
  { id: "todo", name: "To Do", color: "bg-gray-100" },
  { id: "in_progress", name: "In Progress", color: "bg-blue-50" },
  { id: "review", name: "Review", color: "bg-yellow-50" },
  { id: "done", name: "Done", color: "bg-green-50" },
];

// Task priority colors
const priorityColorMap: Record<number, string> = {
  1: "bg-gray-100 text-gray-700", // Low
  2: "bg-blue-100 text-blue-700", // Medium
  3: "bg-red-100 text-red-700", // High
};

// Task type definition
type Task = {
  id: string;
  title: string;
  description?: string;
  status: string;
  priority: number;
  dueDate?: string;
  assignee?: {
    id: string;
    name: string;
  };
};

// Define TasksByStatus type with proper typing for each status column
type TasksByStatus = {
  todo: Task[];
  in_progress: Task[];
  review: Task[];
  done: Task[];
  [key: string]: Task[]; // Allow for dynamic status keys
};

// Sample empty state for a new task board
const emptyTasksByStatus: TasksByStatus = {
  todo: [],
  in_progress: [],
  review: [],
  done: [],
};

type TaskBoardProps = {
  projectId: string;
  tasks?: Task[];
  isLoading?: boolean;
  onTaskMove?: (taskId: string, newStatus: string) => void;
};

export function TaskBoard({
  projectId,
  tasks = [],
  isLoading = false,
  onTaskMove,
}: TaskBoardProps) {
  // Group tasks by status
  const [tasksByStatus, setTasksByStatus] = useState<TasksByStatus>(() => {
    const grouped = { ...emptyTasksByStatus };

    tasks.forEach((task) => {
      // Ensure the status exists as a key (for custom statuses)
      if (!grouped[task.status]) {
        grouped[task.status] = [];
      }
      grouped[task.status].push(task);
    });

    return grouped;
  });

  // Handle drag start
  const handleDragStart = (e: React.DragEvent, taskId: string) => {
    e.dataTransfer.setData("taskId", taskId);
  };

  // Handle drag over
  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
  };

  // Handle drop
  const handleDrop = (e: React.DragEvent, targetStatus: string) => {
    e.preventDefault();
    const taskId = e.dataTransfer.getData("taskId");

    // Find the task
    let task: Task | undefined;
    let sourceStatus: string | undefined;

    Object.entries(tasksByStatus).forEach(([status, tasksInStatus]) => {
      const foundTask = tasksInStatus.find((t) => t.id === taskId);
      if (foundTask) {
        task = foundTask;
        sourceStatus = status;
      }
    });

    if (!task || !sourceStatus || sourceStatus === targetStatus) return;

    // Update task status locally
    const updatedTasksByStatus = { ...tasksByStatus };
    updatedTasksByStatus[sourceStatus] = updatedTasksByStatus[
      sourceStatus
    ].filter((t) => t.id !== taskId);

    task.status = targetStatus;

    // Ensure the target status array exists
    if (!updatedTasksByStatus[targetStatus]) {
      updatedTasksByStatus[targetStatus] = [];
    }

    updatedTasksByStatus[targetStatus] = [
      ...updatedTasksByStatus[targetStatus],
      task,
    ];

    setTasksByStatus(updatedTasksByStatus);

    // Call onTaskMove to update on the server
    if (onTaskMove) {
      onTaskMove(taskId, targetStatus);
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-primary"></div>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
      {statusColumns.map((column) => (
        <div
          key={column.id}
          className={`rounded-lg ${column.color} p-2`}
          onDragOver={handleDragOver}
          onDrop={(e) => handleDrop(e, column.id)}
        >
          <div className="flex justify-between items-center mb-3">
            <h3 className="font-medium">{column.name}</h3>
            <Badge>{tasksByStatus[column.id]?.length || 0}</Badge>
          </div>

          <div className="space-y-2">
            {tasksByStatus[column.id]?.map((task: Task) => (
              <Card
                key={task.id}
                className="cursor-grab"
                draggable
                onDragStart={(e) => handleDragStart(e, task.id)}
              >
                <CardContent className="p-3">
                  <div className="flex justify-between items-start">
                    <div>
                      <p className="font-medium text-sm">{task.title}</p>
                      {task.description && (
                        <p className="text-xs text-muted-foreground line-clamp-2 mt-1">
                          {task.description}
                        </p>
                      )}
                    </div>
                    <Button variant="ghost" size="icon" className="h-7 w-7">
                      <MoreHorizontal className="h-4 w-4" />
                    </Button>
                  </div>

                  <div className="flex justify-between items-center mt-3">
                    <div className="flex space-x-1">
                      <Badge
                        variant="outline"
                        className={priorityColorMap[task.priority]}
                      >
                        {task.priority === 1
                          ? "Low"
                          : task.priority === 2
                          ? "Medium"
                          : "High"}
                      </Badge>

                      {task.dueDate && (
                        <Badge variant="outline" className="text-xs">
                          {new Date(task.dueDate).toLocaleDateString()}
                        </Badge>
                      )}
                    </div>

                    {task.assignee && (
                      <div
                        className="h-6 w-6 rounded-full bg-primary/10 flex items-center justify-center text-xs font-medium"
                        title={task.assignee.name}
                      >
                        {task.assignee.name.charAt(0)}
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>
            ))}

            <Button
              variant="ghost"
              size="sm"
              className="w-full justify-start text-muted-foreground text-xs"
              asChild
            >
              <Link
                href={`/dashboard/projects/${projectId}/tasks/new?status=${column.id}`}
              >
                <Plus className="h-3 w-3 mr-1" />
                Add Task
              </Link>
            </Button>
          </div>
        </div>
      ))}
    </div>
  );
}
