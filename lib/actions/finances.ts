import { db } from "@/lib/db";
import {
  budgets,
  costCenters,
  projects,
  users,
  transactions,
  departments,
  transactionCategories,
  transactionTypeEnum,
} from "@/lib/db/schema";
import {
  count,
  eq,
  and,
  asc,
  desc,
  like,
  gte,
  lte,
  or,
  sql,
  isNull,
  not,
  isNotNull,
  sum,
} from "drizzle-orm";
import {
  BudgetDetail,
  BudgetListResponse,
  CostCenterDetail,
  CostCenterListItem,
  TransactionCategoryItem,
  TransactionCategoryWithChildren,
  TransactionDetail,
  TransactionListResponse,
} from "@/lib/types/finances";

export async function getBudgetList({
  page = 0,
  pageSize = 10,
  sorts = ["-startDate"],
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
}): Promise<BudgetListResponse> {
  const offset = page * pageSize;

  // Build where conditions
  let whereConditions = [eq(budgets.isDeleted, false)];

  filters.forEach((filter) => {
    const [field, value] = filter.split(":");

    if (field === "projectId") {
      whereConditions.push(eq(budgets.projectId, value));
    } else if (field === "costCenterId") {
      whereConditions.push(eq(budgets.costCenterId, value));
    } else if (field === "createdById") {
      whereConditions.push(eq(budgets.createdById, value));
    } else if (field === "amount" && value.includes("-")) {
      const [min, max] = value.split("-");
      if (min) whereConditions.push(gte(budgets.amount, min));
      if (max) whereConditions.push(lte(budgets.amount, max));
    } else if (field === "name") {
      whereConditions.push(like(budgets.name, `%${value}%`));
    } else if (field === "description") {
      whereConditions.push(like(budgets.description, `%${value}%`));
    }
  });

  // Add date range filter if provided
  if (dateFrom) {
    whereConditions.push(gte(budgets.startDate, new Date(dateFrom)));
  }
  if (dateTo) {
    whereConditions.push(lte(budgets.endDate, new Date(dateTo)));
  }

  // Build sort conditions
  const sortFields: Record<string, any> = {
    amount: budgets.amount,
    name: budgets.name,
    startDate: budgets.startDate,
    endDate: budgets.endDate,
    createdAt: budgets.createdAt,
  };

  let orderBy: any[] = [];

  sorts.forEach((sort) => {
    const direction = sort.startsWith("-") ? "desc" : "asc";
    const field = sort.replace(/^[-+]/, "");

    if (sortFields[field]) {
      if (direction === "asc") {
        orderBy.push(asc(sortFields[field]));
      } else {
        orderBy.push(desc(sortFields[field]));
      }
    }
  });

  // Default sort by startDate desc if no sort specified
  if (orderBy.length === 0) {
    orderBy.push(desc(budgets.startDate));
  }

  // Get total count for pagination
  const [{ value: totalCount }] = await db
    .select({ value: count() })
    .from(budgets)
    .where(and(...whereConditions));

  // Get paginated budgets with relations
  const budgetsData = await db
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
    .where(and(...whereConditions))
    .orderBy(...orderBy)
    .limit(pageSize)
    .offset(offset);

  // Get spent amount for each budget
  const budgetsWithSpent = await Promise.all(
    budgetsData.map(async (budget) => {
      // Query to get the sum of transaction amounts for this budget's project or cost center
      let whereCondition = and(
        eq(transactions.type, "expense"),
        eq(transactions.isDeleted, false),
        gte(transactions.date, budget.startDate),
        lte(transactions.date, budget.endDate)
      );

      // Add condition for either project or cost center
      if (budget.projectId) {
        whereCondition = and(
          whereCondition,
          eq(transactions.projectId, budget.projectId)
        );
      } else if (budget.costCenterId) {
        whereCondition = and(
          whereCondition,
          eq(transactions.costCenterId, budget.costCenterId)
        );
      }

      const [result] = await db
        .select({
          spentAmount: sql<string>`sum(${transactions.amount})`,
        })
        .from(transactions)
        .where(whereCondition);

      const spentAmount = result?.spentAmount || "0";
      const remainingAmount = (
        Number(budget.amount) - Number(spentAmount)
      ).toString();
      const utilizationPercentage =
        (Number(spentAmount) / Number(budget.amount)) * 100;

      return {
        ...budget,
        spentAmount,
        remainingAmount,
        utilizationPercentage: parseFloat(utilizationPercentage.toFixed(2)),
      };
    })
  );

  // Calculate page count
  const pageCount = Math.ceil(totalCount / pageSize);

  return {
    data: budgetsWithSpent.map((budget) => ({
      ...budget,
      startDate: budget.startDate.toISOString(),
      endDate: budget.endDate.toISOString(),
      createdAt: budget.createdAt.toISOString(),
      updatedAt: budget.updatedAt.toISOString(),
      createdBy: budget.createdBy ?? undefined,
    })),
    totalCount,
    pageCount,
    page,
    pageSize,
  };
}

