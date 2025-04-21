import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import {
  transactions,
  budgets,
  costCenters,
  transactionCategories,
} from "@/lib/db/schema";
import {
  desc,
  eq,
  and,
  count,
  sum,
  between,
  sql,
  isNotNull,
} from "drizzle-orm";
import { FinancialDashboardResponse } from "@/lib/types";

// Get financial dashboard data
export async function GET() {
  try {
    const currentDate = new Date();
    const currentMonth = new Date(
      currentDate.getFullYear(),
      currentDate.getMonth(),
      1
    );
    const currentMonthEnd = new Date(
      currentDate.getFullYear(),
      currentDate.getMonth() + 1,
      0
    );
    const previousMonth = new Date(
      currentDate.getFullYear(),
      currentDate.getMonth() - 1,
      1
    );
    const previousMonthEnd = new Date(
      currentDate.getFullYear(),
      currentDate.getMonth(),
      0
    );

    // Get total income and expenses for current month
    const currentMonthTransactions = await db
      .select({
        incomeTotal:
          sql<string>`COALESCE(SUM(CASE WHEN ${transactions.type} = 'income' THEN ${transactions.amount} ELSE 0 END), 0)::text`.mapWith(
            String
          ),
        expenseTotal:
          sql<string>`COALESCE(SUM(CASE WHEN ${transactions.type} = 'expense' THEN ${transactions.amount} ELSE 0 END), 0)::text`.mapWith(
            String
          ),
        transactionCount: count(transactions.id),
      })
      .from(transactions)
      .where(
        and(
          eq(transactions.isDeleted, false),
          between(transactions.date, currentMonth, currentMonthEnd)
        )
      );

    // Get previous month totals for comparison
    const previousMonthTransactions = await db
      .select({
        incomeTotal: sql<string>`COALESCE(SUM(CASE WHEN ${transactions.type} = 'income' THEN ${transactions.amount} ELSE 0 END), 0)::text`,
        expenseTotal: sql<string>`COALESCE(SUM(CASE WHEN ${transactions.type} = 'expense' THEN ${transactions.amount} ELSE 0 END), 0)::text`,
        transactionCount: count(transactions.id),
      })
      .from(transactions)
      .where(
        and(
          eq(transactions.isDeleted, false),
          between(transactions.date, previousMonth, previousMonthEnd)
        )
      );

    // Get total budgets
    const totalBudgets = await db
      .select({
        totalBudget:
          sql<string>`COALESCE(SUM(${budgets.amount}), 0)::text`.mapWith(
            String
          ),
        count: count(budgets.id),
      })
      .from(budgets)
      .where(eq(budgets.isDeleted, false));

    // Get recent transactions
    const recentTransactions = await db
      .select({
        id: transactions.id,
        type: transactions.type,
        amount: transactions.amount,
        description: transactions.description,
        date: transactions.date,
        categoryId: transactions.categoryId,
        costCenterId: transactions.costCenterId,
        projectId: transactions.projectId,
        createdById: transactions.createdById,
        approvedById: transactions.approvedById,
        approvedAt: transactions.approvedAt,
        createdAt: transactions.createdAt,
        updatedAt: transactions.updatedAt,
      })
      .from(transactions)
      .where(eq(transactions.isDeleted, false))
      .orderBy(desc(transactions.date))
      .limit(10);

    // Get category distribution - only include transactions with non-null categoryId
    const categoryDistributionRaw = await db
      .select({
        categoryId: transactions.categoryId,
        totalAmount: sql<string>`SUM(${transactions.amount})::text`,
        count: count(transactions.id),
      })
      .from(transactions)
      .where(
        and(
          eq(transactions.isDeleted, false),
          isNotNull(transactions.categoryId),
          between(transactions.date, currentMonth, currentMonthEnd)
        )
      )
      .groupBy(transactions.categoryId);

    // Filter out any null categoryIds to satisfy the type requirements
    const categoryDistribution = categoryDistributionRaw
      .filter((item) => item.categoryId !== null)
      .map((item) => ({
        categoryId: item.categoryId as string, // Type assertion since we filtered out nulls
        totalAmount: item.totalAmount,
        count: item.count,
      }));

    // Get cost center data
    const costCenterDataRaw = await db
      .select({
        id: costCenters.id,
        name: costCenters.name,
        budget: costCenters.budget,
      })
      .from(costCenters)
      .where(eq(costCenters.isDeleted, false))
      .limit(5);

    // Convert any null budgets to "0" strings to match expected type
    const costCenterData = costCenterDataRaw.map((center) => ({
      id: center.id,
      name: center.name,
      budget: center.budget || "0", // Convert null to "0"
    }));

    // Calculate percentage changes
    const currentIncomeTotal = parseFloat(
      currentMonthTransactions[0]?.incomeTotal || "0"
    );
    const currentExpenseTotal = parseFloat(
      currentMonthTransactions[0]?.expenseTotal || "0"
    );
    const previousIncomeTotal = parseFloat(
      previousMonthTransactions[0]?.incomeTotal || "0"
    );
    const previousExpenseTotal = parseFloat(
      previousMonthTransactions[0]?.expenseTotal || "0"
    );

    const incomeChange =
      previousIncomeTotal !== 0
        ? ((currentIncomeTotal - previousIncomeTotal) / previousIncomeTotal) *
          100
        : 100;

    const expenseChange =
      previousExpenseTotal !== 0
        ? ((currentExpenseTotal - previousExpenseTotal) /
            previousExpenseTotal) *
          100
        : 100;

    const currentProfit = currentIncomeTotal - currentExpenseTotal;
    const previousProfit = previousIncomeTotal - previousExpenseTotal;

    const profitChange =
      previousProfit !== 0
        ? ((currentProfit - previousProfit) / Math.abs(previousProfit)) * 100
        : 100;

    // Format dates to ISO strings for the API response
    const formattedRecentTransactions = recentTransactions.map(
      (transaction) => ({
        ...transaction,
        date: transaction.date.toISOString(),
        approvedAt: transaction.approvedAt
          ? transaction.approvedAt.toISOString()
          : null,
        createdAt: transaction.createdAt.toISOString(),
        updatedAt: transaction.updatedAt.toISOString(),
      })
    );

    // Compile dashboard data
    const dashboardData = {
      summary: {
        currentMonth: {
          income: currentMonthTransactions[0]?.incomeTotal || "0",
          expenses: currentMonthTransactions[0]?.expenseTotal || "0",
          profit: (currentIncomeTotal - currentExpenseTotal).toString(),
          transactionCount: currentMonthTransactions[0]?.transactionCount || 0,
        },
        previousMonth: {
          income: previousMonthTransactions[0]?.incomeTotal || "0",
          expenses: previousMonthTransactions[0]?.expenseTotal || "0",
          profit: (previousIncomeTotal - previousExpenseTotal).toString(),
          transactionCount: previousMonthTransactions[0]?.transactionCount || 0,
        },
        changes: {
          income: incomeChange,
          expenses: expenseChange,
          profit: profitChange,
        },
      },
      budgets: {
        total: totalBudgets[0]?.totalBudget || "0",
        count: totalBudgets[0]?.count || 0,
      },
      recentTransactions: formattedRecentTransactions,
      categoryDistribution,
      costCenters: costCenterData,
    };

    const response: FinancialDashboardResponse = {
      success: true,
      data: dashboardData,
    };

    return NextResponse.json(response);
  } catch (error) {
    console.error("Error fetching financial dashboard data:", error);
    return NextResponse.json(
      { success: false, error: "Failed to fetch financial dashboard data" },
      { status: 500 }
    );
  }
}
