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

// GET /api/projects/[projectId]/tasks - Get all tasks for a project
export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ projectId: string }> }
) {
  try {
    const session = await auth.api.getSession({
      headers: await headers(),
    });
    if (!session || !session.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { projectId } = await params;

    // Get all tasks for the project with assignee information
    const tasksWithAssignees = await db
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
        and(eq(tasks.projectId, projectId), not(eq(tasks.isDeleted, true)))
      )
      .orderBy(desc(tasks.updatedAt));

    // Format the response data
    const formattedTasks = tasksWithAssignees.map((task) => {
      return {
        ...task,
        assignee: task.assignedToId
          ? {
              id: task.assignedToId,
              name: task.assigneeName || `Unknown Employee`,
            }
          : null,
        milestone: task.milestoneId
          ? {
              id: task.milestoneId,
              name: task.milestoneName || `Unknown Milestone`,
            }
          : null,
      };
    });

    return NextResponse.json({
      data: formattedTasks,
      count: formattedTasks.length,
    });
  } catch (error) {
    console.error("Error fetching project tasks:", error);
    return NextResponse.json(
      { error: "Failed to fetch tasks" },
      { status: 500 }
    );
  }
}

// POST /api/projects/[projectId]/tasks - Create a new task for a project
export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ projectId: string }> }
) {
  try {
    const session = await auth.api.getSession({
      headers: await headers(),
    });
    if (!session || !session.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { projectId } = await params;
    const data = await req.json();

    // Validate required fields
    if (!data.title) {
      return NextResponse.json(
        { error: "Task title is required" },
        { status: 400 }
      );
    }

    const taskId = createId();

    // Insert task
    const [newTask] = await db
      .insert(tasks)
      .values({
        id: taskId,
        projectId,
        title: data.title,
        description: data.description,
        status: data.status || "todo",
        priority: data.priority || 2, // Default to medium priority
        assignedToId: data.assignedToId,
        milestoneId: data.milestoneId,
        estimatedHours: data.estimatedHours,
        dueDate: data.dueDate,
        startDate: data.startDate,
        createdById: session.user.id,
        createdAt: new Date(),
        updatedAt: new Date(),
        isDeleted: false,
      })
      .returning();

    // If an assignee is specified, add an activity record
    if (data.assignedToId) {
      await db.insert(activitiesFeed).values({
        id: createId(),
        userId: session.user.id,
        action: "assign",
        module: "tasks",
        description: `Task "${data.title}" was assigned`,
        projectId: projectId,
        taskId: taskId,
        employeeId: data.assignedToId,
        timestamp: new Date(),
        isSystem: false,
      });
    }

    // Get complete task data with assignee information to return
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

    return NextResponse.json(formattedTask, { status: 201 });
  } catch (error) {
    console.error("Error creating task:", error);
    return NextResponse.json(
      { error: "Failed to create task" },
      { status: 500 }
    );
  }
}
