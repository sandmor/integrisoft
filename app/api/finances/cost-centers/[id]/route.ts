import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import {
  costCenters,
  departments,
  budgets,
  transactions,
  transactionCategories,
} from "@/lib/db/schema";
import { count, eq, and, not, asc, desc, sum, sql } from "drizzle-orm";
import { auth } from "@/lib/auth";
import { headers } from "next/headers";

// GET /api/finances/cost-centers/[id] - Get a single cost center by ID
export async function GET(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await auth.api.getSession({
      headers: await headers(),
    });
    if (!session || !session.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id } = params;

    // Get cost center with department relation
    const costCenter = await db
      .select({
        id: costCenters.id,
        name: costCenters.name,
        description: costCenters.description,
        budget: costCenters.budget,
        departmentId: costCenters.departmentId,
        createdAt: costCenters.createdAt,
        updatedAt: costCenters.updatedAt,
        department: {
          id: departments.id,
          name: departments.name,
        },
      })
      .from(costCenters)
      .leftJoin(departments, eq(costCenters.departmentId, departments.id))
      .where(and(eq(costCenters.id, id), eq(costCenters.isDeleted, false)))
      .limit(1);

    if (!costCenter || costCenter.length === 0) {
      return NextResponse.json(
        { error: "Cost center not found" },
        { status: 404 }
      );
    }

    // Get active budgets for this cost center
    const activeBudgets = await db
      .select({
        id: budgets.id,
        name: budgets.name,
        amount: budgets.amount,
        startDate: budgets.startDate,
        endDate: budgets.endDate,
        createdAt: budgets.createdAt,
        updatedAt: budgets.updatedAt,
      })
      .from(budgets)
      .where(and(eq(budgets.costCenterId, id), eq(budgets.isDeleted, false)))
      .orderBy(desc(budgets.startDate))
      .limit(10);

    // Get financial summary
    // 1. Calculate total expense and income transactions
    const [transactionSummary] = await db
      .select({
        totalExpenses: sql<number>`COALESCE(SUM(CASE WHEN ${transactions.type} = 'expense' THEN ${transactions.amount} ELSE 0 END), 0)`,
        totalIncome: sql<number>`COALESCE(SUM(CASE WHEN ${transactions.type} = 'income' THEN ${transactions.amount} ELSE 0 END), 0)`,
        transactionCount: count(),
      })
      .from(transactions)
      .where(
        and(
          eq(transactions.costCenterId, id),
          eq(transactions.isDeleted, false)
        )
      );

    // 2. Get monthly breakdown
    const monthlyBreakdown = await db
      .select({
        month: sql<string>`TO_CHAR(${transactions.date}, 'YYYY-MM')`,
        expenses: sql<number>`COALESCE(SUM(CASE WHEN ${transactions.type} = 'expense' THEN ${transactions.amount} ELSE 0 END), 0)`,
        income: sql<number>`COALESCE(SUM(CASE WHEN ${transactions.type} = 'income' THEN ${transactions.amount} ELSE 0 END), 0)`,
      })
      .from(transactions)
      .where(
        and(
          eq(transactions.costCenterId, id),
          eq(transactions.isDeleted, false)
        )
      )
      .groupBy(sql`TO_CHAR(${transactions.date}, 'YYYY-MM')`)
      .orderBy(sql`TO_CHAR(${transactions.date}, 'YYYY-MM')`);

    // 3. Get top expense categories
    const topExpenseCategories = await db
      .select({
        categoryId: transactions.categoryId,
        categoryName: transactionCategories.name,
        totalAmount: sql<string>`SUM(${transactions.amount})`,
      })
      .from(transactions)
      .leftJoin(
        transactionCategories,
        eq(transactions.categoryId, transactionCategories.id)
      )
      .where(
        and(
          eq(transactions.costCenterId, id),
          eq(transactions.type, "expense"),
          eq(transactions.isDeleted, false)
        )
      )
      .groupBy(transactions.categoryId, transactionCategories.name)
      .orderBy(desc(sql`SUM(${transactions.amount})`))
      .limit(5);

    // Get recent transactions
    const recentTransactions = await db
      .select({
        id: transactions.id,
        type: transactions.type,
        amount: transactions.amount,
        description: transactions.description,
        date: transactions.date,
        categoryId: transactions.categoryId,
        categoryName: transactionCategories.name,
        createdAt: transactions.createdAt,
      })
      .from(transactions)
      .leftJoin(
        transactionCategories,
        eq(transactions.categoryId, transactionCategories.id)
      )
      .where(
        and(
          eq(transactions.costCenterId, id),
          eq(transactions.isDeleted, false)
        )
      )
      .orderBy(desc(transactions.date))
      .limit(10);

    // Calculate balance
    const totalExpenses = transactionSummary?.totalExpenses || 0;
    const totalIncome = transactionSummary?.totalIncome || 0;
    const balance = totalIncome - totalExpenses;

    return NextResponse.json({
      ...costCenter[0],
      activeBudgets,
      financialSummary: {
        totalExpenses,
        totalIncome,
        balance,
        transactionCount: transactionSummary?.transactionCount || 0,
        monthlyBreakdown,
        topExpenseCategories,
      },
      recentTransactions,
    });
  } catch (error) {
    console.error("Error fetching cost center:", error);
    return NextResponse.json(
      { error: "Failed to fetch cost center" },
      { status: 500 }
    );
  }
}

