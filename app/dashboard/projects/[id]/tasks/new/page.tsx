import { notFound } from "next/navigation";
import { getProject } from "@/lib/actions/projects";
import { TaskForm } from "@/components/dashboard/projects/task-form";

type TaskStatus = "todo" | "in_progress" | "review" | "done";

type NewTaskPageProps = {
  params: Promise<{
    id: string;
  }>;
  searchParams: {
    status?: string;
    dueDate?: string;
  };
};

export default async function NewTaskPage({
  params,
  searchParams,
}: NewTaskPageProps) {
  const { id } = await params;

  const project = await getProject(id);

  if (!project) {
    notFound();
  }

  // Ensure status is one of the valid options
  let status: TaskStatus = "todo";
  if (
    searchParams.status &&
    ["todo", "in_progress", "review", "done"].includes(searchParams.status)
  ) {
    status = searchParams.status as TaskStatus;
  }

  const defaultValues = {
    status,
    dueDate: searchParams.dueDate ? new Date(searchParams.dueDate) : undefined,
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
