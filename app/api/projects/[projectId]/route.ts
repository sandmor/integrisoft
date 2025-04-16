import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import {
  projects,
  clients,
  employees,
  tasks,
  milestones,
  products,
  users,
  transactions,
  activitiesFeed,
} from "@/lib/db/schema";
import { eq, and, not, sql, count, sum, desc } from "drizzle-orm";
import { auth } from "@/lib/auth";
import { headers } from "next/headers";

// GET /api/projects/[projectId] - Get a single project by ID
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

    // Get basic project info
    const [project] = await db
      .select({
        id: projects.id,
        name: projects.name,
        description: projects.description,
        status: projects.status,
        startDate: projects.startDate,
        targetEndDate: projects.targetEndDate,
        actualEndDate: projects.actualEndDate,
        clientId: projects.clientId,
        clientName: clients.name,
        clientIndustry: clients.industry,
        clientWebsite: clients.website,
        managerId: projects.managerId,
        managerName: users.name,
        managerLastName: users.lastName,
        managerPosition: employees.positionId,
        managerDepartment: employees.departmentId,
        productId: projects.productId,
        productName: products.name,
        productDescription: products.description,
        budget: projects.budget,
        createdAt: projects.createdAt,
        updatedAt: projects.updatedAt,
      })
      .from(projects)
      .where(and(eq(projects.id, projectId), not(eq(projects.isDeleted, true))))
      .leftJoin(clients, eq(projects.clientId, clients.id))
      .leftJoin(users, eq(projects.managerId, employees.id))
      .leftJoin(employees, eq(users.id, employees.userId));

    if (!project) {
      return NextResponse.json({ error: "Project not found" }, { status: 404 });
    }

    // Get task completion statistics
    const [taskStats] = await db
      .select({
        total: count(),
        completed: count(sql`CASE WHEN ${tasks.status} = 'done' THEN 1 END`),
        inProgress: count(
          sql`CASE WHEN ${tasks.status} = 'in_progress' OR ${tasks.status} = 'review' THEN 1 END`
        ),
        todo: count(sql`CASE WHEN ${tasks.status} = 'todo' THEN 1 END`),
      })
      .from(tasks)
      .where(
        and(eq(tasks.projectId, projectId), not(eq(tasks.isDeleted, true)))
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
          eq(milestones.projectId, projectId),
          not(eq(milestones.isDeleted, true))
        )
      );

    // Calculate progress percentages
    const completedTasks = taskStats.completed || 0;
    const totalTasks = taskStats.total || 1; // Prevent division by zero
    const taskProgress = Math.round((completedTasks / totalTasks) * 100);

    const completedMilestones = milestoneStats.completed || 0;
    const totalMilestones = milestoneStats.total || 1; // Prevent division by zero
    const milestoneProgress = Math.round(
      (completedMilestones / totalMilestones) * 100
    );

    // Calculate overall progress
    // If there are both tasks and milestones, use a weighted average
    // Giving more weight to milestones as they represent major project achievements
    const progress =
      milestoneStats.total > 0 && taskStats.total > 0
        ? Math.round(milestoneProgress * 0.6 + taskProgress * 0.4)
        : milestoneStats.total > 0
        ? milestoneProgress
        : taskProgress;

    // Get budget data from transactions table
    const [budgetData] = await db
      .select({
        budgetSpent: sum(transactions.amount),
      })
      .from(transactions)
      .where(
        and(
          eq(transactions.projectId, projectId),
          eq(transactions.type, "expense"),
          not(eq(transactions.isDeleted, true))
        )
      );

    // Calculate budget metrics
    const totalBudget = Number(project.budget || 0);
    const budgetSpent = Number(budgetData?.budgetSpent || 0);
    const budgetRemaining = Math.max(0, totalBudget - budgetSpent);
    const budgetPercentUsed =
      totalBudget > 0 ? Math.round((budgetSpent / totalBudget) * 100) : 0;

    // Format the response
    const projectDetails = {
      id: project.id,
      name: project.name,
      description: project.description,
      status: project.status,
      startDate: project.startDate,
      targetEndDate: project.targetEndDate,
      actualEndDate: project.actualEndDate,
      client: project.clientId
        ? {
            id: project.clientId,
            name: project.clientName,
            industry: project.clientIndustry,
            website: project.clientWebsite,
          }
        : null,
      manager: project.managerId
        ? {
            id: project.managerId,
            name: project.managerName + " " + project.managerLastName,
            position: project.managerPosition,
            department: project.managerDepartment,
          }
        : null,
      progress,
      tasks: {
        total: taskStats.total,
        completed: taskStats.completed,
        inProgress: taskStats.inProgress,
        todo: taskStats.todo,
      },
      milestones: {
        total: milestoneStats.total,
        completed: milestoneStats.completed,
      },
      budget: {
        total: totalBudget,
        spent: budgetSpent,
        remaining: budgetRemaining,
        percentUsed: budgetPercentUsed,
      },
    };

    return NextResponse.json(projectDetails);
  } catch (error) {
    console.error("Error fetching project:", error);
    return NextResponse.json(
      { error: "Failed to fetch project" },
      { status: 500 }
    );
  }
}

// PATCH /api/projects/[projectId] - Update a project
export async function PATCH(
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

    // Check if project exists
    const [existingProject] = await db
      .select({ id: projects.id })
      .from(projects)
      .where(
        and(eq(projects.id, projectId), not(eq(projects.isDeleted, true)))
      );

    if (!existingProject) {
      return NextResponse.json({ error: "Project not found" }, { status: 404 });
    }

    // Update project
    const [updatedProject] = await db
      .update(projects)
      .set({
        name: data.name,
        description: data.description,
        status: data.status,
        startDate: data.startDate,
        targetEndDate: data.targetEndDate,
        actualEndDate: data.actualEndDate,
        clientId: data.clientId,
        productId: data.productId,
        budget: data.budget,
        managerId: data.managerId,
        updatedAt: new Date(),
      })
      .where(eq(projects.id, projectId))
      .returning();

    // Record the activity
    await db.insert(activitiesFeed).values({
      userId: session.user.id,
      action: "update",
      module: "projects",
      description: `Project "${data.name}" was updated`,
      projectId: projectId,
      timestamp: new Date(),
      isSystem: false,
    });

    return NextResponse.json(updatedProject);
  } catch (error) {
    console.error("Error updating project:", error);
    return NextResponse.json(
      { error: "Failed to update project" },
      { status: 500 }
    );
  }
}

// DELETE /api/projects/[projectId] - Delete a project (soft delete)
export async function DELETE(
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

    // Check if project exists
    const [existingProject] = await db
      .select({ id: projects.id, name: projects.name })
      .from(projects)
      .where(
        and(eq(projects.id, projectId), not(eq(projects.isDeleted, true)))
      );

    if (!existingProject) {
      return NextResponse.json({ error: "Project not found" }, { status: 404 });
    }

    // Soft delete project
    await db
      .update(projects)
      .set({
        isDeleted: true,
        updatedAt: new Date(),
      })
      .where(eq(projects.id, projectId));

    // Record the activity
    await db.insert(activitiesFeed).values({
      userId: session.user.id,
      action: "delete",
      module: "projects",
      description: `Project "${existingProject.name}" was deleted`,
      projectId: projectId,
      timestamp: new Date(),
      isSystem: false,
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Error deleting project:", error);
    return NextResponse.json(
      { error: "Failed to delete project" },
      { status: 500 }
    );
  }
}
