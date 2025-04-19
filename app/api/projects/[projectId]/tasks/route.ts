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
import {
  TaskStatus,
  addTaskToOrder,
  getOrderedTasksForColumn,
} from "@/lib/db/kanban-order";

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
    const url = new URL(req.url);
    const orderByStatus = url.searchParams.get("orderByStatus") === "true";

    if (orderByStatus) {
      // Get tasks for kanban board view, organized by status columns
      const statusList: TaskStatus[] = [
        "todo",
        "in_progress",
        "review",
        "done",
      ];

      // Create a result object to hold tasks for each status
      const tasksResult: Record<string, any[]> = {};
      let totalCount = 0;

      // Get tasks for each status column with proper ordering
      for (const status of statusList) {
        const columnTasks = await getOrderedTasksForColumn(projectId, status);

        // Get assignee and milestone information for these tasks
        const tasksWithDetails = await Promise.all(
          columnTasks.map(async (task) => {
            let assignee = null;
            let milestone = null;

            if (task.assignedToId) {
              const assigneeData = await db
                .select({
                  id: employees.id,
                  name: sql`concat(${users.name}, ' ', ${users.lastName})`,
                })
                .from(employees)
                .leftJoin(users, eq(employees.userId, users.id))
                .where(eq(employees.id, task.assignedToId))
                .then((rows) => rows[0]);

              if (assigneeData) {
                assignee = {
                  id: assigneeData.id,
                  name: assigneeData.name || "Unknown Employee",
                };
              }
            }

            if (task.milestoneId) {
              const milestoneData = await db
                .select({
                  id: milestones.id,
                  name: milestones.name,
                })
                .from(milestones)
                .where(eq(milestones.id, task.milestoneId))
                .then((rows) => rows[0]);

              if (milestoneData) {
                milestone = {
                  id: milestoneData.id,
                  name: milestoneData.name,
                };
              }
            }

            return {
              ...task,
              createdAt: task.createdAt.toISOString(),
              updatedAt: task.updatedAt.toISOString(),
              startDate: task.startDate ? task.startDate.toISOString() : null,
              dueDate: task.dueDate ? task.dueDate.toISOString() : null,
              completedDate: task.completedDate
                ? task.completedDate.toISOString()
                : null,
              assignee,
              milestone,
            };
          })
        );

        tasksResult[status] = tasksWithDetails;
        totalCount += tasksWithDetails.length;
      }

      return NextResponse.json({
        data: tasksResult,
        count: totalCount,
      });
    } else {
      // Get tasks for standard list/calendar views
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
          createdAt: task.createdAt.toISOString(),
          updatedAt: task.updatedAt.toISOString(),
          startDate: task.startDate ? task.startDate.toISOString() : null,
          dueDate: task.dueDate ? task.dueDate.toISOString() : null,
          completedDate: task.completedDate
            ? task.completedDate.toISOString()
            : null,
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
    }
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
    const taskStatus = data.status || ("todo" as TaskStatus);

    // Insert task
    const [newTask] = await db
      .insert(tasks)
      .values({
        id: taskId,
        projectId,
        title: data.title,
        description: data.description,
        status: taskStatus,
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

    // Add task to the kanban board order for its status
    await addTaskToOrder(projectId, taskStatus, taskId);

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
