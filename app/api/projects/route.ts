import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import {
  projects,
  clients,
  employees,
  tasks,
  users,
  milestones,
} from "@/lib/db/schema";
import { count, eq, and, sql, not, asc, desc, like, sum } from "drizzle-orm";
import { auth } from "@/lib/auth";
import { headers } from "next/headers";
import {
  Project,
  ProjectCreateInput,
  ProjectStatus,
  PaginatedResponse,
} from "@/lib/types";

// GET /api/projects - List all projects with pagination, sorting, filtering
export async function GET(req: NextRequest) {
  try {
    const session = await auth.api.getSession({
      headers: await headers(),
    });
    if (!session || !session.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Get query parameters
    const searchParams = req.nextUrl.searchParams;
    const page = parseInt(searchParams.get("page") || "0");
    const pageSize = parseInt(searchParams.get("pageSize") || "10");
    const sortParams = searchParams.getAll("sorts");
    const filterParams = searchParams.getAll("filters");

    // Handle sort parameters
    const sortClauses = [];
    for (const sort of sortParams) {
      const [field, direction] = sort.split(":");
      if (field && (direction === "asc" || direction === "desc")) {
        // Map the field to the corresponding database column
        let column;
        switch (field) {
          case "name":
            column = projects.name;
            break;
          case "status":
            column = projects.status;
            break;
          case "startDate":
            column = projects.startDate;
            break;
          case "targetEndDate":
            column = projects.targetEndDate;
            break;
          case "budget":
            column = projects.budget;
            break;
          default:
            continue;
        }
        sortClauses.push(direction === "asc" ? asc(column) : desc(column));
      }
    }

    // Build filter conditions
    let conditions = [not(eq(projects.isDeleted, true))];
    for (const filter of filterParams) {
      const [field, value] = filter.split(":");
      if (field && value) {
        switch (field) {
          case "name":
            conditions.push(like(projects.name, `%${value}%`));
            break;
          case "status":
            conditions.push(eq(projects.status, value as ProjectStatus));
            break;
          case "clientId":
            conditions.push(eq(projects.clientId, value));
            break;
          case "managerId":
            conditions.push(eq(projects.managerId, value));
            break;
          default:
            continue;
        }
      }
    }

    // Get total count for pagination
    const [{ value: totalCount }] = await db
      .select({ value: count() })
      .from(projects)
      .where(and(...conditions));

    // Get projects with pagination and sorting
    const projectResults = await db
      .select({
        id: projects.id,
        name: projects.name,
        description: projects.description,
        status: projects.status,
        startDate: projects.startDate,
        targetEndDate: projects.targetEndDate,
        actualEndDate: projects.actualEndDate,
        clientId: projects.clientId,
        client: clients.name,
        managerId: projects.managerId,
        managerName: users.name,
        managerLastName: users.lastName,
        budget: projects.budget,
        taskCount: count(tasks.id),
        createdAt: projects.createdAt,
        updatedAt: projects.updatedAt,
      })
      .from(projects)
      .where(and(...conditions))
      .limit(pageSize)
      .offset(page * pageSize)
      .orderBy(
        ...(sortClauses.length > 0 ? sortClauses : [desc(projects.updatedAt)])
      )
      .leftJoin(employees, eq(projects.managerId, employees.id))
      .leftJoin(users, eq(employees.userId, users.id))
      .leftJoin(clients, eq(projects.clientId, clients.id))
      .leftJoin(tasks, eq(projects.id, tasks.projectId))
      .groupBy(projects.id, clients.name, users.name, users.lastName);

    // Calculate progress for each project based on task and milestone completion
    const projectsWithDetails = await Promise.all(
      projectResults.map(async (project) => {
        // Get task completion statistics
        const [taskStats] = await db
          .select({
            total: count(),
            completed: count(
              sql`CASE WHEN ${tasks.status} = 'done' THEN 1 END`
            ),
          })
          .from(tasks)
          .where(
            and(eq(tasks.projectId, project.id), not(eq(tasks.isDeleted, true)))
          );

        // Get milestone completion statistics
        const [milestoneStats] = await db
          .select({
            total: count(),
            completed: count(
              sql`CASE WHEN ${milestones.isCompleted} = true THEN 1 END`
            ),
          })
          .from(milestones)
          .where(
            and(
              eq(milestones.projectId, project.id),
              not(eq(milestones.isDeleted, true))
            )
          );

        // Calculate progress percentages
        const taskTotal = taskStats.total || 0;
        const taskCompleted = taskStats.completed || 0;
        const taskProgress =
          taskTotal > 0 ? Math.round((taskCompleted / taskTotal) * 100) : 0;

        const milestoneTotal = milestoneStats.total || 0;
        const milestoneCompleted = milestoneStats.completed || 0;
        const milestoneProgress =
          milestoneTotal > 0
            ? Math.round((milestoneCompleted / milestoneTotal) * 100)
            : 0;

        // Overall progress is weighted average of task and milestone progress
        // We give more weight to milestones as they represent major project achievements
        const progress =
          milestoneTotal > 0 && taskTotal > 0
            ? Math.round(milestoneProgress * 0.6 + taskProgress * 0.4)
            : milestoneTotal > 0
            ? milestoneProgress
            : taskTotal > 0
            ? taskProgress
            : 0;

        const projectData: Project = {
          id: project.id,
          name: project.name,
          description: project.description,
          status: project.status as ProjectStatus,
          startDate: project.startDate ? project.startDate.toISOString() : null,
          targetEndDate: project.targetEndDate
            ? project.targetEndDate.toISOString()
            : null,
          actualEndDate: project.actualEndDate
            ? project.actualEndDate.toISOString()
            : null,
          client: project.clientId
            ? {
                id: project.clientId,
                name: project.client || "",
              }
            : null,
          manager: project.managerId
            ? {
                id: project.managerId,
                name: `${project.managerName || ""} ${
                  project.managerLastName || ""
                }`.trim(),
              }
            : null,
          budget: project.budget?.toString() || undefined,
          taskCount: project.taskCount,
          progress,
          createdAt: project.createdAt.toISOString(),
          updatedAt: project.updatedAt.toISOString(),
        };

        return projectData;
      })
    );

    // Return paginated results
    const response: PaginatedResponse<Project> = {
      data: projectsWithDetails,
      totalCount,
      pageCount: Math.ceil(totalCount / pageSize),
      page,
      pageSize,
    };

    return NextResponse.json(response);
  } catch (error) {
    console.error("Error fetching projects:", error);
    return NextResponse.json(
      { error: "Failed to fetch projects" },
      { status: 500 }
    );
  }
}

// POST /api/projects - Create a new project
export async function POST(req: NextRequest) {
  try {
    const session = await auth.api.getSession({
      headers: await headers(),
    });
    if (!session || !session.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const data: ProjectCreateInput = await req.json();

    // Validate required fields
    if (!data.name) {
      return NextResponse.json(
        { error: "Project name is required" },
        { status: 400 }
      );
    }

    // Insert project
    const [newProject] = await db
      .insert(projects)
      .values({
        name: data.name,
        description: data.description,
        status: data.status || "planning",
        startDate: data.startDate ? new Date(data.startDate) : null,
        targetEndDate: data.targetEndDate ? new Date(data.targetEndDate) : null,
        clientId: data.clientId,
        productId: data.productId,
        budget: data.budget,
        managerId: data.managerId,
        createdById: session.user.id,
      })
      .returning();

    return NextResponse.json(newProject, { status: 201 });
  } catch (error) {
    console.error("Error creating project:", error);
    return NextResponse.json(
      { error: "Failed to create project" },
      { status: 500 }
    );
  }
}
