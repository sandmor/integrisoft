import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import {
  costCenters,
  departments,
  budgets,
  transactions,
} from "@/lib/db/schema";
import { count, eq, and, not, asc, desc, like, sum } from "drizzle-orm";
import { auth } from "@/lib/auth";
import { headers } from "next/headers";
import { revalidatePath } from "next/cache";
import { CostCenterListItem, CostCenterWithStats } from "@/lib/types";

// GET /api/finances/cost-centers - Get all cost centers
export async function GET(req: NextRequest) {
  try {
    const session = await auth.api.getSession({
      headers: await headers(),
    });
    if (!session || !session.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const searchParams = req.nextUrl.searchParams;
    const departmentId = searchParams.get("departmentId");
    const withStats = searchParams.get("withStats") === "true";

    // Build where conditions
    let whereConditions = [eq(costCenters.isDeleted, false)];

    if (departmentId) {
      whereConditions.push(eq(costCenters.departmentId, departmentId));
    }

    // Get all cost centers with relations
    const costCentersData = await db
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
      .where(and(...whereConditions))
      .orderBy(asc(costCenters.name));

    // If withStats is true, add budget and transaction statistics
    if (withStats) {
      const query = await Promise.all(
        costCentersData.map(async (costCenter) => {
          // Get active budgets for this cost center
          const activeBudgets = await db
            .select({
              id: budgets.id,
              name: budgets.name,
              amount: budgets.amount,
              startDate: budgets.startDate,
              endDate: budgets.endDate,
            })
            .from(budgets)
            .where(
              and(
                eq(budgets.costCenterId, costCenter.id),
                eq(budgets.isDeleted, false)
              )
            )
            .limit(5);

          // Calculate total expense transactions
          const [{ totalExpenses }] = await db
            .select({
              totalExpenses: sum(transactions.amount).as("totalExpenses"),
            })
            .from(transactions)
            .where(
              and(
                eq(transactions.costCenterId, costCenter.id),
                eq(transactions.type, "expense"),
                eq(transactions.isDeleted, false)
              )
            );

          // Calculate total income transactions
          const [{ totalIncome }] = await db
            .select({
              totalIncome: sum(transactions.amount).as("totalIncome"),
            })
            .from(transactions)
            .where(
              and(
                eq(transactions.costCenterId, costCenter.id),
                eq(transactions.type, "income"),
                eq(transactions.isDeleted, false)
              )
            );

          // Count total transactions
          const [{ value: transactionCount }] = await db
            .select({ value: count() })
            .from(transactions)
            .where(
              and(
                eq(transactions.costCenterId, costCenter.id),
                eq(transactions.isDeleted, false)
              )
            );

          // Format dates to ISO strings for the budget data
          const formattedBudgets = activeBudgets.map((budget) => ({
            ...budget,
            startDate: budget.startDate.toISOString(),
            endDate: budget.endDate.toISOString(),
          }));

          // Convert numeric values to strings to match the expected types
          const expenseAmount = totalExpenses ? totalExpenses.toString() : "0";
          const incomeAmount = totalIncome ? totalIncome.toString() : "0";
          const balanceAmount = (
            (totalIncome ? Number(totalIncome) : 0) -
            (totalExpenses ? Number(totalExpenses) : 0)
          ).toString();

          return {
            ...costCenter,
            createdAt: costCenter.createdAt.toISOString(),
            updatedAt: costCenter.updatedAt.toISOString(),
            activeBudgets: formattedBudgets,
            transactionCount,
            totalExpenses: expenseAmount,
            totalIncome: incomeAmount,
            balance: balanceAmount,
          };
        })
      );

      const response: CostCenterWithStats[] = query;

      return NextResponse.json(response);
    }

    // Format dates for regular cost center list items
    const formattedCostCenters = costCentersData.map((costCenter) => ({
      ...costCenter,
      createdAt: costCenter.createdAt.toISOString(),
      updatedAt: costCenter.updatedAt.toISOString(),
    }));

    const response: CostCenterListItem[] = formattedCostCenters;

    return NextResponse.json(formattedCostCenters);
  } catch (error) {
    console.error("Error fetching cost centers:", error);
    return NextResponse.json(
      { error: "Failed to fetch cost centers" },
      { status: 500 }
    );
  }
}

// POST /api/finances/cost-centers - Create a new cost center
export async function POST(req: NextRequest) {
  try {
    const session = await auth.api.getSession({
      headers: await headers(),
    });
    if (!session || !session.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const data = await req.json();

    // Validate required fields
    if (!data.name) {
      return NextResponse.json({ error: "Name is required" }, { status: 400 });
    }

    // Check if cost center with same name already exists
    const existingCostCenter = await db
      .select()
      .from(costCenters)
      .where(
        and(eq(costCenters.name, data.name), eq(costCenters.isDeleted, false))
      )
      .limit(1);

    if (existingCostCenter && existingCostCenter.length > 0) {
      return NextResponse.json(
        { error: "Cost center with this name already exists" },
        { status: 400 }
      );
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

    // Create new cost center
    const newCostCenter = await db
      .insert(costCenters)
      .values({
        name: data.name,
        description: data.description,
        budget: data.budget,
        departmentId: data.departmentId,
        createdAt: new Date(),
        updatedAt: new Date(),
        isDeleted: false,
      })
      .returning();

    // Get the complete cost center with relations
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
      .where(eq(costCenters.id, newCostCenter[0].id))
      .limit(1);

    // Format dates for the created cost center
    const formattedCostCenter = {
      ...completeCostCenter[0],
      createdAt: completeCostCenter[0].createdAt.toISOString(),
      updatedAt: completeCostCenter[0].updatedAt.toISOString(),
    };

    // Revalidate relevant paths
    revalidatePath("/dashboard/finances/cost-centers");
    revalidatePath("/dashboard/finances");

    return NextResponse.json(formattedCostCenter, { status: 201 });
  } catch (error) {
    console.error("Error creating cost center:", error);
    return NextResponse.json(
      { error: "Failed to create cost center" },
      { status: 500 }
    );
  }
}
