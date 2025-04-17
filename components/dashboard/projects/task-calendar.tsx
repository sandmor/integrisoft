"use client";

import { useState, useMemo } from "react";
import Link from "next/link";
import {
  Calendar as CalendarIcon,
  ChevronLeft,
  ChevronRight,
  MoreHorizontal,
  Plus,
} from "lucide-react";
import {
  format,
  startOfMonth,
  endOfMonth,
  startOfWeek,
  endOfWeek,
  eachDayOfInterval,
  isSameDay,
  isSameMonth,
  addMonths,
  subMonths,
  isToday,
} from "date-fns";

import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Task } from "@/lib/redux/projectsApi";

type TaskCalendarProps = {
  projectId: string;
  tasks: Task[];
};

export function TaskCalendar({ projectId, tasks }: TaskCalendarProps) {
  const [currentMonth, setCurrentMonth] = useState<Date>(new Date());
  const [selectedDay, setSelectedDay] = useState<Date | null>(null);

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

  const calendarDays = useMemo(() => {
    const monthStart = startOfMonth(currentMonth);
    const monthEnd = endOfMonth(currentMonth);
    const calendarStart = startOfWeek(monthStart);
    const calendarEnd = endOfWeek(monthEnd);
    return eachDayOfInterval({ start: calendarStart, end: calendarEnd });
  }, [currentMonth]);

  const getTasksForDay = (day: Date | null) => {
    if (!day) return [];
    return tasks.filter(
      (task) => task.dueDate && isSameDay(new Date(task.dueDate), day)
    );
  };

  const tasksForSelectedDay = useMemo(
    () => getTasksForDay(selectedDay),
    [selectedDay, tasks]
  );

  const renderTaskIndicators = (day: Date) => {
    const tasksForDay = getTasksForDay(day);
    if (tasksForDay.length === 0) return null;

    const highPriority = tasksForDay.filter((t) => t.priority === 3).length;
    const mediumPriority = tasksForDay.filter((t) => t.priority === 2).length;
    const lowPriority = tasksForDay.filter((t) => t.priority === 1).length;

    return (
      <div className="flex flex-wrap gap-[2px] justify-center mt-1">
        {highPriority > 0 && (
          <div className="h-1.5 w-1.5 rounded-full bg-destructive" />
        )}
        {mediumPriority > 0 && (
          <div className="h-1.5 w-1.5 rounded-full bg-secondary" />
        )}
        {lowPriority > 0 && (
          <div className="h-1.5 w-1.5 rounded-full bg-primary" />
        )}
      </div>
    );
  };

  return (
    <div className="grid grid-cols-1 md:grid-cols-7 gap-6">
      <div className="md:col-span-5">
        <Card>
          <CardHeader className="flex-row justify-between items-center pb-2">
            <div>
              <CardTitle>Task Calendar</CardTitle>
              <CardDescription>
                View and manage tasks by due date
              </CardDescription>
            </div>
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="icon"
                onClick={() => setCurrentMonth(subMonths(currentMonth, 1))}
                aria-label="Previous month"
              >
                <ChevronLeft className="h-4 w-4" />
              </Button>
              <h3 className="font-medium text-lg min-w-32 text-center">
                {format(currentMonth, "MMMM yyyy")}
              </h3>
              <Button
                variant="outline"
                size="icon"
                onClick={() => setCurrentMonth(addMonths(currentMonth, 1))}
                aria-label="Next month"
              >
                <ChevronRight className="h-4 w-4" />
              </Button>
            </div>
          </CardHeader>
          <CardContent className="pt-2">
            <div className="grid grid-cols-7 mb-2 text-center text-sm font-medium text-muted-foreground">
              {["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"].map((day) => (
                <div key={day} className="p-2">
                  {day}
                </div>
              ))}
            </div>

            <div className="grid grid-cols-7 gap-1">
              {calendarDays.map((day) => {
                const isCurrentMonth = isSameMonth(day, currentMonth);
                const isSelected = selectedDay
                  ? isSameDay(day, selectedDay)
                  : false;
                const dayTasks = getTasksForDay(day);
                const hasTasks = dayTasks.length > 0;

                return (
                  <div
                    key={day.toISOString()}
                    className={cn(
                      "min-h-[80px] border rounded-md p-1 relative",
                      isCurrentMonth ? "bg-background" : "bg-muted/20",
                      isSelected && "ring-2 ring-primary",
                      isToday(day) && "border-primary border-2",
                      !isCurrentMonth && "opacity-50"
                    )}
                    onClick={() => setSelectedDay(day)}
                  >
                    <div className="flex justify-between items-center">
                      <span
                        className={cn(
                          "text-sm font-medium",
                          isSelected && "text-primary"
                        )}
                      >
                        {format(day, "d")}
                      </span>
                      {isCurrentMonth && hasTasks && (
                        <span className="text-xs bg-primary/10 text-primary rounded-full px-1">
                          {dayTasks.length}
                        </span>
                      )}
                    </div>

                    {isCurrentMonth && renderTaskIndicators(day)}

                    {isCurrentMonth && hasTasks && (
                      <div className="mt-1 space-y-1 max-h-[50px] overflow-hidden">
                        {dayTasks.slice(0, 2).map((task) => (
                          <div
                            key={task.id}
                            className="text-xs truncate px-1 py-0.5 bg-muted rounded"
                            title={task.title}
                          >
                            {task.title}
                          </div>
                        ))}
                        {dayTasks.length > 2 && (
                          <div className="text-xs text-muted-foreground text-center">
                            +{dayTasks.length - 2} more
                          </div>
                        )}
                      </div>
                    )}

                    {isCurrentMonth && (
                      <Link
                        href={`/dashboard/projects/${projectId}/tasks/new?dueDate=${format(
                          day,
                          "yyyy-MM-dd"
                        )}`}
                        className="absolute bottom-1 right-1 opacity-0 group-hover:opacity-100 hover:opacity-100 transition-opacity"
                      >
                        <Button size="icon" variant="ghost" className="h-5 w-5">
                          <Plus className="h-3 w-3" />
                        </Button>
                      </Link>
                    )}
                  </div>
                );
              })}
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="md:col-span-2">
        <Card className="h-full">
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle>
                {selectedDay
                  ? format(selectedDay, "MMMM d, yyyy")
                  : "Select a day"}
              </CardTitle>
              {selectedDay && (
                <Button variant="outline" size="sm" asChild>
                  <Link
                    href={`/dashboard/projects/${projectId}/tasks/new?dueDate=${format(
                      selectedDay,
                      "yyyy-MM-dd"
                    )}`}
                  >
                    <Plus className="mr-1 h-3 w-3" /> Add
                  </Link>
                </Button>
              )}
            </div>
            <CardDescription>
              {selectedDay && tasksForSelectedDay.length === 0
                ? "No tasks due on this day"
                : `${tasksForSelectedDay.length} tasks due`}
            </CardDescription>
          </CardHeader>

          <CardContent className="space-y-3">
            {!selectedDay ? (
              <div className="flex flex-col items-center justify-center p-6 text-center text-muted-foreground">
                <CalendarIcon className="h-8 w-8 mb-2" />
                <p>Select a day to view tasks</p>
              </div>
            ) : tasksForSelectedDay.length === 0 ? (
              <div className="flex flex-col items-center justify-center p-6 text-center text-muted-foreground">
                <p>No tasks due on this day</p>
                <Button variant="outline" size="sm" className="mt-4" asChild>
                  <Link
                    href={`/dashboard/projects/${projectId}/tasks/new?dueDate=${format(
                      selectedDay,
                      "yyyy-MM-dd"
                    )}`}
                  >
                    Add a task
                  </Link>
                </Button>
              </div>
            ) : (
              tasksForSelectedDay.map((task) => (
                <Card
                  key={task.id}
                  className="overflow-hidden hover:shadow-md transition-shadow"
                >
                  <CardContent className="p-3">
                    <div className="flex justify-between items-start mb-2">
                      <Link
                        href={`/dashboard/projects/${projectId}/tasks/${task.id}`}
                        className="font-medium text-sm hover:underline line-clamp-2"
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
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </div>

                    <div className="flex items-center justify-between mt-2">
                      <Badge
                        variant={getPriorityBadge(task.priority).variant as any}
                      >
                        {getPriorityBadge(task.priority).label}
                      </Badge>
                      <Badge
                        variant={
                          task.status === "done" ? "success" : "secondary"
                        }
                      >
                        {task.status === "todo"
                          ? "To Do"
                          : task.status === "in_progress"
                          ? "In Progress"
                          : task.status === "review"
                          ? "Review"
                          : "Done"}
                      </Badge>
                    </div>

                    {task.assignee && (
                      <div className="flex items-center mt-3">
                        <Avatar className="h-5 w-5 mr-1">
                          <AvatarFallback className="text-[10px]">
                            {task.assignee.name
                              .split(" ")
                              .map((n) => n[0])
                              .join("")}
                          </AvatarFallback>
                        </Avatar>
                        <span className="text-xs truncate max-w-[180px]">
                          {task.assignee.name}
                        </span>
                      </div>
                    )}
                  </CardContent>
                </Card>
              ))
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
