"use server";

import { db } from "@/lib/db";
import {
  clients,
  employees,
  milestones,
  products,
  projects,
  users,
  projectTeamMembers,
  tasks,
} from "@/lib/db/schema";
import { eq, not, and, sql } from "drizzle-orm";
import { createId } from "@paralleldrive/cuid2";
import { auth } from "@/lib/auth";
import { headers } from "next/headers";
import { revalidatePath } from "next/cache";
import { notFound } from "next/navigation";
import { TaskStatus, getOrderedTasksForColumn } from "@/lib/db/kanban-order";

// Type definition for project data
export type ProjectData = {
  name: string;
  description?: string;
  status: "planning" | "active" | "on_hold" | "completed" | "cancelled";
  startDate?: Date | null;
  targetEndDate?: Date | null;
  budget?: number;
  clientId?: string;
  productId?: string;
  managerId?: string;
};

/**
 * Create a new project in the database
 * @param data - Project data for creation
 * @returns The ID of the created project
 */
export async function createProject(data: ProjectData): Promise<string> {
  // Get current user from auth session
  const session = await auth.api.getSession({
    headers: await headers(),
  });
  const userId = session?.user?.id;

  if (!userId) {
    throw new Error("Unauthorized");
  }

  const id = createId();
  const timestamp = new Date();

  // Insert the new project
  await db.insert(projects).values({
    id,
    name: data.name,
    description: data.description || null,
    status: data.status,
    startDate: data.startDate || null,
    targetEndDate: data.targetEndDate || null,
    budget: data.budget?.toString() || null,
    clientId: data.clientId || null,
    productId: data.productId || null,
    managerId: data.managerId || null,
    createdById: userId,
    createdAt: timestamp,
    updatedAt: timestamp,
    isDeleted: false,
  });

  // Revalidate the projects page to show the new project
  revalidatePath("/dashboard/projects");

  return id;
}

/**
 * Update an existing project in the database
 * @param id - The ID of the project to update
 * @param data - Project data for update
 * @returns The ID of the updated project
 */
export async function updateProject(
  id: string,
  data: ProjectData
): Promise<string> {
  // Get current user from auth session
  const session = await auth.api.getSession({
    headers: await headers(),
  });
  const userId = session?.user?.id;

  if (!userId) {
    throw new Error("Unauthorized");
  }

  // Update the project
  await db
    .update(projects)
    .set({
      name: data.name,
      description: data.description || null,
      status: data.status,
      startDate: data.startDate || null,
      targetEndDate: data.targetEndDate || null,
      budget: data.budget?.toString() || null,
      clientId: data.clientId || null,
      productId: data.productId || null,
      managerId: data.managerId || null,
      updatedAt: new Date(),
    })
    .where(eq(projects.id, id));

  // Revalidate both the project details page and the projects list
  revalidatePath(`/dashboard/projects/${id}`);
  revalidatePath("/dashboard/projects");

  return id;
}

