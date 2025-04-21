import { and, eq } from "drizzle-orm";
import { db } from "../../db";
import { budgets, costCenters, projects } from "../../db/schema";

// Update a budget
export async function updateBudget({
  id,
  name,
  amount,
  description,
  startDate,
  endDate,
  costCenterId,
  projectId,
  userId,
}: {
  id: string;
  name?: string;
  amount?: number;
  description?: string | null;
  startDate?: Date;
  endDate?: Date;
  costCenterId?: string | null;
  projectId?: string | null;
  userId: string; // For audit purposes
}) {
  // Check if budget exists
  const existingBudget = await db.query.budgets.findFirst({
    where: and(eq(budgets.id, id), eq(budgets.isDeleted, false)),
  });

  if (!existingBudget) {
    return { error: "Budget not found" };
  }

  // Validate amount if provided
  if (amount !== undefined && amount <= 0) {
    return { error: "Amount must be greater than zero" };
  }

  // Validate dates if both are provided
  if (startDate && endDate && endDate <= startDate) {
    return { error: "End date must be after start date" };
  }

  // Validate date ranges if only one date is provided
  if (startDate && !endDate && startDate >= existingBudget.endDate) {
    return { error: "Start date must be before the existing end date" };
  }

  if (!startDate && endDate && endDate <= existingBudget.startDate) {
    return { error: "End date must be after the existing start date" };
  }

  // Check if cost center exists if provided
  if (costCenterId) {
    const costCenter = await db.query.costCenters.findFirst({
      where: and(
        eq(costCenters.id, costCenterId),
        eq(costCenters.isDeleted, false)
      ),
    });

    if (!costCenter) {
      return { error: "Cost center not found" };
    }
  }

  // Check if project exists if provided
  if (projectId) {
    const project = await db.query.projects.findFirst({
      where: and(eq(projects.id, projectId), eq(projects.isDeleted, false)),
    });

    if (!project) {
      return { error: "Project not found" };
    }
  }

  // Ensure either a cost center or a project is associated with the budget
  const newCostCenterId =
    costCenterId !== undefined ? costCenterId : existingBudget.costCenterId;
  const newProjectId =
    projectId !== undefined ? projectId : existingBudget.projectId;

  if (!newCostCenterId && !newProjectId) {
    return {
      error: "Budget must be associated with either a cost center or a project",
    };
  }

  const updatedBudget = await db
    .update(budgets)
    .set({
      name: name !== undefined ? name : undefined,
      amount: amount !== undefined ? amount.toString() : undefined,
      description: description !== undefined ? description : undefined,
      startDate: startDate !== undefined ? startDate : undefined,
      endDate: endDate !== undefined ? endDate : undefined,
      costCenterId: costCenterId !== undefined ? costCenterId : undefined,
      projectId: projectId !== undefined ? projectId : undefined,
      updatedAt: new Date(),
    })
    .where(eq(budgets.id, id))
    .returning();

  return { data: updatedBudget[0] };
}