// Fetch a single budget by ID
export async function getBudgetById(id: string): Promise<BudgetDetail | null> {
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
    return null;
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

  return {
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
}

// Fetch a single transaction by ID
export async function getTransactionById(
  id: string
): Promise<TransactionDetail | null> {
  const transaction = await db
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
      category: {
        id: transactionCategories.id,
        name: transactionCategories.name,
        type: transactionCategories.type,
      },
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
      approvedBy: {
        id: users.id,
        name: users.name,
      },
    })
    .from(transactions)
    .leftJoin(
      transactionCategories,
      eq(transactions.categoryId, transactionCategories.id)
    )
    .leftJoin(costCenters, eq(transactions.costCenterId, costCenters.id))
    .leftJoin(projects, eq(transactions.projectId, projects.id))
    .leftJoin(users, eq(transactions.createdById, users.id))
    .where(and(eq(transactions.id, id), eq(transactions.isDeleted, false)))
    .limit(1);

  if (!transaction || transaction.length === 0) {
    return null;
  }

  // Convert date fields to ISO strings
  const result = transaction[0];
  const transactionWithStringDate = {
    ...result,
    date: result.date.toISOString(),
    approvedAt: result.approvedAt ? result.approvedAt.toISOString() : null,
    createdAt: result.createdAt.toISOString(),
    updatedAt: result.updatedAt.toISOString(),
  };

  return transactionWithStringDate;
}

// Fetch a paginated list of transactions
export async function getTransactionList({
  page = 0,
  pageSize = 10,
  sorts = ["-date"],
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
}): Promise<TransactionListResponse> {
  const offset = page * pageSize;

  // Build where conditions
  let whereConditions = [eq(transactions.isDeleted, false)];

  filters.forEach((filter) => {
    const [field, value] = filter.split(":");

    if (field === "type") {
      whereConditions.push(
        eq(
          transactions.type,
          value as (typeof transactionTypeEnum.enumValues)[number]
        )
      );
    } else if (field === "categoryId") {
      whereConditions.push(eq(transactions.categoryId, value));
    } else if (field === "projectId") {
      whereConditions.push(eq(transactions.projectId, value));
    } else if (field === "costCenterId") {
      whereConditions.push(eq(transactions.costCenterId, value));
    } else if (field === "createdById") {
      whereConditions.push(eq(transactions.createdById, value));
    } else if (field === "approvedById") {
      whereConditions.push(eq(transactions.approvedById, value));
    } else if (field === "amount" && value.includes("-")) {
      const [min, max] = value.split("-");
      if (min) whereConditions.push(gte(transactions.amount, min));
      if (max) whereConditions.push(lte(transactions.amount, max));
    } else if (field === "description") {
      whereConditions.push(like(transactions.description, `%${value}%`));
    } else if (field === "approved") {
      if (value === "true") {
        whereConditions.push(isNotNull(transactions.approvedById));
      } else if (value === "false") {
        whereConditions.push(isNull(transactions.approvedById));
      }
    }
  });

  // Add date range filter if provided
  if (dateFrom) {
    whereConditions.push(gte(transactions.date, new Date(dateFrom)));
  }
  if (dateTo) {
    whereConditions.push(lte(transactions.date, new Date(dateTo)));
  }

  // Build sort conditions
  const sortFields: Record<string, any> = {
    amount: transactions.amount,
    date: transactions.date,
    createdAt: transactions.createdAt,
    description: transactions.description,
    type: transactions.type,
  };

  let orderBy: any[] = [];

  sorts.forEach((sort) => {
    const direction = sort.startsWith("-") ? "desc" : "asc";
    const field = sort.replace(/^[-+]/, "");

    if (sortFields[field]) {
      if (direction === "asc") {
        orderBy.push(asc(sortFields[field]));
      } else {
        orderBy.push(desc(sortFields[field]));
      }
    }
  });

  // Default sort by date desc if no sort specified
  if (orderBy.length === 0) {
    orderBy.push(desc(transactions.date));
  }

  // Get total count for pagination
  const [{ value: totalCount }] = await db
    .select({ value: count() })
    .from(transactions)
    .where(and(...whereConditions));

  // Get paginated transactions
  const transactionsData = await db
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
      category: {
        id: transactionCategories.id,
        name: transactionCategories.name,
        type: transactionCategories.type,
      },
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
    .from(transactions)
    .leftJoin(
      transactionCategories,
      eq(transactions.categoryId, transactionCategories.id)
    )
    .leftJoin(costCenters, eq(transactions.costCenterId, costCenters.id))
    .leftJoin(projects, eq(transactions.projectId, projects.id))
    .leftJoin(users, eq(transactions.createdById, users.id))
    .where(and(...whereConditions))
    .orderBy(...orderBy)
    .limit(pageSize)
    .offset(offset);

  // Calculate page count
  const pageCount = Math.ceil(totalCount / pageSize);

  return {
    data: transactionsData.map((transaction) => ({
      ...transaction,
      date: transaction.date.toISOString(),
      approvedAt: transaction.approvedAt
        ? transaction.approvedAt.toISOString()
        : null,
      createdAt: transaction.createdAt.toISOString(),
      updatedAt: transaction.updatedAt.toISOString(),
    })),
    totalCount,
    pageCount,
    page,
    pageSize,
  };
}

