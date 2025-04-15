"use server";

import { db } from "@/lib/db";
import {
  employees,
  projects,
  clients,
  transactions,
  tasks,
  products,
  clientInteractions,
  activitiesFeed,
  users,
} from "@/lib/db/schema";
import { eq, and, gte, desc, count, sum, lte, inArray } from "drizzle-orm";
import {
  transactionTypeEnum,
  projectStatusEnum,
  taskStatusEnum,
} from "@/lib/db/schema";

export type DashboardStats = {
  totalEmployees: number;
  activeProjects: number;
  totalClients: number;
  totalRevenue: number;
  revenueChange: number;
  newEmployees: number;
  newProjects: number;
  newClients: number;
};

export type DashboardTask = {
  id: string;
  name: string;
  status: "completed" | "in-progress" | "pending";
  projectName?: string;
  dueDate?: Date | null;
};

export type ActivityItem = {
  id: string;
  action: string;
  module: string;
  time: Date;
  user?: string;
  description?: string;
  entityType?: string;
  entityId?: string;
  details?: any;
  userName?: string;
};

function calculatePercentageChange(current: number, previous: number): number {
  if (previous === 0) return current > 0 ? 100 : 0;
  return Math.round(((current - previous) / previous) * 100);
}

export async function getDashboardStats(): Promise<DashboardStats> {
  const currentDate = new Date();
  const lastMonthDate = new Date();
  lastMonthDate.setMonth(currentDate.getMonth() - 1);

  // Get employee counts
  const allEmployees = await db
    .select({ count: count() })
    .from(employees)
    .where(eq(employees.isDeleted, false));

  const newEmployees = await db
    .select({ count: count() })
    .from(employees)
    .where(
      and(
        eq(employees.isDeleted, false),
        gte(employees.createdAt, lastMonthDate)
      )
    );

  // Get project counts
  const activeProjects = await db
    .select({ count: count() })
    .from(projects)
    .where(and(eq(projects.isDeleted, false), eq(projects.status, "active")));

  const newProjects = await db
    .select({ count: count() })
    .from(projects)
    .where(
      and(eq(projects.isDeleted, false), gte(projects.createdAt, lastMonthDate))
    );

  // Get client counts
  const allClients = await db
    .select({ count: count() })
    .from(clients)
    .where(eq(clients.isDeleted, false));

  const newClients = await db
    .select({ count: count() })
    .from(clients)
    .where(
      and(eq(clients.isDeleted, false), gte(clients.createdAt, lastMonthDate))
    );

  // Get revenue
  const currentMonthRevenue = await db
    .select({ total: sum(transactions.amount) })
    .from(transactions)
    .where(
      and(
        eq(transactions.isDeleted, false),
        eq(transactions.type, "income"),
        gte(transactions.date, lastMonthDate)
      )
    );

  const previousMonthDate = new Date(lastMonthDate);
  previousMonthDate.setMonth(previousMonthDate.getMonth() - 1);

  const previousMonthRevenue = await db
    .select({ total: sum(transactions.amount) })
    .from(transactions)
    .where(
      and(
        eq(transactions.isDeleted, false),
        eq(transactions.type, "income"),
        gte(transactions.date, previousMonthDate),
        lte(transactions.date, lastMonthDate)
      )
    );

  const currentRevenue = parseFloat(
    currentMonthRevenue[0].total?.toString() || "0"
  );
  const previousRevenue = parseFloat(
    previousMonthRevenue[0].total?.toString() || "0"
  );

  return {
    totalEmployees: allEmployees[0].count,
    activeProjects: activeProjects[0].count,
    totalClients: allClients[0].count,
    totalRevenue: currentRevenue,
    revenueChange: calculatePercentageChange(currentRevenue, previousRevenue),
    newEmployees: newEmployees[0].count,
    newProjects: newProjects[0].count,
    newClients: newClients[0].count,
  };
}

export async function getProjectTasks(): Promise<DashboardTask[]> {
  const result = await db
    .select({
      id: tasks.id,
      title: tasks.title,
      status: tasks.status,
      projectName: projects.name,
      dueDate: tasks.dueDate,
    })
    .from(tasks)
    .leftJoin(projects, eq(tasks.projectId, projects.id))
    .where(and(eq(tasks.isDeleted, false), eq(projects.isDeleted, false)))
    .orderBy(desc(tasks.updatedAt))
    .limit(4);

  return result.map((task) => ({
    id: task.id,
    name: task.title,
    status: mapTaskStatus(task.status),
    projectName: task.projectName || undefined,
    dueDate: task.dueDate,
  }));
}

