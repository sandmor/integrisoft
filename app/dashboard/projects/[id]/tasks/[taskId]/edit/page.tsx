import { notFound } from "next/navigation";
import { db } from "@/lib/db";
import { tasks } from "@/lib/db/schema";
import { eq, and, not } from "drizzle-orm";

import { getProject } from "@/lib/actions/projects";
import { TaskForm } from "@/components/dashboard/projects/task-form";

type EditTaskPageProps = {
  params: Promise<{
    id: string;
    taskId: string;
  }>;
};

export default async function EditTaskPage({ params }: EditTaskPageProps) {
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
  });

  if (!task) {
    notFound();
  }

  const formattedTask = {
    ...task,
    description: task.description ?? undefined,
    startDate: task.startDate ? task.startDate.toISOString() : undefined,
    dueDate: task.dueDate ? task.dueDate.toISOString() : undefined,
    completedDate: task.completedDate
      ? task.completedDate.toISOString()
      : undefined,
    milestoneId: task.milestoneId ?? undefined,
    assignedToId: task.assignedToId ?? undefined,
    estimatedHours: task.estimatedHours
      ? Number(task.estimatedHours)
      : undefined,
    actualHours: task.actualHours ? Number(task.actualHours) : undefined,
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Edit Task</h1>
        <p className="text-muted-foreground">Modify task details</p>
      </div>

      <TaskForm projectId={id} task={formattedTask} isEdit />
    </div>
  );
}
