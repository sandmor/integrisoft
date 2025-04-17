import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import {
  tasks,
  employees,
  users,
  milestones,
  activitiesFeed,
} from "@/lib/db/schema";
import { eq, and, not, sql, desc } from "drizzle-orm";
import { auth } from "@/lib/auth";
import { headers } from "next/headers";
import { createId } from "@paralleldrive/cuid2";

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

    // Check if task exists and belongs to the project
    const [existingTask] = await db
      .select({
        id: tasks.id,
        title: tasks.title,
        assignedToId: tasks.assignedToId,
        status: tasks.status,
      })
      .from(tasks)
      .where(
        and(
          eq(tasks.id, taskId),
          eq(tasks.projectId, projectId),
          not(eq(tasks.isDeleted, true))
        )
      );

    if (!existingTask) {
      return NextResponse.json(
        { error: "Task not found or does not belong to this project" },
        { status: 404 }
      );
    }

    // Prepare update data
    const updateData: any = {
      ...data,
      updatedAt: new Date(),
    };

    // If marking as complete and no completedDate is provided, set it
    if (data.status === "done" && !data.completedDate) {
      updateData.completedDate = new Date();
    }

    // Update task
    const [updatedTask] = await db
      .update(tasks)
      .set(updateData)
      .where(eq(tasks.id, taskId))
      .returning();

    // Record relevant activities
    // 1. Status change
    if (data.status && data.status !== existingTask.status) {
      await db.insert(activitiesFeed).values({
        id: createId(),
        userId: session.user.id,
        action: "update_status",
        module: "tasks",
        description: `Task "${existingTask.title}" status changed to ${data.status}`,
        projectId: projectId,
        taskId: taskId,
        timestamp: new Date(),
        isSystem: false,
      });
    }

    // 2. Assignment change
    if (data.assignedToId && data.assignedToId !== existingTask.assignedToId) {
      await db.insert(activitiesFeed).values({
        id: createId(),
        userId: session.user.id,
        action: "reassign",
        module: "tasks",
        description: `Task "${existingTask.title}" was reassigned`,
        projectId: projectId,
        taskId: taskId,
        employeeId: data.assignedToId,
        timestamp: new Date(),
        isSystem: false,
      });
    }

    // Get updated task with assignee information
    const taskWithAssignee = await db
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
        assigneeName: sql`CASE WHEN ${employees.id} IS NOT NULL THEN concat(${users.name}, ' ', ${users.lastName}) ELSE NULL END`,
        milestoneName: milestones.name,
      })
      .from(tasks)
      .leftJoin(employees, eq(tasks.assignedToId, employees.id))
      .leftJoin(users, eq(employees.userId, users.id))
      .leftJoin(milestones, eq(tasks.milestoneId, milestones.id))
      .where(eq(tasks.id, taskId))
      .then((rows) => rows[0]);

    // Format the response
    const formattedTask = {
      ...taskWithAssignee,
      assignee: taskWithAssignee.assignedToId
        ? {
            id: taskWithAssignee.assignedToId,
            name: taskWithAssignee.assigneeName || `Unknown Employee`,
          }
        : null,
      milestone: taskWithAssignee.milestoneId
        ? {
            id: taskWithAssignee.milestoneId,
            name: taskWithAssignee.milestoneName || `Unknown Milestone`,
          }
        : null,
    };

    // Use consistent format with data property
    return NextResponse.json({ data: formattedTask });
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

    // Check if task exists and belongs to the project
    const [existingTask] = await db
      .select({
        id: tasks.id,
        title: tasks.title,
      })
      .from(tasks)
      .where(
        and(
          eq(tasks.id, taskId),
          eq(tasks.projectId, projectId),
          not(eq(tasks.isDeleted, true))
        )
      );

    if (!existingTask) {
      return NextResponse.json(
        { error: "Task not found or does not belong to this project" },
        { status: 404 }
      );
    }

    // Soft delete task
    await db
      .update(tasks)
      .set({
        isDeleted: true,
        updatedAt: new Date(),
      })
      .where(eq(tasks.id, taskId));

    // Record the activity
    await db.insert(activitiesFeed).values({
      id: createId(),
      userId: session.user.id,
      action: "delete",
      module: "tasks",
      description: `Task "${existingTask.title}" was deleted`,
      projectId: projectId,
      taskId: taskId,
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
