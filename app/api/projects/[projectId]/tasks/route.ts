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
import { revalidatePath } from "next/cache";
import {
  TaskStatus,
  addTaskToOrder,
  getOrderedTasksForColumn,
  moveTaskBetweenColumnsWithPosition,
} from "@/lib/db/kanban-order";
import {
  Task,
  TaskCreateInput,
  TaskPriority,
  TasksResponse,
} from "@/lib/types";
import { validateSession } from "@/lib/permission-handler";

// GET /api/projects/[projectId]/tasks - Get all tasks for a project
export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ projectId: string }> }
) {
  if (!(await validateSession("read_tasks"))) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  try {
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
      const tasksResult: Record<TaskStatus, Task[]> = {
        todo: [],
        in_progress: [],
        review: [],
        done: [],
      };
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
                  name: sql<string>`concat(${users.name}, ' ', ${users.lastName})`,
                })
                .from(employees)
                .leftJoin(users, eq(employees.userId, users.id))
                .where(eq(employees.id, task.assignedToId))
                .then((rows) => rows[0]);

              if (assigneeData) {
                assignee = {
                  id: assigneeData.id,
                  name:
                    typeof assigneeData.name === "string"
                      ? assigneeData.name
                      : "Unknown Employee",
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

            const formattedTask: Task = {
              id: task.id,
              title: task.title,
              description: task.description,
              status: task.status as TaskStatus,
              priority: task.priority as TaskPriority,
              assignedToId: task.assignedToId,
              estimatedHours: task.estimatedHours,
              actualHours: task.actualHours,
              startDate: task.startDate ? task.startDate.toISOString() : null,
              dueDate: task.dueDate ? task.dueDate.toISOString() : null,
              completedDate: task.completedDate
                ? task.completedDate.toISOString()
                : null,
              createdAt: task.createdAt.toISOString(),
              updatedAt: task.updatedAt.toISOString(),
              milestoneId: task.milestoneId,
              projectId: task.projectId,
              assignee,
              milestone,
            };

            return formattedTask;
          })
        );

        tasksResult[status] = tasksWithDetails;
        totalCount += tasksWithDetails.length;
      }

      const response: TasksResponse = {
        data: tasksResult,
        count: totalCount,
      };

      return NextResponse.json(response);
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
          projectId: tasks.projectId,
          assigneeName: sql<string>`CASE WHEN ${employees.id} IS NOT NULL THEN concat(${users.name}, ' ', ${users.lastName}) ELSE NULL END`,
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
      const formattedTasks: Task[] = tasksWithAssignees.map((task) => {
        return {
          id: task.id,
          title: task.title,
          description: task.description,
          status: task.status as TaskStatus,
          priority: task.priority as TaskPriority,
          assignedToId: task.assignedToId,
          estimatedHours: task.estimatedHours,
          actualHours: task.actualHours,
          projectId: task.projectId,
          startDate: task.startDate ? task.startDate.toISOString() : null,
          dueDate: task.dueDate ? task.dueDate.toISOString() : null,
          completedDate: task.completedDate
            ? task.completedDate.toISOString()
            : null,
          createdAt: task.createdAt.toISOString(),
          updatedAt: task.updatedAt.toISOString(),
          milestoneId: task.milestoneId,
          assignee: task.assignedToId
            ? {
                id: task.assignedToId,
                name: task.assigneeName || "Unknown Employee",
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

      const response: TasksResponse = {
        data: formattedTasks,
        count: formattedTasks.length,
      };

      return NextResponse.json(response);
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
  const userId = await validateSession("write_tasks");

  if (!userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  try {
    const { projectId } = await params;

    const data: TaskCreateInput = await req.json();

    // Validate required fields
    if (!data.title) {
      return NextResponse.json(
        { error: "Task title is required" },
        { status: 400 }
      );
    }

    const taskId = createId();
    const taskStatus = data.status || ("todo" as TaskStatus);
    const taskPriority = data.priority || (2 as TaskPriority); // Default to medium priority

    // Insert task
    const [newTask] = await db
      .insert(tasks)
      .values({
        id: taskId,
        projectId,
        title: data.title,
        description: data.description,
        status: taskStatus,
        priority: taskPriority,
        assignedToId: data.assignedToId,
        milestoneId: data.milestoneId,
        estimatedHours: data.estimatedHours,
        dueDate: data.dueDate ? new Date(data.dueDate) : null,
        startDate: data.startDate ? new Date(data.startDate) : null,
        createdById: userId,
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
        userId: userId,
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
        projectId: tasks.projectId,
        milestoneId: tasks.milestoneId,
        assigneeName: sql<string>`CASE WHEN ${employees.id} IS NOT NULL THEN concat(${users.name}, ' ', ${users.lastName}) ELSE NULL END`,
        milestoneName: milestones.name,
      })
      .from(tasks)
      .leftJoin(employees, eq(tasks.assignedToId, employees.id))
      .leftJoin(users, eq(employees.userId, users.id))
      .leftJoin(milestones, eq(tasks.milestoneId, milestones.id))
      .where(eq(tasks.id, taskId))
      .then((rows) => rows[0]);

    // Format the response
    const formattedTask: Task = {
      id: taskWithAssignee.id,
      title: taskWithAssignee.title,
      description: taskWithAssignee.description,
      status: taskWithAssignee.status as TaskStatus,
      priority: taskWithAssignee.priority as TaskPriority,
      assignedToId: taskWithAssignee.assignedToId,
      estimatedHours: taskWithAssignee.estimatedHours,
      actualHours: taskWithAssignee.actualHours,
      projectId: taskWithAssignee.projectId,
      dueDate: taskWithAssignee.dueDate
        ? taskWithAssignee.dueDate.toISOString()
        : null,
      startDate: taskWithAssignee.startDate
        ? taskWithAssignee.startDate.toISOString()
        : null,
      completedDate: taskWithAssignee.completedDate
        ? taskWithAssignee.completedDate.toISOString()
        : null,
      createdAt: taskWithAssignee.createdAt.toISOString(),
      updatedAt: taskWithAssignee.updatedAt.toISOString(),
      milestoneId: taskWithAssignee.milestoneId,
      assignee: taskWithAssignee.assignedToId
        ? {
            id: taskWithAssignee.assignedToId,
            name: taskWithAssignee.assigneeName || "Unknown Employee",
          }
        : null,
      milestone: taskWithAssignee.milestoneId
        ? {
            id: taskWithAssignee.milestoneId,
            name: taskWithAssignee.milestoneName || `Unknown Milestone`,
          }
        : null,
    };

    // Revalidate relevant paths
    revalidatePath(`/dashboard/projects/${projectId}`);
    revalidatePath(`/dashboard/projects/${projectId}/tasks`);

    return NextResponse.json(formattedTask, { status: 201 });
  } catch (error) {
    console.error("Error creating task:", error);
    return NextResponse.json(
      { error: "Failed to create task" },
      { status: 500 }
    );
  }
}
