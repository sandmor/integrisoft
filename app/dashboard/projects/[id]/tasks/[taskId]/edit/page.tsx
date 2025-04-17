import { notFound } from "next/navigation";
import { db } from "@/lib/db";
import { tasks } from "@/lib/db/schema";
import { eq, and, isNull } from "drizzle-orm";

import { getProject } from "@/lib/actions/projects";
import { TaskForm } from "@/components/dashboard/projects/task-form";

type EditTaskPageProps = {
  params: {
    id: string;
    taskId: string;
  };
};

export default async function EditTaskPage({ params }: EditTaskPageProps) {
  const project = await getProject(params.id);

  if (!project) {
    notFound();
  }

  const task = await db.query.tasks.findFirst({
    where: and(
      eq(tasks.id, params.taskId),
      eq(tasks.projectId, params.id),
      isNull(tasks.isDeleted)
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

      <TaskForm projectId={params.id} task={formattedTask} isEdit />
    </div>
  );
}
