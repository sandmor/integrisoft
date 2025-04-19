import { notFound } from "next/navigation";
import { getProject } from "@/lib/actions/projects";
import { TaskForm } from "@/components/dashboard/projects/task-form";

type TaskStatus = "todo" | "in_progress" | "review" | "done";

type NewTaskPageProps = {
  params: Promise<{
    id: string;
  }>;
  searchParams: Promise<{
    status?: string;
    dueDate?: string;
  }>;
};

export default async function NewTaskPage({
  params,
  searchParams,
}: NewTaskPageProps) {
  const { id } = await params;
  const { status: providedStatus, dueDate } = await searchParams;

  const project = await getProject(id);

  if (!project) {
    notFound();
  }

  // Ensure status is one of the valid options
  let status: TaskStatus = "todo";
  if (
    providedStatus &&
    ["todo", "in_progress", "review", "done"].includes(providedStatus)
  ) {
    status = providedStatus as TaskStatus;
  }

  const defaultValues = {
    status,
    dueDate: dueDate ? new Date(dueDate) : undefined,
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Create New Task</h1>
        <p className="text-muted-foreground">
          Add a new task to project: {project.name}
        </p>
      </div>

      <TaskForm projectId={id} defaultValues={defaultValues} />
    </div>
  );
}
