import { notFound } from "next/navigation";
import Link from "next/link";
import { db } from "@/lib/db";
import { tasks, employees, milestones } from "@/lib/db/schema";
import { eq, and, not } from "drizzle-orm";
import { CalendarDays, Clock, Edit, ArrowLeft } from "lucide-react";
import { format } from "date-fns";

import { getProject } from "@/lib/actions/projects";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";

type TaskDetailPageProps = {
  params: Promise<{
    id: string;
    taskId: string;
  }>;
};

export default async function TaskDetailPage({ params }: TaskDetailPageProps) {
  const { id, taskId } = await params;

  const project = await getProject(id);

  if (!project) {
    notFound();
  }

  const task = await db.query.tasks.findFirst({
    where: and(
      eq(tasks.id, taskId),
      eq(tasks.projectId, id),
      not(eq(tasks.isDeleted, true))
    ),
    with: {
      milestone: true,
    },
  });

  if (!task) {
    notFound();
  }

  let assignee = null;
  let assigneeInfo = { initials: "UN", name: "Unassigned" };

  if (task.assignedToId) {
    assignee = await db.query.employees.findFirst({
      where: eq(employees.id, task.assignedToId),
      with: {
        users: true,
      },
    });

    if (assignee && assignee.users) {
      const { users } = assignee;
      assigneeInfo = {
        initials: users.name
          ? users.name
              .split(" ")
              .map((n) => n[0])
              .join("")
          : "UN",
        name: users.name || "Unknown User",
      };
    }
  }

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

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">{task.title}</h1>
          <div className="flex items-center gap-2 mt-1">
            <Badge variant={getStatusBadge(task.status) as any}>
              {getStatusText(task.status)}
            </Badge>
            <Badge variant={getPriorityBadge(task.priority).variant as any}>
              {getPriorityBadge(task.priority).label} Priority
            </Badge>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" asChild>
            <Link href={`/dashboard/projects/${id}?tab=tasks`}>
              <ArrowLeft className="h-4 w-4 mr-2" />
              Back to Tasks
            </Link>
          </Button>
          <Button size="sm" asChild>
            <Link href={`/dashboard/projects/${id}/tasks/${task.id}/edit`}>
              <Edit className="h-4 w-4 mr-2" />
              Edit Task
            </Link>
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="md:col-span-2 space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Description</CardTitle>
            </CardHeader>
            <CardContent>
              {task.description ? (
                <div className="prose max-w-none">
                  <p>{task.description}</p>
                </div>
              ) : (
                <p className="text-muted-foreground">No description provided</p>
              )}
            </CardContent>
          </Card>

          {task.milestone && (
            <Card>
              <CardHeader>
                <CardTitle>Milestone</CardTitle>
                <CardDescription>
                  This task is part of a milestone
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="font-medium">
                      {task.milestone?.name || "Unnamed Milestone"}
                    </h3>
                    <p className="text-sm text-muted-foreground">
                      Due:{" "}
                      {task.milestone?.dueDate
                        ? format(new Date(task.milestone.dueDate), "PPP")
                        : "No due date"}
                    </p>
                  </div>
                  <Button variant="outline" size="sm" asChild>
                    <Link href={`/dashboard/projects/${id}?tab=milestones`}>
                      View Milestone
                    </Link>
                  </Button>
                </div>
              </CardContent>
            </Card>
          )}

          <Card>
            <CardHeader>
              <CardTitle>Activity</CardTitle>
              <CardDescription>Recent activity for this task</CardDescription>
            </CardHeader>
            <CardContent>
              <p className="text-muted-foreground">No activity recorded yet</p>
            </CardContent>
          </Card>
        </div>

        <div className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Details</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-1">
                <p className="text-sm text-muted-foreground">Assignee</p>
                {assignee ? (
                  <div className="flex items-center">
                    <Avatar className="h-6 w-6 mr-2">
                      <AvatarFallback>{assigneeInfo.initials}</AvatarFallback>
                    </Avatar>
                    <span>{assigneeInfo.name}</span>
                  </div>
                ) : (
                  <p>Unassigned</p>
                )}
              </div>

              <Separator />

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1">
                  <p className="text-sm text-muted-foreground">Start Date</p>
                  {task.startDate ? (
                    <div className="flex items-center">
                      <CalendarDays className="h-4 w-4 mr-1 text-muted-foreground" />
                      {format(new Date(task.startDate), "PPP")}
                    </div>
                  ) : (
                    <p>Not set</p>
                  )}
                </div>

                <div className="space-y-1">
                  <p className="text-sm text-muted-foreground">Due Date</p>
                  {task.dueDate ? (
                    <div className="flex items-center">
                      <CalendarDays className="h-4 w-4 mr-1 text-muted-foreground" />
                      {format(new Date(task.dueDate), "PPP")}
                    </div>
                  ) : (
                    <p>Not set</p>
                  )}
                </div>
              </div>

              <Separator />

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1">
                  <p className="text-sm text-muted-foreground">
                    Estimated Hours
                  </p>
                  {task.estimatedHours ? (
                    <div className="flex items-center">
                      <Clock className="h-4 w-4 mr-1 text-muted-foreground" />
                      {task.estimatedHours} hrs
                    </div>
                  ) : (
                    <p>Not estimated</p>
                  )}
                </div>

                <div className="space-y-1">
                  <p className="text-sm text-muted-foreground">Actual Hours</p>
                  {task.actualHours ? (
                    <div className="flex items-center">
                      <Clock className="h-4 w-4 mr-1 text-muted-foreground" />
                      {task.actualHours} hrs
                    </div>
                  ) : (
                    <p>Not tracked</p>
                  )}
                </div>
              </div>

              <Separator />

              <div className="space-y-1">
                <p className="text-sm text-muted-foreground">Completed Date</p>
                {task.completedDate ? (
                  <div className="flex items-center">
                    <CalendarDays className="h-4 w-4 mr-1 text-muted-foreground" />
                    {format(new Date(task.completedDate), "PPP")}
                  </div>
                ) : (
                  <p>Not completed</p>
                )}
              </div>

              <Separator />

              <div className="space-y-1">
                <p className="text-sm text-muted-foreground">Created</p>
                <div className="flex items-center">
                  <CalendarDays className="h-4 w-4 mr-1 text-muted-foreground" />
                  {format(new Date(task.createdAt), "PPP")}
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Related Tasks</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-muted-foreground">No related tasks</p>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