// Fetch a paginated list of cost centers
export async function getCostCentersList({
  departmentId,
  withStats = false,
}: {
  departmentId?: string;
  withStats?: boolean;
} = {}): Promise<CostCenterListItem[]> {
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

    return query;
  }
  return costCentersData.map((costCenter) => ({
    ...costCenter,
    createdAt: costCenter.createdAt.toISOString(),
    updatedAt: costCenter.updatedAt.toISOString(),
  }));
}

// Fetch a single cost center by ID
export async function getCostCenterById(
  id: string
): Promise<CostCenterDetail | null> {
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
    return null;
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
      and(eq(transactions.costCenterId, id), eq(transactions.isDeleted, false))
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
      and(eq(transactions.costCenterId, id), eq(transactions.isDeleted, false))
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
        not(isNull(transactions.categoryId)),
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
      and(eq(transactions.costCenterId, id), eq(transactions.isDeleted, false))
    )
    .orderBy(desc(transactions.date))
    .limit(10);

  // Calculate balance
  const totalExpenses = transactionSummary?.totalExpenses || 0;
  const totalIncome = transactionSummary?.totalIncome || 0;
  const balance = totalIncome - totalExpenses;

  return {
    ...costCenter[0],
    createdAt: costCenter[0].createdAt.toISOString(),
    updatedAt: costCenter[0].updatedAt.toISOString(),
    activeBudgets: activeBudgets.map((b) => ({
      ...b,
      startDate: b.startDate.toISOString(),
      endDate: b.endDate.toISOString(),
      createdAt: b.createdAt.toISOString(),
      updatedAt: b.updatedAt.toISOString(),
    })),
    financialSummary: {
      totalExpenses: totalExpenses.toString(),
      totalIncome: totalIncome.toString(),
      balance: balance.toString(),
      transactionCount: transactionSummary?.transactionCount || 0,
      monthlyBreakdown: monthlyBreakdown.map((m) => ({
        ...m,
        expenses: m.expenses.toString(),
        income: m.income.toString(),
      })),
      topExpenseCategories: topExpenseCategories.map((c) => ({
        ...c,
        categoryId: c.categoryId as string,
      })),
    },
    recentTransactions: recentTransactions.map((t) => ({
      ...t,
      date: t.date.toISOString(),
      createdAt: t.createdAt.toISOString(),
    })),
  };
}

export async function getTransactionCategories({
  type,
  flat = false,
}: {
  type?: (typeof transactionTypeEnum.enumValues)[number];
  flat?: boolean;
}): Promise<TransactionCategoryWithChildren[] | TransactionCategoryItem[]> {
  // Build where conditions
  let whereConditions = [eq(transactionCategories.isDeleted, false)];

  if (type) {
    whereConditions.push(
      eq(
        transactionCategories.type,
        type as (typeof transactionTypeEnum.enumValues)[number]
      )
    );
  }

  // Get all categories
  const categories = await db
    .select({
      id: transactionCategories.id,
      name: transactionCategories.name,
      type: transactionCategories.type,
      description: transactionCategories.description,
      parentCategoryId: transactionCategories.parentCategoryId,
      createdAt: transactionCategories.createdAt,
      updatedAt: transactionCategories.updatedAt,
    })
    .from(transactionCategories)
    .where(and(...whereConditions))
    .orderBy(asc(transactionCategories.name));

  // If flat=true, return flat structure
  if (flat) {
    const formattedCategories: TransactionCategoryItem[] = categories.map(
      (cat) => ({
        ...cat,
        createdAt: cat.createdAt.toISOString(),
        updatedAt: cat.updatedAt.toISOString(),
      })
    );
    return formattedCategories;
  }

  // Group by parent category to create hierarchical structure
  const rootCategories = categories.filter((cat) => !cat.parentCategoryId);
  const categoriesMap = new Map<string, TransactionCategoryWithChildren>(
    categories.map((cat) => [
      cat.id,
      {
        ...cat,
        createdAt: cat.createdAt.toISOString(),
        updatedAt: cat.updatedAt.toISOString(),
        children: [],
      },
    ])
  );

  // Add child categories to their parents
  categories.forEach((cat) => {
    if (cat.parentCategoryId && categoriesMap.has(cat.parentCategoryId)) {
      const parent = categoriesMap.get(cat.parentCategoryId);
      if (parent) {
        parent.children.push(
          categoriesMap.get(cat.id) || {
            ...cat,
            createdAt: cat.createdAt.toISOString(),
            updatedAt: cat.updatedAt.toISOString(),
            children: [],
          }
        );
      }
    }
  });

  return rootCategories
    .map((cat) => categoriesMap.get(cat.id))
    .filter((cat): cat is TransactionCategoryWithChildren => cat !== undefined);
}
