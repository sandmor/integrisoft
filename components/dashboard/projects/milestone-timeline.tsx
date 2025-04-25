"use client";

import { useState } from "react";
import Link from "next/link";
import { format, isPast, isToday } from "date-fns";
import {
  CheckCircle2,
  Circle,
  Clock,
  PenSquare,
  AlertCircle,
  Trash2,
  MoreVertical,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { useDeleteMilestoneMutation } from "@/lib/redux/projectsApi";
import { toast } from "sonner";
import { Milestone } from "@/lib/types";

type MilestoneTimelineProps = {
  milestones: Milestone[];
  projectId?: string;
};

function getMilestoneStatus(milestone: Milestone) {
  if (milestone.isCompleted) {
    return {
      label: "Completed",
      color:
        "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300",
      icon: CheckCircle2,
    };
  }

  if (!milestone.dueDate) {
    return {
      label: "No Due Date",
      color: "bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-300",
      icon: Circle,
    };
  }

  const dueDate = new Date(milestone.dueDate);

  if (isToday(dueDate)) {
    return {
      label: "Due Today",
      color:
        "bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-300",
      icon: Clock,
    };
  }

  if (isPast(dueDate)) {
    return {
      label: "Overdue",
      color: "bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-300",
      icon: AlertCircle,
    };
  }

  return {
    label: "Upcoming",
    color: "bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-300",
    icon: Circle,
  };
}

export function MilestoneTimeline({
  milestones,
  projectId,
}: MilestoneTimelineProps) {
  const [deletingMilestoneId, setDeletingMilestoneId] = useState<string | null>(
    null
  );
  const [deleteMilestone, { isLoading: isDeleteLoading }] =
    useDeleteMilestoneMutation();

  const handleDeleteClick = (milestoneId: string) => {
    setDeletingMilestoneId(milestoneId);
  };

  const handleDeleteCancel = () => {
    setDeletingMilestoneId(null);
  };

  const handleDeleteConfirm = async () => {
    if (!deletingMilestoneId || !projectId) return;

    try {
      await deleteMilestone({
        projectId,
        milestoneId: deletingMilestoneId,
      }).unwrap();

      toast.success("Milestone deleted successfully");
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : "Failed to delete milestone"
      );
    } finally {
      setDeletingMilestoneId(null);
    }
  };

  if (!milestones.length) {
    return (
      <Card>
        <CardContent className="flex flex-col items-center justify-center p-6">
          <div className="rounded-full p-3 bg-secondary">
            <Clock className="h-6 w-6 text-secondary-foreground" />
          </div>
          <h3 className="mt-4 text-lg font-medium">No Milestones Yet</h3>
          <p className="mt-2 text-sm text-muted-foreground text-center max-w-xs">
            This project doesn't have any milestones yet. Add milestones to
            track project progress.
          </p>
          {projectId && (
            <Button className="mt-4" asChild>
              <Link href={`/dashboard/projects/${projectId}/milestones/new`}>
                Add First Milestone
              </Link>
            </Button>
          )}
        </CardContent>
      </Card>
    );
  }

  return (
    <>
      <div className="space-y-4">
        {milestones.map((milestone) => {
          const status = getMilestoneStatus(milestone);
          const StatusIcon = status.icon;

          return (
            <Card key={milestone.id} className="overflow-hidden">
              <div className={cn("h-1.5", status.color)} />
              <CardHeader>
                <div className="flex items-start justify-between">
                  <div className="space-y-1">
                    <CardTitle className="flex items-center">
                      <StatusIcon className="h-5 w-5 mr-2 inline-block" />
                      {milestone.name}
                    </CardTitle>
                    <CardDescription>
                      <Badge variant="outline" className="mr-2">
                        {status.label}
                      </Badge>
                      {milestone.dueDate && (
                        <span>
                          Due{" "}
                          {format(new Date(milestone.dueDate), "MMMM d, yyyy")}
                        </span>
                      )}
                    </CardDescription>
                  </div>
                  {projectId && (
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="icon">
                          <MoreVertical className="h-4 w-4" />
                          <span className="sr-only">Actions</span>
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem asChild>
                          <Link
                            href={`/dashboard/projects/${projectId}/milestones/${milestone.id}/edit`}
                          >
                            <PenSquare className="mr-2 h-4 w-4" />
                            Edit
                          </Link>
                        </DropdownMenuItem>
                        <DropdownMenuSeparator />
                        <DropdownMenuItem
                          className="text-red-600 focus:text-red-600"
                          onSelect={() => handleDeleteClick(milestone.id)}
                        >
                          <Trash2 className="mr-2 h-4 w-4" />
                          Delete
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  )}
                </div>
              </CardHeader>
              {milestone.description && (
                <CardContent>
                  <p className="text-sm text-muted-foreground">
                    {milestone.description}
                  </p>
                </CardContent>
              )}
              <CardFooter className="border-t bg-muted/40 py-3">
                {milestone.isCompleted ? (
                  <p className="text-xs text-muted-foreground">
                    Completed on{" "}
                    {milestone.completedDate
                      ? format(
                          new Date(milestone.completedDate),
                          "MMMM d, yyyy"
                        )
                      : "unknown date"}
                  </p>
                ) : (
                  <p className="text-xs text-muted-foreground">
                    Not completed yet
                  </p>
                )}
              </CardFooter>
            </Card>
          );
        })}
      </div>

      <AlertDialog
        open={!!deletingMilestoneId}
        onOpenChange={(open) => !open && handleDeleteCancel()}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Are you sure?</AlertDialogTitle>
            <AlertDialogDescription>
              This will permanently delete this milestone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isDeleteLoading}>
              Cancel
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDeleteConfirm}
              disabled={isDeleteLoading}
              className="bg-red-600 focus:ring-red-600"
            >
              {isDeleteLoading ? "Deleting..." : "Delete"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