export async function getProject(id: string) {
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
      managerId: projects.managerId,
      managerName: users.name,
      managerLastName: users.lastName,
      productId: projects.productId,
      productName: products.name,
      productDescription: products.description,
      budget: projects.budget,
      createdAt: projects.createdAt,
      updatedAt: projects.updatedAt,
    })
    .from(projects)
    .where(and(eq(projects.id, id), not(eq(projects.isDeleted, true))))
    .leftJoin(clients, eq(projects.clientId, clients.id))
    .leftJoin(employees, eq(projects.managerId, employees.id))
    .leftJoin(users, eq(users.id, employees.userId))
    .leftJoin(products, eq(projects.productId, products.id));

  if (!project) {
    notFound();
  }

  // Get project milestones
  const projectMilestones = await db
    .select({
      id: milestones.id,
      name: milestones.name,
      description: milestones.description,
      dueDate: milestones.dueDate,
      completedDate: milestones.completedDate,
      isCompleted: milestones.isCompleted,
      createdAt: milestones.createdAt,
      updatedAt: milestones.updatedAt,
    })
    .from(milestones)
    .where(
      and(eq(milestones.projectId, id), not(eq(milestones.isDeleted, true)))
    )
    .orderBy(milestones.dueDate);

  // Get project team members
  const teamMembers = await db
    .select({
      id: projectTeamMembers.id,
      employeeId: projectTeamMembers.employeeId,
      role: projectTeamMembers.role,
      allocationPercentage: projectTeamMembers.allocationPercentage,
      startDate: projectTeamMembers.startDate,
      endDate: projectTeamMembers.endDate,
      employeeName: users.name,
      employeeLastName: users.lastName,
    })
    .from(projectTeamMembers)
    .where(
      and(
        eq(projectTeamMembers.projectId, id),
        not(eq(projectTeamMembers.isDeleted, true))
      )
    )
    .leftJoin(employees, eq(projectTeamMembers.employeeId, employees.id))
    .leftJoin(users, eq(employees.userId, users.id))
    .orderBy(users.name);

  // Get tasks for kanban board view, organized by status columns
  const statusList: TaskStatus[] = ["todo", "in_progress", "review", "done"];

  // Create a result object to hold tasks for each status
  const tasksResult: Record<string, any[]> = {};
  let totalCount = 0;

  // Get tasks for each status column with proper ordering
  for (const status of statusList) {
    const columnTasks = await getOrderedTasksForColumn(id, status);

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

  return {
    id: project.id,
    name: project.name,
    description: project.description,
    status: project.status,
    startDate: project.startDate?.toISOString(),
    targetEndDate: project.targetEndDate?.toISOString(),
    actualEndDate: project.actualEndDate?.toISOString(),
    client: project.clientId
      ? {
          id: project.clientId,
          name: project.clientName,
        }
      : null,
    manager: project.managerId
      ? {
          id: project.managerId,
          name: project.managerName + " " + project.managerLastName,
        }
      : null,
    milestones: projectMilestones.map((milestone) => ({
      ...milestone,
      dueDate: milestone.dueDate ? milestone.dueDate.toISOString() : null,
      completedDate: milestone.completedDate
        ? milestone.completedDate.toISOString()
        : null,
      createdAt: milestone.createdAt.toISOString(),
      updatedAt: milestone.updatedAt.toISOString(),
    })),
    budget: project.budget,
    product: project.productId
      ? {
          id: project.productId,
          name: project.productName,
        }
      : null,
    createdAt: project.createdAt.toISOString(),
    updatedAt: project.updatedAt.toISOString(),
    teamMembers: teamMembers.map((member) => ({
      id: member.id,
      employeeId: member.employeeId,
      name: `${member.employeeName} ${member.employeeLastName}`,
      role: member.role,
      allocationPercentage: member.allocationPercentage,
      startDate: member.startDate.toISOString(),
      endDate: member.endDate ? member.endDate.toISOString() : null,
    })),
    tasks: {
      data: tasksResult,
      count: totalCount,
    },
  };
}

export async function getEmployees() {
  const employeesList = await db
    .select({
      id: employees.id,
      name: users.name,
      lastName: users.lastName,
    })
    .from(employees)
    .leftJoin(users, eq(users.id, employees.userId))
    .where(
      and(not(eq(users.isDeleted, true)), not(eq(employees.isDeleted, true)))
    )
    .orderBy(users.name);
  return employeesList.map((employee) => ({
    id: employee.id,
    name: `${employee.name} ${employee.lastName}`,
  }));
}

export async function getClients() {
  const clientsList = await db
    .select({
      id: clients.id,
      name: clients.name,
    })
    .from(clients)
    .where(and(not(eq(clients.isDeleted, true))))
    .orderBy(clients.name);
  return clientsList;
}

export async function getProducts() {
  const productsList = await db
    .select({
      id: products.id,
      name: products.name,
    })
    .from(products)
    .where(and(not(eq(products.isDeleted, true))))
    .orderBy(products.name);
  return productsList;
}
