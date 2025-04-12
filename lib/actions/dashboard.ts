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
  systemLogs,
} from "@/lib/db/schema";
import { eq, and, gte, desc, count, sum, lte } from "drizzle-orm";
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
  target: string;
  time: Date;
  user?: string;
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
      id: systemLogs.id,
      action: systemLogs.action,
      module: systemLogs.module,
      timestamp: systemLogs.timestamp,
      userId: systemLogs.userId,
    })
    .from(systemLogs)
    .orderBy(desc(systemLogs.timestamp))
    .limit(10);

  return results.map((log) => ({
    id: log.id,
    action: log.action,
    target: log.module,
    time: log.timestamp,
    user: log.userId || undefined,
  }));
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
