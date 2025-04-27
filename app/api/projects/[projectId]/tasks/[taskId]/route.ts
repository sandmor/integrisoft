import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import {
  tasks,
  employees,
  users,
  milestones,
  activitiesFeed,
} from "@/lib/db/schema";
import { eq, and, not, sql } from "drizzle-orm";
import { validateSession } from "@/lib/permission-handler";
import { headers } from "next/headers";
import { createId } from "@paralleldrive/cuid2";
import { revalidatePath } from "next/cache";
import {
  moveTaskBetweenColumns,
  removeTaskFromOrder,
} from "@/lib/db/kanban-order";
import {
  Task,
  TaskResponse,
  TaskStatus,
  TaskPriority,
  TaskUpdateInput,
} from "@/lib/types";

// GET /api/projects/[projectId]/tasks/[taskId] - Get a single task by ID
export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ projectId: string; taskId: string }> }
) {
  if (!(await validateSession("read_tasks"))) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  try {
    const { projectId, taskId } = await params;

    // Get task with related data
    const [taskWithDetails] = await db
      .select({
        id: tasks.id,
        title: tasks.title,
        description: tasks.description,
        status: tasks.status,
        priority: tasks.priority,
        assignedToId: tasks.assignedToId,
        estimatedHours: tasks.estimatedHours,
        actualHours: tasks.actualHours,
        dueDate: tasks.dueDate,
        startDate: tasks.startDate,
        completedDate: tasks.completedDate,
        createdAt: tasks.createdAt,
        updatedAt: tasks.updatedAt,
        projectId: tasks.projectId,
        milestoneId: tasks.milestoneId,
        assigneeName: sql<string>`CASE WHEN ${employees.id} IS NOT NULL THEN concat(${users.name}, ' ', ${users.lastName}) ELSE NULL END`,
        milestoneName: milestones.name,
      })
      .from(tasks)
      .leftJoin(employees, eq(tasks.assignedToId, employees.id))
      .leftJoin(users, eq(employees.userId, users.id))
      .leftJoin(milestones, eq(tasks.milestoneId, milestones.id))
      .where(
        and(
          eq(tasks.id, taskId),
          eq(tasks.projectId, projectId),
          not(eq(tasks.isDeleted, true))
        )
      );

    if (!taskWithDetails) {
      return NextResponse.json({ error: "Task not found" }, { status: 404 });
    }

    // Format the response
    const formattedTask: Task = {
      id: taskWithDetails.id,
      title: taskWithDetails.title,
      description: taskWithDetails.description,
      status: taskWithDetails.status as TaskStatus,
      priority: taskWithDetails.priority as TaskPriority,
      assignedToId: taskWithDetails.assignedToId,
      estimatedHours: taskWithDetails.estimatedHours,
      actualHours: taskWithDetails.actualHours,
      projectId: taskWithDetails.projectId,
      startDate: taskWithDetails.startDate
        ? taskWithDetails.startDate.toISOString()
        : null,
      dueDate: taskWithDetails.dueDate
        ? taskWithDetails.dueDate.toISOString()
        : null,
      completedDate: taskWithDetails.completedDate
        ? taskWithDetails.completedDate.toISOString()
        : null,
      createdAt: taskWithDetails.createdAt.toISOString(),
      updatedAt: taskWithDetails.updatedAt.toISOString(),
      milestoneId: taskWithDetails.milestoneId,
      assignee: taskWithDetails.assignedToId
        ? {
            id: taskWithDetails.assignedToId,
            name: taskWithDetails.assigneeName || "Unknown Employee",
          }
        : null,
      milestone: taskWithDetails.milestoneId
        ? {
            id: taskWithDetails.milestoneId,
            name: taskWithDetails.milestoneName || `Unknown Milestone`,
          }
        : null,
    };

    const response: TaskResponse = {
      data: formattedTask,
    };

    return NextResponse.json(response);
  } catch (error) {
    console.error("Error fetching task:", error);
    return NextResponse.json(
      { error: "Failed to fetch task" },
      { status: 500 }
    );
  }
}

