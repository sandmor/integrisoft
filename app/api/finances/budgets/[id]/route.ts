import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import {
  budgets,
  costCenters,
  projects,
  users,
  transactions,
  transactionCategories,
} from "@/lib/db/schema";
import { eq, and, or, gte, lte, not } from "drizzle-orm";
import { auth } from "@/lib/auth";
import { sql } from "drizzle-orm";
import { headers } from "next/headers";
import { BudgetDetail } from "@/lib/types";
import { revalidatePath } from "next/cache";

// GET /api/finances/budgets/[id] - Get a single budget by ID
export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await auth.api.getSession({
      headers: await headers(),
    });
    if (!session || !session.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id } = await params;

    // Get budget with related entities
    const budget = await db
      .select({
        id: budgets.id,
        name: budgets.name,
        amount: budgets.amount,
        description: budgets.description,
        startDate: budgets.startDate,
        endDate: budgets.endDate,
        costCenterId: budgets.costCenterId,
        projectId: budgets.projectId,
        createdById: budgets.createdById,
        createdAt: budgets.createdAt,
        updatedAt: budgets.updatedAt,
        costCenter: {
          id: costCenters.id,
          name: costCenters.name,
          budget: costCenters.budget,
          departmentId: costCenters.departmentId,
        },
        project: {
          id: projects.id,
          name: projects.name,
          budget: projects.budget,
        },
        createdBy: {
          id: users.id,
          name: users.name,
        },
      })
      .from(budgets)
      .leftJoin(costCenters, eq(budgets.costCenterId, costCenters.id))
      .leftJoin(projects, eq(budgets.projectId, projects.id))
      .leftJoin(users, eq(budgets.createdById, users.id))
      .where(and(eq(budgets.id, id), eq(budgets.isDeleted, false)))
      .limit(1);

    if (!budget || budget.length === 0) {
      return NextResponse.json({ error: "Budget not found" }, { status: 404 });
    }

    // Get spent amount for this budget
    const dateConditions = and(
      eq(transactions.isDeleted, false),
      gte(transactions.date, budget[0].startDate),
      lte(transactions.date, budget[0].endDate)
    );

    let whereCondition;
    if (budget[0].projectId) {
      whereCondition = and(
        dateConditions,
        eq(transactions.projectId, budget[0].projectId)
      );
    } else if (budget[0].costCenterId) {
      whereCondition = and(
        dateConditions,
        eq(transactions.costCenterId, budget[0].costCenterId)
      );
    } else {
      whereCondition = dateConditions;
    }

    const [transactionSummary] = await db
      .select({
        spentAmount: sql<string>`COALESCE(SUM(CASE WHEN ${transactions.type} = 'expense' THEN ${transactions.amount} ELSE 0 END), 0)`,
        incomeAmount: sql<string>`COALESCE(SUM(CASE WHEN ${transactions.type} = 'income' THEN ${transactions.amount} ELSE 0 END), 0)`,
      })
      .from(transactions)
      .where(whereCondition);

    // Parse the string values to numbers for calculations
    const spentAmount = transactionSummary?.spentAmount || "0";
    const incomeAmount = transactionSummary?.incomeAmount || "0";
    const remainingAmount = (
      parseFloat(budget[0].amount) - parseFloat(spentAmount)
    ).toString();

    // Calculate utilization percentage but keep as a number for formatting
    const utilizationPercentage =
      parseFloat(budget[0].amount) > 0
        ? (parseFloat(spentAmount) / parseFloat(budget[0].amount)) * 100
        : 0;

    // Get monthly breakdown of expenses and income
    let monthlyBreakdownCondition;
    if (budget[0].projectId) {
      monthlyBreakdownCondition = and(
        eq(transactions.isDeleted, false),
        gte(transactions.date, budget[0].startDate),
        lte(transactions.date, budget[0].endDate),
        eq(transactions.projectId, budget[0].projectId)
      );
    } else if (budget[0].costCenterId) {
      monthlyBreakdownCondition = and(
        eq(transactions.isDeleted, false),
        gte(transactions.date, budget[0].startDate),
        lte(transactions.date, budget[0].endDate),
        eq(transactions.costCenterId, budget[0].costCenterId)
      );
    } else {
      monthlyBreakdownCondition = and(
        eq(transactions.isDeleted, false),
        gte(transactions.date, budget[0].startDate),
        lte(transactions.date, budget[0].endDate)
      );
    }

    const monthlyBreakdown = await db
      .select({
        month: sql<string>`TO_CHAR(${transactions.date}, 'YYYY-MM')`,
        expenses: sql<string>`COALESCE(SUM(CASE WHEN ${transactions.type} = 'expense' THEN ${transactions.amount} ELSE 0 END), 0)`,
        income: sql<string>`COALESCE(SUM(CASE WHEN ${transactions.type} = 'income' THEN ${transactions.amount} ELSE 0 END), 0)`,
      })
      .from(transactions)
      .where(monthlyBreakdownCondition)
      .groupBy(sql`TO_CHAR(${transactions.date}, 'YYYY-MM')`)
      .orderBy(sql`TO_CHAR(${transactions.date}, 'YYYY-MM')`);

    // Get top 5 expense categories for this budget
    let topExpenseCategoriesCondition;
    if (budget[0].projectId) {
      topExpenseCategoriesCondition = and(
        eq(transactions.type, "expense"),
        eq(transactions.isDeleted, false),
        gte(transactions.date, budget[0].startDate),
        lte(transactions.date, budget[0].endDate),
        eq(transactions.projectId, budget[0].projectId)
      );
    } else if (budget[0].costCenterId) {
      topExpenseCategoriesCondition = and(
        eq(transactions.type, "expense"),
        eq(transactions.isDeleted, false),
        gte(transactions.date, budget[0].startDate),
        lte(transactions.date, budget[0].endDate),
        eq(transactions.costCenterId, budget[0].costCenterId)
      );
    } else {
      topExpenseCategoriesCondition = and(
        eq(transactions.type, "expense"),
        eq(transactions.isDeleted, false),
        gte(transactions.date, budget[0].startDate),
        lte(transactions.date, budget[0].endDate)
      );
    }

    const topExpenseCategories = await db
      .select({
        categoryId: transactionCategories.id,
        categoryName: transactionCategories.name,
        totalAmount: sql<string>`SUM(${transactions.amount})`,
      })
      .from(transactions)
      .innerJoin(
        transactionCategories,
        eq(transactions.categoryId, transactionCategories.id)
      )
      .where(topExpenseCategoriesCondition)
      .groupBy(transactions.categoryId)
      .orderBy(sql`SUM(${transactions.amount})`)
      .limit(5);

    const response: BudgetDetail = {
      ...budget[0],
      createdAt: budget[0].createdAt.toISOString(),
      updatedAt: budget[0].updatedAt.toISOString(),
      startDate: budget[0].startDate.toISOString(),
      endDate: budget[0].endDate.toISOString(),
      createdBy: budget[0].createdBy ? budget[0].createdBy : undefined,
      spentAmount,
      incomeAmount,
      remainingAmount,
      utilizationPercentage: parseFloat(utilizationPercentage.toFixed(2)),
      monthlyBreakdown,
      topExpenseCategories,
    };

    return NextResponse.json(response);
  } catch (error) {
    console.error("Error fetching budget:", error);
    return NextResponse.json(
      { error: "Failed to fetch budget" },
      { status: 500 }
    );
  }
}

