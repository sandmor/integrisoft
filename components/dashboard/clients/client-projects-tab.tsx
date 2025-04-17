"use client";

import Link from "next/link";
import { CalendarDays, FileBox, Plus } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Spinner } from "@/components/ui/spinner";
import {
  Card,
  CardContent,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { formatDate } from "@/lib/utils";
import { useGetProjectsByClientQuery } from "@/lib/redux/projectsApi";
import type { Project } from "@/lib/redux/projectsApi";

interface ClientProjectsTabProps {
  clientId: string;
  projects: Project[];
}

export function ClientProjectsTab({
  clientId,
  projects: initialProjects,
}: ClientProjectsTabProps) {
  const statusColors: Record<string, string> = {
    planning: "bg-blue-100 text-blue-800",
    active: "bg-green-100 text-green-800",
    on_hold: "bg-amber-100 text-amber-800",
    completed: "bg-slate-100 text-slate-800",
    cancelled: "bg-red-100 text-red-800",
  };

  const { data: paginatedData, isLoading } = useGetProjectsByClientQuery(
    clientId,
    {
      skip: initialProjects.length > 0,
    }
  );

  const projects = paginatedData?.data || initialProjects;

  const formatStatus = (status: string) => {
    return status
      .replace("_", " ")
      .replace(/\b\w/g, (char) => char.toUpperCase());
  };

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <h3 className="text-lg font-medium">Client Projects</h3>
        <Button asChild size="sm">
          <Link href={`/dashboard/projects/new?clientId=${clientId}`}>
            <Plus className="mr-2 h-4 w-4" />
            New Project
          </Link>
        </Button>
      </div>

      {isLoading ? (
        <div className="flex justify-center items-center py-12">
          <Spinner />
          <span className="ml-3">Loading projects...</span>
        </div>
      ) : projects.length === 0 ? (
        <Card>
          <CardContent className="p-6 text-center text-muted-foreground">
            No projects for this client yet. Create a new project to get
            started.
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {projects.map((project) => (
            <Card key={project.id}>
              <CardHeader className="pb-2">
                <div className="flex justify-between items-start">
                  <CardTitle className="text-base">
                    <Link
                      href={`/dashboard/projects/${project.id}`}
                      className="hover:text-blue-600 hover:underline flex items-center"
                    >
                      <FileBox className="mr-2 h-4 w-4" />
                      {project.name}
                    </Link>
                  </CardTitle>
                  <Badge className={statusColors[project.status] || ""}>
                    {formatStatus(project.status)}
                  </Badge>
                </div>
              </CardHeader>
              <CardContent className="py-2">
                {project.description && (
                  <p className="text-sm text-muted-foreground line-clamp-2">
                    {project.description}
                  </p>
                )}
              </CardContent>
              <CardFooter className="text-xs text-muted-foreground pt-0 flex flex-col items-start">
                {(project.startDate || project.targetEndDate) && (
                  <div className="flex items-center mb-1">
                    <CalendarDays className="mr-2 h-3 w-3" />
                    {project.startDate && formatDate(project.startDate)}
                    {project.startDate && project.targetEndDate && " - "}
                    {project.targetEndDate && formatDate(project.targetEndDate)}
                  </div>
                )}
                {project.manager && (
                  <div>
                    Manager:{" "}
                    <Link
                      href={`/dashboard/employees/${project.manager.id}`}
                      className="text-blue-600 hover:underline"
                    >
                      {project.manager.name}
                    </Link>
                  </div>
                )}
              </CardFooter>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