// PATCH /api/projects/[projectId]/tasks/[taskId] - Update a task
export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ projectId: string; taskId: string }> }
) {
  const userId = await validateSession("write_tasks");
  if (!userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  try {
    const { projectId, taskId } = await params;

    const data: TaskUpdateInput = await req.json();
    const isStatusChange = data.status !== undefined;
    const wasAssignedTo = data.assignedToId !== undefined;

    // Get current task to compare changes
    const [existingTask] = await db
      .select()
      .from(tasks)
      .where(
        and(
          eq(tasks.id, taskId),
          eq(tasks.projectId, projectId),
          not(eq(tasks.isDeleted, true))
        )
      );

    if (!existingTask) {
      return NextResponse.json({ error: "Task not found" }, { status: 404 });
    }

    // Prepare updates
    const updateData: Record<string, any> = {
      updatedAt: new Date(),
      ...data,
    };

    // Handle date fields properly
    if (data.startDate) {
      updateData.startDate = new Date(data.startDate);
    }
    if (data.dueDate) {
      updateData.dueDate = new Date(data.dueDate);
    }
    if (data.completedDate) {
      updateData.completedDate = new Date(data.completedDate);
    } else if (data.status === "done" && !existingTask.completedDate) {
      // Automatically set completion date when moved to done
      updateData.completedDate = new Date();
    }

    // Update task in database
    const [updatedTask] = await db
      .update(tasks)
      .set(updateData)
      .where(
        and(
          eq(tasks.id, taskId),
          eq(tasks.projectId, projectId),
          not(eq(tasks.isDeleted, true))
        )
      )
      .returning();

    if (!updatedTask) {
      return NextResponse.json(
        { error: "Failed to update task" },
        { status: 500 }
      );
    }

    // Handle status change - update kanban order if needed
    if (isStatusChange && existingTask.status !== data.status) {
      await moveTaskBetweenColumns(
        projectId,
        taskId,
        existingTask.status as TaskStatus,
        data.status as TaskStatus
      );
    }

    // Create activity entry if the task was assigned
    if (wasAssignedTo && existingTask.assignedToId !== data.assignedToId) {
      await db.insert(activitiesFeed).values({
        id: createId(),
        userId: userId,
        action: data.assignedToId ? "assign" : "unassign",
        module: "tasks",
        description: data.assignedToId
          ? `Task "${existingTask.title}" was assigned`
          : `Task "${existingTask.title}" was unassigned`,
        projectId: projectId,
        taskId: taskId,
        employeeId: data.assignedToId || existingTask.assignedToId,
        timestamp: new Date(),
        isSystem: false,
      });
    }

    // Get full updated task with related data for response
    const [taskWithDetails] = await db
      .select({
        id: tasks.id,
        title: tasks.title,
        description: tasks.description,
        status: tasks.status,
        priority: tasks.priority,
        assignedToId: tasks.assignedToId,
        estimatedHours: tasks.estimatedHours,
        actualHours: tasks.actualHours,
        dueDate: tasks.dueDate,
        startDate: tasks.startDate,
        completedDate: tasks.completedDate,
        createdAt: tasks.createdAt,
        updatedAt: tasks.updatedAt,
        projectId: tasks.projectId,
        milestoneId: tasks.milestoneId,
        assigneeName: sql<string>`CASE WHEN ${employees.id} IS NOT NULL THEN concat(${users.name}, ' ', ${users.lastName}) ELSE NULL END`,
        milestoneName: milestones.name,
      })
      .from(tasks)
      .leftJoin(employees, eq(tasks.assignedToId, employees.id))
      .leftJoin(users, eq(employees.userId, users.id))
      .leftJoin(milestones, eq(tasks.milestoneId, milestones.id))
      .where(
        and(
          eq(tasks.id, taskId),
          eq(tasks.projectId, projectId),
          not(eq(tasks.isDeleted, true))
        )
      );

    // Format the response
    const formattedTask: Task = {
      id: taskWithDetails.id,
      title: taskWithDetails.title,
      description: taskWithDetails.description,
      status: taskWithDetails.status as TaskStatus,
      priority: taskWithDetails.priority as TaskPriority,
      assignedToId: taskWithDetails.assignedToId,
      estimatedHours: taskWithDetails.estimatedHours,
      actualHours: taskWithDetails.actualHours,
      projectId: taskWithDetails.projectId,
      startDate: taskWithDetails.startDate
        ? taskWithDetails.startDate.toISOString()
        : null,
      dueDate: taskWithDetails.dueDate
        ? taskWithDetails.dueDate.toISOString()
        : null,
      completedDate: taskWithDetails.completedDate
        ? taskWithDetails.completedDate.toISOString()
        : null,
      createdAt: taskWithDetails.createdAt.toISOString(),
      updatedAt: taskWithDetails.updatedAt.toISOString(),
      milestoneId: taskWithDetails.milestoneId,
      assignee: taskWithDetails.assignedToId
        ? {
            id: taskWithDetails.assignedToId,
            name: taskWithDetails.assigneeName || "Unknown Employee",
          }
        : null,
      milestone: taskWithDetails.milestoneId
        ? {
            id: taskWithDetails.milestoneId,
            name: taskWithDetails.milestoneName || `Unknown Milestone`,
          }
        : null,
    };

    const response: TaskResponse = {
      data: formattedTask,
    };

    // Revalidate relevant paths
    revalidatePath(`/dashboard/projects/${projectId}`);
    revalidatePath(`/dashboard/projects/${projectId}/tasks`);
    revalidatePath(`/dashboard/projects/${projectId}/tasks/${taskId}`);

    return NextResponse.json(response);
  } catch (error) {
    console.error("Error updating task:", error);
    return NextResponse.json(
      { error: "Failed to update task" },
      { status: 500 }
    );
  }
}

// DELETE /api/projects/[projectId]/tasks/[taskId] - Delete a task (soft delete)
export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ projectId: string; taskId: string }> }
) {
  if (!(await validateSession("write_tasks"))) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  try {
    const { projectId, taskId } = await params;

    // Check if task exists and get its status
    const [existingTask] = await db
      .select({ status: tasks.status })
      .from(tasks)
      .where(
        and(
          eq(tasks.id, taskId),
          eq(tasks.projectId, projectId),
          not(eq(tasks.isDeleted, true))
        )
      );

    if (!existingTask) {
      return NextResponse.json({ error: "Task not found" }, { status: 404 });
    }

    // Soft delete task
    await db
      .update(tasks)
      .set({
        isDeleted: true,
        updatedAt: new Date(),
      })
      .where(eq(tasks.id, taskId));

    // Remove task from kanban order
    try {
      await removeTaskFromOrder(
        projectId,
        existingTask.status as TaskStatus,
        taskId
      );
    } catch (error) {
      console.error("Error removing task from order:", error);
      // Continue with the response as we only log the error but don't fail the request
    }

    // Revalidate relevant paths
    revalidatePath(`/dashboard/projects/${projectId}`);
    revalidatePath(`/dashboard/projects/${projectId}/tasks`);

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Error deleting task:", error);
    return NextResponse.json(
      { error: "Failed to delete task" },
      { status: 500 }
    );
  }
}