// PATCH /api/finances/budgets/[id] - Update a budget
export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await auth.api.getSession({
      headers: await headers(),
    });
    if (!session || !session.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id } = await params;
    const data = await req.json();

    // Validate if budget exists
    const existingBudget = await db
      .select()
      .from(budgets)
      .where(and(eq(budgets.id, id), eq(budgets.isDeleted, false)))
      .limit(1);

    if (!existingBudget || existingBudget.length === 0) {
      return NextResponse.json({ error: "Budget not found" }, { status: 404 });
    }

    // Validate amount if provided
    if (
      data.amount !== undefined &&
      (isNaN(parseFloat(data.amount)) || parseFloat(data.amount) <= 0)
    ) {
      return NextResponse.json(
        { error: "Amount must be a positive number" },
        { status: 400 }
      );
    }

    // Validate dates if provided
    let startDate = existingBudget[0].startDate;
    let endDate = existingBudget[0].endDate;

    if (data.startDate) {
      startDate = new Date(data.startDate);
      if (isNaN(startDate.getTime())) {
        return NextResponse.json(
          { error: "Invalid start date format" },
          { status: 400 }
        );
      }
    }

    if (data.endDate) {
      endDate = new Date(data.endDate);
      if (isNaN(endDate.getTime())) {
        return NextResponse.json(
          { error: "Invalid end date format" },
          { status: 400 }
        );
      }
    }

    if (endDate <= startDate) {
      return NextResponse.json(
        { error: "End date must be after start date" },
        { status: 400 }
      );
    }

    // Check for overlapping budgets if date range changed
    if (data.startDate || data.endDate) {
      const dateOverlapCondition = and(
        eq(budgets.isDeleted, false),
        not(eq(budgets.id, id)),
        or(
          and(
            lte(budgets.startDate, startDate),
            gte(budgets.endDate, startDate)
          ),
          and(lte(budgets.startDate, endDate), gte(budgets.endDate, endDate)),
          and(gte(budgets.startDate, startDate), lte(budgets.endDate, endDate))
        )
      );

      let overlapCondition;
      if (existingBudget[0].projectId) {
        overlapCondition = and(
          dateOverlapCondition,
          eq(budgets.projectId, existingBudget[0].projectId)
        );
      } else if (existingBudget[0].costCenterId) {
        overlapCondition = and(
          dateOverlapCondition,
          eq(budgets.costCenterId, existingBudget[0].costCenterId)
        );
      } else {
        overlapCondition = dateOverlapCondition;
      }

      const overlappingBudgets = await db
        .select()
        .from(budgets)
        .where(overlapCondition);

      if (overlappingBudgets.length > 0) {
        return NextResponse.json(
          {
            error:
              "Date range overlaps with an existing budget for this project or cost center",
          },
          { status: 400 }
        );
      }
    }

    // Prepare update data
    const updateData: any = {
      updatedAt: new Date(),
    };

    // Only include fields that are provided in the request
    if (data.name !== undefined) updateData.name = data.name;
    if (data.amount !== undefined) updateData.amount = data.amount;
    if (data.description !== undefined)
      updateData.description = data.description;
    if (data.startDate !== undefined)
      updateData.startDate = new Date(data.startDate);
    if (data.endDate !== undefined) updateData.endDate = new Date(data.endDate);

    // Update the budget
    const updatedBudget = await db
      .update(budgets)
      .set(updateData)
      .where(eq(budgets.id, id))
      .returning();

    // Get the complete updated budget with relations
    const completeBudget = await db
      .select({
        id: budgets.id,
        name: budgets.name,
        amount: budgets.amount,
        description: budgets.description,
        startDate: budgets.startDate,
        endDate: budgets.endDate,
        costCenterId: budgets.costCenterId,
        projectId: budgets.projectId,
        createdById: budgets.createdById,
        createdAt: budgets.createdAt,
        updatedAt: budgets.updatedAt,
        costCenter: {
          id: costCenters.id,
          name: costCenters.name,
        },
        project: {
          id: projects.id,
          name: projects.name,
        },
        createdBy: {
          id: users.id,
          name: users.name,
        },
      })
      .from(budgets)
      .leftJoin(costCenters, eq(budgets.costCenterId, costCenters.id))
      .leftJoin(projects, eq(budgets.projectId, projects.id))
      .leftJoin(users, eq(budgets.createdById, users.id))
      .where(eq(budgets.id, id))
      .limit(1);

    // Calculate spent amount
    const dateRangeCondition = and(
      eq(transactions.isDeleted, false),
      gte(transactions.date, completeBudget[0].startDate),
      lte(transactions.date, completeBudget[0].endDate)
    );

    let transactionCondition;
    if (completeBudget[0].projectId) {
      transactionCondition = and(
        dateRangeCondition,
        eq(transactions.projectId, completeBudget[0].projectId)
      );
    } else if (completeBudget[0].costCenterId) {
      transactionCondition = and(
        dateRangeCondition,
        eq(transactions.costCenterId, completeBudget[0].costCenterId)
      );
    } else {
      transactionCondition = dateRangeCondition;
    }

    const [transactionSummary] = await db
      .select({
        spentAmount: sql<string>`COALESCE(SUM(CASE WHEN ${transactions.type} = 'expense' THEN ${transactions.amount} ELSE 0 END), 0)`,
      })
      .from(transactions)
      .where(transactionCondition);

    const spentAmount = transactionSummary?.spentAmount || "0";
    const remainingAmount = (
      parseFloat(completeBudget[0].amount) - parseFloat(spentAmount)
    ).toString();

    const utilizationPercentage =
      parseFloat(completeBudget[0].amount) > 0
        ? (parseFloat(spentAmount) / parseFloat(completeBudget[0].amount)) * 100
        : 0;

    // Revalidate relevant paths
    revalidatePath("/dashboard/finances/budgets");
    revalidatePath("/dashboard/finances");
    revalidatePath(`/dashboard/finances/budgets/${id}`);

    // Also revalidate related entity paths if they exist
    if (completeBudget[0].costCenterId) {
      revalidatePath(
        `/dashboard/finances/cost-centers/${completeBudget[0].costCenterId}`
      );
    }
    if (completeBudget[0].projectId) {
      revalidatePath(`/dashboard/projects/${completeBudget[0].projectId}`);
    }

    return NextResponse.json({
      ...completeBudget[0],
      spentAmount,
      remainingAmount,
      utilizationPercentage: parseFloat(utilizationPercentage.toFixed(2)),
    });
  } catch (error) {
    console.error("Error updating budget:", error);
    return NextResponse.json(
      { error: "Failed to update budget" },
      { status: 500 }
    );
  }
}

// DELETE /api/finances/budgets/[id] - Delete a budget (soft delete)
export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await auth.api.getSession({
      headers: await headers(),
    });
    if (!session || !session.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id } = await params;

    // Validate if budget exists
    const existingBudget = await db
      .select()
      .from(budgets)
      .where(and(eq(budgets.id, id), eq(budgets.isDeleted, false)))
      .limit(1);

    if (!existingBudget || existingBudget.length === 0) {
      return NextResponse.json({ error: "Budget not found" }, { status: 404 });
    }

    // Soft delete the budget
    await db
      .update(budgets)
      .set({
        isDeleted: true,
        updatedAt: new Date(),
      })
      .where(eq(budgets.id, id));

    // Revalidate relevant paths
    revalidatePath("/dashboard/finances/budgets");
    revalidatePath("/dashboard/finances");
    revalidatePath(`/dashboard/finances/budgets/${id}`);

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Error deleting budget:", error);
    return NextResponse.json(
      { error: "Failed to delete budget" },
      { status: 500 }
    );
  }
}
