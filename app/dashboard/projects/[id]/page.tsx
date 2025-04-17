import Link from "next/link";
import { notFound } from "next/navigation";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { MilestonesTab } from "@/components/dashboard/projects/milestones-tab";
import { TeamMembersTab } from "@/components/dashboard/projects/team-members-tab";
import { format } from "date-fns";
import { CalendarIcon, FileText, PenSquare } from "lucide-react";
import { getEmployees, getProject } from "@/lib/actions/projects";
import { TasksTab } from "@/components/dashboard/projects/tasks-tab";

type ProjectPageProps = {
  params: Promise<{
    id: string;
  }>;
};

// Helper function to format status for display
function formatStatus(status: string) {
  const statusMap: Record<string, { label: string; variant: string }> = {
    planning: { label: "Planning", variant: "info" },
    active: { label: "Active", variant: "success" },
    on_hold: { label: "On Hold", variant: "warning" },
    completed: { label: "Completed", variant: "default" },
    cancelled: { label: "Cancelled", variant: "destructive" },
  };

  return statusMap[status] || { label: status, variant: "default" };
}

// Helper function to format date
function formatDate(date: Date | null) {
  if (!date) return "Not set";
  return format(new Date(date), "MMMM d, yyyy");
}

export default async function ProjectDetailsPage({ params }: ProjectPageProps) {
  const { id } = await params;
  const employees = await getEmployees();

  const project = await getProject(id);
  if (!project) {
    notFound();
  }

  const status = formatStatus(project.status);

  return (
    <div className="max-w-7xl mx-auto py-6">
      <div className="flex justify-between items-start mb-6">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">{project.name}</h1>
          <div className="flex items-center gap-4 mt-2">
            <Badge variant={status.variant as any}>{status.label}</Badge>
            {project.client && (
              <p className="text-muted-foreground">
                Client: {project.client.name}
              </p>
            )}
          </div>
        </div>
        <Link href={`/dashboard/projects/${id}/edit`}>
          <Button>
            <PenSquare className="mr-2 h-4 w-4" />
            Edit Project
          </Button>
        </Link>
      </div>

      <Tabs defaultValue="overview" className="mt-6">
        <TabsList>
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="tasks">Tasks</TabsTrigger>
          <TabsTrigger value="milestones">Milestones</TabsTrigger>
          <TabsTrigger value="team">Team</TabsTrigger>
          <TabsTrigger value="documents">Documents</TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="mt-6">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <Card className="md:col-span-2">
              <CardHeader>
                <CardTitle>Details</CardTitle>
              </CardHeader>
              <CardContent>
                {project.description ? (
                  <p className="text-sm text-muted-foreground mb-4">
                    {project.description}
                  </p>
                ) : (
                  <p className="text-sm text-muted-foreground mb-4 italic">
                    No description provided.
                  </p>
                )}

                <div className="space-y-4">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <h4 className="text-sm font-medium">Start Date</h4>
                      <p className="flex items-center text-sm mt-1">
                        <CalendarIcon className="mr-2 h-4 w-4 text-muted-foreground" />
                        {formatDate(project.startDate)}
                      </p>
                    </div>
                    <div>
                      <h4 className="text-sm font-medium">Target End Date</h4>
                      <p className="flex items-center text-sm mt-1">
                        <CalendarIcon className="mr-2 h-4 w-4 text-muted-foreground" />
                        {formatDate(project.targetEndDate)}
                      </p>
                    </div>
                    {(project.status === "completed" ||
                      project.status === "cancelled") && (
                      <div>
                        <h4 className="text-sm font-medium">Actual End Date</h4>
                        <p className="flex items-center text-sm mt-1">
                          <CalendarIcon className="mr-2 h-4 w-4 text-muted-foreground" />
                          {formatDate(project.actualEndDate)}
                        </p>
                      </div>
                    )}
                    {project.budget && (
                      <div>
                        <h4 className="text-sm font-medium">Budget</h4>
                        <p className="text-sm mt-1">
                          ${Number(project.budget).toLocaleString()}
                        </p>
                      </div>
                    )}
                    {project.product && (
                      <div>
                        <h4 className="text-sm font-medium">Product</h4>
                        <p className="text-sm mt-1">{project.product.name}</p>
                      </div>
                    )}
                    {project.manager && (
                      <div>
                        <h4 className="text-sm font-medium">Project Manager</h4>
                        <p className="text-sm mt-1">{project.manager.name}</p>
                      </div>
                    )}
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Project Summary</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div>
                    <p className="text-sm text-muted-foreground">Created</p>
                    <p className="text-sm font-medium">
                      {format(new Date(project.createdAt), "MMMM d, yyyy")}
                    </p>
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">
                      Last Updated
                    </p>
                    <p className="text-sm font-medium">
                      {format(new Date(project.updatedAt), "MMMM d, yyyy")}
                    </p>
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Milestones</p>
                    <p className="text-sm font-medium">
                      {project.milestones.length} total,{" "}
                      {project.milestones.filter((m) => m.isCompleted).length}{" "}
                      completed
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="tasks" className="mt-6">
          <TasksTab projectId={id} />
        </TabsContent>

        <TabsContent value="milestones" className="mt-6">
          <MilestonesTab
            projectId={id}
            initialMilestones={project.milestones}
          />
        </TabsContent>

        <TabsContent value="team" className="mt-6">
          <Card>
            <CardHeader>
              <CardTitle>Project Team</CardTitle>
              <CardDescription>
                Team members assigned to this project
              </CardDescription>
            </CardHeader>
            <CardContent>
              <TeamMembersTab
                employees={employees}
                projectId={id}
                teamMembers={project.teamMembers || []}
              />
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="documents" className="mt-6">
          <Card>
            <CardHeader>
              <CardTitle>Project Documents</CardTitle>
              <CardDescription>
                Documents related to this project
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="flex items-center justify-center p-8">
                <div className="text-center">
                  <FileText className="mx-auto h-12 w-12 text-muted-foreground" />
                  <h3 className="mt-4 text-lg font-medium">
                    Document Management Coming Soon
                  </h3>
                  <p className="mt-2 text-sm text-muted-foreground">
                    The document management feature is currently under
                    development.
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