// PATCH /api/finances/cost-centers/[id] - Update a cost center
export async function PATCH(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await auth.api.getSession({
      headers: await headers(),
    });
    if (!session || !session.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id } = params;
    const data = await req.json();

    // Validate if cost center exists
    const existingCostCenter = await db
      .select()
      .from(costCenters)
      .where(and(eq(costCenters.id, id), eq(costCenters.isDeleted, false)))
      .limit(1);

    if (!existingCostCenter || existingCostCenter.length === 0) {
      return NextResponse.json(
        { error: "Cost center not found" },
        { status: 404 }
      );
    }

    // Check if name is unique if changing
    if (data.name && data.name !== existingCostCenter[0].name) {
      const costCenterWithSameName = await db
        .select()
        .from(costCenters)
        .where(
          and(
            eq(costCenters.name, data.name),
            eq(costCenters.isDeleted, false),
            not(eq(costCenters.id, id))
          )
        )
        .limit(1);

      if (costCenterWithSameName && costCenterWithSameName.length > 0) {
        return NextResponse.json(
          { error: "Cost center with this name already exists" },
          { status: 400 }
        );
      }
    }

    // Validate department exists if provided
    if (data.departmentId) {
      const department = await db
        .select()
        .from(departments)
        .where(
          and(
            eq(departments.id, data.departmentId),
            eq(departments.isDeleted, false)
          )
        )
        .limit(1);

      if (!department || department.length === 0) {
        return NextResponse.json(
          { error: "Department not found" },
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
    if (data.description !== undefined)
      updateData.description = data.description;
    if (data.budget !== undefined) updateData.budget = data.budget;
    if (data.departmentId !== undefined)
      updateData.departmentId = data.departmentId;

    // Update the cost center
    const updatedCostCenter = await db
      .update(costCenters)
      .set(updateData)
      .where(eq(costCenters.id, id))
      .returning();

    // Get the complete updated cost center with relations
    const completeCostCenter = await db
      .select({
        id: costCenters.id,
        name: costCenters.name,
        description: costCenters.description,
        budget: costCenters.budget,
        departmentId: costCenters.departmentId,
        createdAt: costCenters.createdAt,
        updatedAt: costCenters.updatedAt,
        department: {
          id: departments.id,
          name: departments.name,
        },
      })
      .from(costCenters)
      .leftJoin(departments, eq(costCenters.departmentId, departments.id))
      .where(eq(costCenters.id, id))
      .limit(1);

    return NextResponse.json(completeCostCenter[0]);
  } catch (error) {
    console.error("Error updating cost center:", error);
    return NextResponse.json(
      { error: "Failed to update cost center" },
      { status: 500 }
    );
  }
}

// DELETE /api/finances/cost-centers/[id] - Delete a cost center
export async function DELETE(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await auth.api.getSession({
      headers: await headers(),
    });
    if (!session || !session.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id } = params;

    // Validate if cost center exists
    const existingCostCenter = await db
      .select()
      .from(costCenters)
      .where(and(eq(costCenters.id, id), eq(costCenters.isDeleted, false)))
      .limit(1);

    if (!existingCostCenter || existingCostCenter.length === 0) {
      return NextResponse.json(
        { error: "Cost center not found" },
        { status: 404 }
      );
    }

    // Check if this cost center has active budgets
    const [{ value: budgetCount }] = await db
      .select({ value: count() })
      .from(budgets)
      .where(and(eq(budgets.costCenterId, id), eq(budgets.isDeleted, false)));

    if (budgetCount > 0) {
      return NextResponse.json(
        { error: "Cannot delete cost center that has active budgets" },
        { status: 400 }
      );
    }

    // Check if this cost center has transactions
    const [{ value: transactionCount }] = await db
      .select({ value: count() })
      .from(transactions)
      .where(
        and(
          eq(transactions.costCenterId, id),
          eq(transactions.isDeleted, false)
        )
      );

    if (transactionCount > 0) {
      return NextResponse.json(
        { error: "Cannot delete cost center that has transactions" },
        { status: 400 }
      );
    }

    // Soft delete the cost center
    await db
      .update(costCenters)
      .set({
        isDeleted: true,
        updatedAt: new Date(),
      })
      .where(eq(costCenters.id, id));

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Error deleting cost center:", error);
    return NextResponse.json(
      { error: "Failed to delete cost center" },
      { status: 500 }
    );
  }
}
