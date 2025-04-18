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
import { auth } from "@/lib/auth";
import { headers } from "next/headers";
import { createId } from "@paralleldrive/cuid2";
import {
  TaskStatus,
  moveTaskBetweenColumns,
  moveTaskBetweenColumnsWithPosition,
} from "@/lib/db/kanban-order";

// GET /api/projects/[projectId]/tasks/[taskId] - Get a single task
export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ projectId: string; taskId: string }> }
) {
  try {
    const session = await auth.api.getSession({
      headers: await headers(),
    });
    if (!session || !session.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { projectId, taskId } = await params;

    // Retrieve task with relationships
    const taskWithDetails = await db
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
        milestoneId: tasks.milestoneId,
        projectId: tasks.projectId,
        assigneeName: sql`CASE WHEN ${employees.id} IS NOT NULL THEN concat(${users.name}, ' ', ${users.lastName}) ELSE NULL END`,
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
      )
      .then((rows) => rows[0]);

    if (!taskWithDetails) {
      return NextResponse.json({ error: "Task not found" }, { status: 404 });
    }

    // Format the response
    const formattedTask = {
      ...taskWithDetails,
      assignee: taskWithDetails.assignedToId
        ? {
            id: taskWithDetails.assignedToId,
            name: taskWithDetails.assigneeName || `Unknown Employee`,
          }
        : null,
      milestone: taskWithDetails.milestoneId
        ? {
            id: taskWithDetails.milestoneId,
            name: taskWithDetails.milestoneName || `Unknown Milestone`,
          }
        : null,
    };

    // Use consistent format with data property
    return NextResponse.json({ data: formattedTask });
  } catch (error) {
    console.error("Error retrieving task:", error);
    return NextResponse.json(
      { error: "Failed to retrieve task" },
      { status: 500 }
    );
  }
}

// PATCH /api/projects/[projectId]/tasks/[taskId] - Update a task
export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ projectId: string; taskId: string }> }
) {
  try {
    const session = await auth.api.getSession({
      headers: await headers(),
    });
    if (!session || !session.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { projectId, taskId } = await params;
    const data = await req.json();

    // Find the current task data to check for status changes
    const currentTask = await db
      .select()
      .from(tasks)
      .where(
        and(
          eq(tasks.id, taskId),
          eq(tasks.projectId, projectId),
          not(eq(tasks.isDeleted, true))
        )
      )
      .then((rows) => rows[0]);

    if (!currentTask) {
      return NextResponse.json({ error: "Task not found" }, { status: 404 });
    }

    // Handle status changes with position index for kanban board
    if (data.status && data.status !== currentTask.status) {
      // If position index is provided, insert at specific position
      if (data.positionIndex !== undefined) {
        await moveTaskBetweenColumnsWithPosition(
          projectId,
          taskId,
          currentTask.status as TaskStatus,
          data.status as TaskStatus,
          data.positionIndex
        );
      } else {
        // Otherwise, just move it to the new column (default behavior)
        await moveTaskBetweenColumns(
          projectId,
          taskId,
          currentTask.status as TaskStatus,
          data.status as TaskStatus
        );
      }
    }

    // If task is completed, set the completedDate
    if (data.status === "done" && currentTask.status !== "done") {
      data.completedDate = data.completedDate || new Date();
    }

    // If task is moved out of done, clear completedDate
    if (
      data.status &&
      data.status !== "done" &&
      currentTask.status === "done"
    ) {
      data.completedDate = null;
    }

    // Remove the positionIndex from data as it's not a column in the tasks table
    if ("positionIndex" in data) {
      delete data.positionIndex;
    }

    // Update the task
    const [updatedTask] = await db
      .update(tasks)
      .set({
        ...data,
        updatedAt: new Date(),
      })
      .where(eq(tasks.id, taskId))
      .returning();

    // Get complete task data with assignee and milestone information
    const taskWithDetails = await db
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
        milestoneId: tasks.milestoneId,
        projectId: tasks.projectId,
        assigneeName: sql`CASE WHEN ${employees.id} IS NOT NULL THEN concat(${users.name}, ' ', ${users.lastName}) ELSE NULL END`,
        milestoneName: milestones.name,
      })
      .from(tasks)
      .leftJoin(employees, eq(tasks.assignedToId, employees.id))
      .leftJoin(users, eq(employees.userId, users.id))
      .leftJoin(milestones, eq(tasks.milestoneId, milestones.id))
      .where(eq(tasks.id, taskId))
      .then((rows) => rows[0]);

    // Format the response data
    const formattedTask = {
      ...taskWithDetails,
      assignee: taskWithDetails.assignedToId
        ? {
            id: taskWithDetails.assignedToId,
            name: taskWithDetails.assigneeName || `Unknown Employee`,
          }
        : null,
      milestone: taskWithDetails.milestoneId
        ? {
            id: taskWithDetails.milestoneId,
            name: taskWithDetails.milestoneName || `Unknown Milestone`,
          }
        : null,
    };

    // Record an activity for status change
    if (data.status && data.status !== currentTask.status) {
      await db.insert(activitiesFeed).values({
        id: createId(),
        userId: session.user.id,
        action: "update",
        module: "tasks",
        description: `Task "${currentTask.title}" status changed from "${currentTask.status}" to "${data.status}"`,
        projectId: projectId,
        taskId: taskId,
        timestamp: new Date(),
        isSystem: true,
      });
    }

    return NextResponse.json(formattedTask);
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
  try {
    const session = await auth.api.getSession({
      headers: await headers(),
    });
    if (!session || !session.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { projectId, taskId } = await params;

    // Get the task before deletion to know its status
    const taskToDelete = await db.query.tasks.findFirst({
      where: and(
        eq(tasks.id, taskId),
        eq(tasks.projectId, projectId),
        not(eq(tasks.isDeleted, true))
      ),
    });

    if (!taskToDelete) {
      return NextResponse.json({ error: "Task not found" }, { status: 404 });
    }

    const status = taskToDelete.status as TaskStatus;

    // Soft delete the task by setting isDeleted to true
    await db
      .update(tasks)
      .set({
        isDeleted: true,
        updatedAt: new Date(),
      })
      .where(
        and(
          eq(tasks.id, taskId),
          eq(tasks.projectId, projectId),
          not(eq(tasks.isDeleted, true))
        )
      );

    // Remove the task ID from the kanban board order arrays
    await moveTaskBetweenColumns(projectId, taskId, status, status);

    // Log deletion activity
    await db.insert(activitiesFeed).values({
      id: createId(),
      userId: session.user.id,
      action: "delete",
      module: "tasks",
      description: `Task "${taskToDelete.title}" was deleted`,
      projectId,
      timestamp: new Date(),
      isSystem: false,
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Error deleting task:", error);
    return NextResponse.json(
      { error: "Failed to delete task" },
      { status: 500 }
    );
  }
}
