import { notFound } from "next/navigation";
import Link from "next/link";
import { db } from "@/lib/db";
import { milestones } from "@/lib/db/schema";
import { eq, and, not } from "drizzle-orm";
import { CalendarDays, ArrowLeft, Edit } from "lucide-react";
import { format } from "date-fns";

import { getProject } from "@/lib/actions/projects";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";

export default async function MilestoneDetailPage({
  params,
}: {
  params: Promise<{ id: string; milestoneId: string }>;
}) {
  const { id, milestoneId } = await params;

  const project = await getProject(id);
  if (!project) notFound();

  const milestone = await db.query.milestones.findFirst({
    where: and(
      eq(milestones.id, milestoneId),
      eq(milestones.projectId, id),
      not(eq(milestones.isDeleted, true))
    ),
  });
  if (!milestone) notFound();

  const getStatus = () => {
    if (milestone.isCompleted) {
      return { label: "Completed", variant: "success" };
    }
    if (!milestone.dueDate) {
      return { label: "No Due Date", variant: "secondary" };
    }
    const due = new Date(milestone.dueDate);
    const today = format(new Date(), "yyyy-MM-dd");
    const dueStr = format(due, "yyyy-MM-dd");
    if (today === dueStr) {
      return { label: "Due Today", variant: "warning" };
    }
    if (due < new Date()) {
      return { label: "Overdue", variant: "destructive" };
    }
    return { label: "Upcoming", variant: "info" };
  };

  const status = getStatus();

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">
            {milestone.name}
          </h1>
          <div className="flex items-center gap-2 mt-1">
            <Badge variant={status.variant as any}>{status.label}</Badge>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" asChild>
            <Link href={`/dashboard/projects/${id}?tab=milestones`}>
              <ArrowLeft className="h-4 w-4 mr-2" />
              Back to Milestones
            </Link>
          </Button>
          <Button size="sm" asChild>
            <Link
              href={`/dashboard/projects/${id}/milestones/${milestone.id}/edit`}
            >
              <Edit className="h-4 w-4 mr-2" />
              Edit Milestone
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
              {milestone.description ? (
                <div className="prose max-w-none">
                  <p>{milestone.description}</p>
                </div>
              ) : (
                <p className="text-muted-foreground">No description provided</p>
              )}
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
                <p className="text-sm text-muted-foreground">Due Date</p>
                {milestone.dueDate ? (
                  <div className="flex items-center">
                    <CalendarDays className="h-4 w-4 mr-1 text-muted-foreground" />
                    {format(new Date(milestone.dueDate), "PPP")}
                  </div>
                ) : (
                  <p>Not set</p>
                )}
              </div>
              <Separator />
              <div className="space-y-1">
                <p className="text-sm text-muted-foreground">Completion Date</p>
                {milestone.isCompleted ? (
                  <div className="flex items-center">
                    <CalendarDays className="h-4 w-4 mr-1 text-muted-foreground" />
                    {milestone.completedDate
                      ? format(new Date(milestone.completedDate), "PPP")
                      : "Unknown date"}
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
                  {format(new Date(milestone.createdAt), "PPP")}
                </div>
              </div>
              <Separator />
              <div className="space-y-1">
                <p className="text-sm text-muted-foreground">Updated</p>
                <div className="flex items-center">
                  <CalendarDays className="h-4 w-4 mr-1 text-muted-foreground" />
                  {format(new Date(milestone.updatedAt), "PPP")}
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
