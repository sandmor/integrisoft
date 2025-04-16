import { Suspense } from "react";
import { ProjectForm } from "@/components/dashboard/projects/project-form";

export default function NewProjectPage() {
  return (
    <div className="max-w-5xl mx-auto py-6">
      <div className="mb-8">
        <h1 className="text-2xl font-bold tracking-tight">
          Create New Project
        </h1>
        <p className="text-muted-foreground mt-2">
          Fill in the details below to create a new project
        </p>
      </div>

      <Suspense fallback={<div>Loading...</div>}>
        <ProjectForm />
      </Suspense>
    </div>
  );
}
