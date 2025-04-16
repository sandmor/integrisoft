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
} from "@/lib/db/schema";
import { eq, not, and } from "drizzle-orm";
import { createId } from "@paralleldrive/cuid2";
import { auth } from "@/lib/auth";
import { headers } from "next/headers";
import { revalidatePath } from "next/cache";
import { notFound } from "next/navigation";

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

  return {
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
        }
      : null,
    manager: project.managerId
      ? {
          id: project.managerId,
          name: project.managerName + " " + project.managerLastName,
        }
      : null,
    milestones: projectMilestones,
    budget: project.budget,
    product: {
      id: project.productId,
      name: project.productName,
    },
    createdAt: project.createdAt,
    updatedAt: project.updatedAt,
    teamMembers: teamMembers.map((member) => ({
      id: member.id,
      employeeId: member.employeeId,
      name: `${member.employeeName} ${member.employeeLastName}`,
      role: member.role,
      allocationPercentage: member.allocationPercentage,
      startDate: member.startDate,
      endDate: member.endDate,
    })),
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