export async function getProductTasks(): Promise<DashboardTask[]> {
  const result = await db
    .select({
      id: tasks.id,
      title: tasks.title,
      status: tasks.status,
      projectName: products.name,
      dueDate: tasks.dueDate,
    })
    .from(tasks)
    .leftJoin(projects, eq(tasks.projectId, projects.id))
    .leftJoin(products, eq(projects.productId, products.id))
    .where(
      and(
        eq(tasks.isDeleted, false),
        eq(projects.isDeleted, false),
        eq(products.isDeleted, false)
      )
    )
    .orderBy(desc(tasks.updatedAt))
    .limit(4);

  return result.map((task) => ({
    id: task.id,
    name: task.title,
    status: mapTaskStatus(task.status),
    projectName: task.projectName || undefined,
    dueDate: task.dueDate,
  }));
}

export async function getClientRequests(): Promise<DashboardTask[]> {
  // Get client interactions that require follow-up or are pending
  const result = await db
    .select({
      id: clientInteractions.id,
      summary: clientInteractions.summary,
      followUpDate: clientInteractions.followUpDate,
      clientName: clients.name,
    })
    .from(clientInteractions)
    .leftJoin(clients, eq(clientInteractions.clientId, clients.id))
    .where(
      and(eq(clientInteractions.isDeleted, false), eq(clients.isDeleted, false))
    )
    .orderBy(desc(clientInteractions.date))
    .limit(4);

  return result.map((interaction) => {
    // Determine status based on follow-up date
    let status: "completed" | "in-progress" | "pending" = "pending";

    if (interaction.followUpDate) {
      const now = new Date();
      const followUpDate = new Date(interaction.followUpDate);

      if (followUpDate < now) {
        status = "completed";
      } else if (
        followUpDate.getTime() - now.getTime() <
        2 * 24 * 60 * 60 * 1000
      ) {
        // within 2 days
        status = "in-progress";
      }
    }

    return {
      id: interaction.id,
      name: `${interaction.summary} (${interaction.clientName})`,
      status,
      dueDate: interaction.followUpDate,
    };
  });
}

export async function getRecentActivities(): Promise<ActivityItem[]> {
  const results = await db
    .select({
      id: activitiesFeed.id,
      action: activitiesFeed.action,
      module: activitiesFeed.module,
      timestamp: activitiesFeed.timestamp,
      userId: activitiesFeed.userId,
      description: activitiesFeed.description,
      entityType: activitiesFeed.relatedEntityType,
      entityId: activitiesFeed.relatedEntityId,
      details: activitiesFeed.details,
      projectId: activitiesFeed.projectId,
      productId: activitiesFeed.productId,
      clientId: activitiesFeed.clientId,
      employeeId: activitiesFeed.employeeId,
      taskId: activitiesFeed.taskId,
      milestoneId: activitiesFeed.milestoneId,
    })
    .from(activitiesFeed)
    .orderBy(desc(activitiesFeed.timestamp))
    .limit(10);

  // Get user names for the activities
  const userIds = results
    .map((log) => log.userId)
    .filter((id): id is string => id !== null && id !== undefined);

  const userResults =
    userIds.length > 0
      ? await db
          .select({
            id: users.id,
            name: users.name,
            lastName: users.lastName,
          })
          .from(users)
          .where(inArray(users.id, userIds))
      : [];

  // Create a map for quick lookup
  const userMap = new Map(
    userResults.map((user) => [user.id, `${user.name} ${user.lastName}`])
  );

  return results.map((log) => ({
    id: log.id,
    action: log.action,
    module: log.module,
    time: log.timestamp,
    user: log.userId || undefined,
    userName: log.userId ? userMap.get(log.userId) : undefined,
    description: log.description || undefined,
    entityType: log.entityType || undefined,
    entityId: log.entityId || undefined,
    details: log.details || undefined,
  }));
}

export async function getEntityNameById(
  type: string,
  id: string
): Promise<{ id: string; name: string } | null> {
  try {
    if (type === "employees") {
      // Get the employee and join with users to get name
      const result = await db.query.employees.findFirst({
        where: (employees, { eq, and }) =>
          and(eq(employees.id, id), eq(employees.isDeleted, false)),
        with: {
          users: true,
        },
      });

      if (result?.users) {
        return {
          id,
          name: `${result.users.name} ${result.users.lastName}`,
        };
      }
    }

    // Add other entity types as needed (clients, projects, etc.)
    // For example:
    if (type === "clients") {
      const result = await db.query.clients.findFirst({
        where: (clients, { eq, and }) =>
          and(eq(clients.id, id), eq(clients.isDeleted, false)),
      });

      if (result) {
        return {
          id,
          name: result.name,
        };
      }
    }

    if (type === "projects") {
      const result = await db.query.projects.findFirst({
        where: (projects, { eq, and }) =>
          and(eq(projects.id, id), eq(projects.isDeleted, false)),
      });

      if (result) {
        return {
          id,
          name: result.name,
        };
      }
    }

    return null;
  } catch (error) {
    console.error(`Error fetching ${type} name:`, error);
    return null;
  }
}

function mapTaskStatus(
  status: string | null
): "completed" | "in-progress" | "pending" {
  if (!status) return "pending";

  switch (status) {
    case "done":
      return "completed";
    case "in_progress":
    case "review":
      return "in-progress";
    case "todo":
    default:
      return "pending";
  }
}
