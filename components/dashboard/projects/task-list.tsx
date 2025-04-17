"use client";

import { useState } from "react";
import Link from "next/link";
import { CalendarDays, MoreHorizontal } from "lucide-react";
import { format } from "date-fns";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Task } from "@/lib/redux/projectsApi";

type TaskListProps = {
  projectId: string;
  tasks: Task[];
  onStatusChange: (taskId: string, newStatus: string) => Promise<void>;
};

export function TaskList({ projectId, tasks, onStatusChange }: TaskListProps) {
  const [sortConfig, setSortConfig] = useState<{
    key: keyof Task | null;
    direction: "ascending" | "descending";
  }>({
    key: null,
    direction: "ascending",
  });

  const getStatusText = (status: string) => {
    switch (status) {
      case "todo":
        return "To Do";
      case "in_progress":
        return "In Progress";
      case "review":
        return "Review";
      case "done":
        return "Done";
      default:
        return status;
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "todo":
        return "secondary";
      case "in_progress":
        return "default";
      case "review":
        return "warning";
      case "done":
        return "success";
      default:
        return "secondary";
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

  const requestSort = (key: keyof Task) => {
    let direction: "ascending" | "descending" = "ascending";

    if (sortConfig.key === key && sortConfig.direction === "ascending") {
      direction = "descending";
    }

    setSortConfig({ key, direction });
  };

  const sortedTasks = [...tasks].sort((a, b) => {
    if (!sortConfig.key) return 0;

    const key = sortConfig.key;
    let aValue = a[key];
    let bValue = b[key];

    // Special handling for nested properties
    if (key === "assignee" && a.assignee && b.assignee) {
      aValue = a.assignee.name;
      bValue = b.assignee.name;
    } else if (key === "milestone" && a.milestone && b.milestone) {
      aValue = a.milestone.name;
      bValue = b.milestone.name;
    }

    // Handle undefined/null values
    if (aValue == null && bValue == null) return 0;
    if (aValue == null) return 1;
    if (bValue == null) return -1;

    // Compare as strings for consistent behavior
    const aString = String(aValue);
    const bString = String(bValue);

    return sortConfig.direction === "ascending"
      ? aString.localeCompare(bString)
      : bString.localeCompare(aString);
  });

  return (
    <div className="rounded-md border">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead
              className="w-[300px] cursor-pointer"
              onClick={() => requestSort("title")}
            >
              Task
              {sortConfig.key === "title" && (
                <span className="ml-1">
                  {sortConfig.direction === "ascending" ? "↑" : "↓"}
                </span>
              )}
            </TableHead>
            <TableHead
              className="cursor-pointer"
              onClick={() => requestSort("status")}
            >
              Status
              {sortConfig.key === "status" && (
                <span className="ml-1">
                  {sortConfig.direction === "ascending" ? "↑" : "↓"}
                </span>
              )}
            </TableHead>
            <TableHead
              className="cursor-pointer"
              onClick={() => requestSort("priority")}
            >
              Priority
              {sortConfig.key === "priority" && (
                <span className="ml-1">
                  {sortConfig.direction === "ascending" ? "↑" : "↓"}
                </span>
              )}
            </TableHead>
            <TableHead
              className="cursor-pointer"
              onClick={() => requestSort("assignee")}
            >
              Assignee
              {sortConfig.key === "assignee" && (
                <span className="ml-1">
                  {sortConfig.direction === "ascending" ? "↑" : "↓"}
                </span>
              )}
            </TableHead>
            <TableHead
              className="cursor-pointer"
              onClick={() => requestSort("milestone")}
            >
              Milestone
              {sortConfig.key === "milestone" && (
                <span className="ml-1">
                  {sortConfig.direction === "ascending" ? "↑" : "↓"}
                </span>
              )}
            </TableHead>
            <TableHead
              className="cursor-pointer"
              onClick={() => requestSort("dueDate")}
            >
              Due Date
              {sortConfig.key === "dueDate" && (
                <span className="ml-1">
                  {sortConfig.direction === "ascending" ? "↑" : "↓"}
                </span>
              )}
            </TableHead>
            <TableHead className="w-[60px]"></TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {sortedTasks.length === 0 ? (
            <TableRow>
              <TableCell colSpan={7} className="h-24 text-center">
                No tasks found.
              </TableCell>
            </TableRow>
          ) : (
            sortedTasks.map((task) => (
              <TableRow key={task.id}>
                <TableCell>
                  <Link
                    href={`/dashboard/projects/${projectId}/tasks/${task.id}`}
                    className="font-medium hover:underline"
                  >
                    {task.title}
                  </Link>
                  {task.description && (
                    <p className="text-xs text-muted-foreground line-clamp-1 mt-1">
                      {task.description}
                    </p>
                  )}
                </TableCell>
                <TableCell>
                  <Badge variant={getStatusBadge(task.status) as any}>
                    {getStatusText(task.status)}
                  </Badge>
                </TableCell>
                <TableCell>
                  <Badge
                    variant={getPriorityBadge(task.priority).variant as any}
                  >
                    {getPriorityBadge(task.priority).label}
                  </Badge>
                </TableCell>
                <TableCell>
                  {task.assignee ? (
                    <div className="flex items-center">
                      <Avatar className="h-6 w-6 mr-2">
                        <AvatarFallback className="text-xs">
                          {task.assignee.name
                            .split(" ")
                            .map((n) => n[0])
                            .join("")}
                        </AvatarFallback>
                      </Avatar>
                      <span className="truncate max-w-[100px]">
                        {task.assignee.name}
                      </span>
                    </div>
                  ) : (
                    <span className="text-muted-foreground">Unassigned</span>
                  )}
                </TableCell>
                <TableCell>
                  {task.milestone ? (
                    <span className="truncate max-w-[150px]">
                      {task.milestone.name}
                    </span>
                  ) : (
                    <span className="text-muted-foreground">None</span>
                  )}
                </TableCell>
                <TableCell>
                  {task.dueDate ? (
                    <div className="flex items-center whitespace-nowrap">
                      <CalendarDays className="h-3.5 w-3.5 mr-1 text-muted-foreground" />
                      {format(new Date(task.dueDate), "MMM d, yyyy")}
                    </div>
                  ) : (
                    <span className="text-muted-foreground">No date</span>
                  )}
                </TableCell>
                <TableCell>
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant="ghost" size="sm" className="h-7 w-7 p-0">
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
                      {task.status !== "todo" && (
                        <DropdownMenuItem
                          onClick={() => onStatusChange(task.id, "todo")}
                        >
                          Move to To Do
                        </DropdownMenuItem>
                      )}
                      {task.status !== "in_progress" && (
                        <DropdownMenuItem
                          onClick={() => onStatusChange(task.id, "in_progress")}
                        >
                          Move to In Progress
                        </DropdownMenuItem>
                      )}
                      {task.status !== "review" && (
                        <DropdownMenuItem
                          onClick={() => onStatusChange(task.id, "review")}
                        >
                          Move to Review
                        </DropdownMenuItem>
                      )}
                      {task.status !== "done" && (
                        <DropdownMenuItem
                          onClick={() => onStatusChange(task.id, "done")}
                        >
                          Mark as Done
                        </DropdownMenuItem>
                      )}
                    </DropdownMenuContent>
                  </DropdownMenu>
                </TableCell>
              </TableRow>
            ))
          )}
        </TableBody>
      </Table>
    </div>
  );
}
