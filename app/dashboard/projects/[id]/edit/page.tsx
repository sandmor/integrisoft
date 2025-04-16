import { Suspense } from "react";
import { ProjectForm } from "@/components/dashboard/projects/project-form";
import { notFound } from "next/navigation";
import { db } from "@/lib/db";
import { projects } from "@/lib/db/schema";
import { eq, and, not } from "drizzle-orm";
import { getClients, getEmployees, getProducts } from "@/lib/actions/projects";

type EditProjectPageProps = {
  params: Promise<{
    id: string;
  }>;
};

// Fetch the project data server-side
async function getProject(id: string) {
  const [project] = await db
    .select()
    .from(projects)
    .where(and(eq(projects.id, id), not(eq(projects.isDeleted, true))));

  if (!project) {
    notFound();
  }

  return project;
}

export default async function EditProjectPage({
  params,
}: EditProjectPageProps) {
  const { id } = await params;

  const [project, employees, clients, products] = await Promise.all([
    getProject(id),
    getEmployees(),
    getClients(),
    getProducts(),
  ]);

  return (
    <div className="max-w-5xl mx-auto py-6">
      <div className="mb-8">
        <h1 className="text-2xl font-bold tracking-tight">Edit Project</h1>
        <p className="text-muted-foreground mt-2">
          Update the details for {project.name}
        </p>
      </div>

      <Suspense fallback={<div>Loading...</div>}>
        <ProjectForm
          initialData={project}
          clientOptions={clients}
          productOptions={products}
          employeeOptions={employees}
        />
      </Suspense>
    </div>
  );
}
