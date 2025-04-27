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
import { eq, not, and, sql, asc, desc, count, ilike } from "drizzle-orm";
import { notFound } from "next/navigation";
import { TaskStatus, getOrderedTasksForColumn } from "@/lib/db/kanban-order";
import { PaginatedResponse, Project, ProjectStatus } from "../types";

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

export async function getProjectsList({
  page = 0,
  pageSize = 10,
  sorts = [],
  filters = [],
  dateFrom,
  dateTo,
}: {
  page?: number;
  pageSize?: number;
  sorts?: string[];
  filters?: string[];
  dateFrom?: string;
  dateTo?: string;
}): Promise<PaginatedResponse<Project>> {
  // Handle sort parameters
  const sortClauses = [];
  for (const sort of sorts) {
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
  for (const filter of filters) {
    const [field, value] = filter.split(":");
    if (field && value) {
      switch (field) {
        case "name":
          conditions.push(ilike(projects.name, `%${value}%`));
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
          completed: count(sql`CASE WHEN ${tasks.status} = 'done' THEN 1 END`),
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

  return {
    data: projectsWithDetails,
    totalCount,
    pageCount: Math.ceil(totalCount / pageSize),
    page,
    pageSize,
  };
}
