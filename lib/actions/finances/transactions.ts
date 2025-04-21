import {
  and,
  asc,
  count,
  desc,
  eq,
  getTableColumns,
  gt,
  gte,
  ilike,
  inArray,
  lt,
  lte,
  or,
  sql,
} from "drizzle-orm";
import { db } from "../../db";
import { createId } from "@paralleldrive/cuid2";
import {
  transactions,
  transactionCategories,
  costCenters,
  projects,
  users,
  employees,
} from "../../db/schema";
import { revalidatePath } from "next/cache";
import { errorHandler } from "../../error-handler";
import { format, subMonths } from "date-fns";

// Get all transactions with filters and pagination
export async function getTransactions({
  page = 1,
  pageSize = 10,
  search = "",
  type,
  categoryId,
  costCenterId,
  projectId,
  startDate,
  endDate,
  minAmount,
  maxAmount,
  sort = "date",
  sortDirection = "desc",
}: {
  page?: number;
  pageSize?: number;
  search?: string;
  type?: "income" | "expense" | "transfer";
  categoryId?: string;
  costCenterId?: string;
  projectId?: string;
  startDate?: Date;
  endDate?: Date;
  minAmount?: number;
  maxAmount?: number;
  sort?: string;
  sortDirection?: "asc" | "desc";
}) {
  try {
    const offset = (page - 1) * pageSize;

    // Build filters
    let filters = [eq(transactions.isDeleted, false)];

    // Add search filter if provided
    if (search) {
      filters.push(ilike(transactions.description, `%${search}%`));
    }

    // Add type filter if provided
    if (type) {
      filters.push(eq(transactions.type, type));
    }

    // Add category filter if provided
    if (categoryId) {
      filters.push(eq(transactions.categoryId, categoryId));
    }

    // Add cost center filter if provided
    if (costCenterId) {
      filters.push(eq(transactions.costCenterId, costCenterId));
    }

    // Add project filter if provided
    if (projectId) {
      filters.push(eq(transactions.projectId, projectId));
    }

    // Add date range filters if provided
    if (startDate) {
      filters.push(gte(transactions.date, startDate));
    }

    if (endDate) {
      filters.push(lte(transactions.date, endDate));
    }

    // Add amount range filters if provided
    if (minAmount !== undefined) {
      filters.push(gte(transactions.amount, minAmount));
    }

    if (maxAmount !== undefined) {
      filters.push(lte(transactions.amount, maxAmount));
    }

    // Determine sorting
    let orderBy;
    if (sort === "amount") {
      orderBy =
        sortDirection === "asc"
          ? asc(transactions.amount)
          : desc(transactions.amount);
    } else if (sort === "date") {
      orderBy =
        sortDirection === "asc"
          ? asc(transactions.date)
          : desc(transactions.date);
    } else if (sort === "createdAt") {
      orderBy =
        sortDirection === "asc"
          ? asc(transactions.createdAt)
          : desc(transactions.createdAt);
    } else {
      orderBy = desc(transactions.date);
    }

    // Count total for pagination
    const [{ value: total }] = await db
      .select({ value: count() })
      .from(transactions)
      .where(and(...filters));

    // Get transactions
    const results = await db
      .select({
        transaction: getTableColumns(transactions),
        category: transactionCategories
          ? getTableColumns(transactionCategories)
          : null,
        costCenter: costCenters ? getTableColumns(costCenters) : null,
        project: projects
          ? {
              id: projects.id,
              name: projects.name,
            }
          : null,
        createdBy: users
          ? {
              id: users.id,
              name: users.name,
              lastName: users.lastName,
            }
          : null,
      })
      .from(transactions)
      .leftJoin(
        transactionCategories,
        eq(transactions.categoryId, transactionCategories.id)
      )
      .leftJoin(costCenters, eq(transactions.costCenterId, costCenters.id))
      .leftJoin(projects, eq(transactions.projectId, projects.id))
      .leftJoin(users, eq(transactions.createdById, users.id))
      .where(and(...filters))
      .orderBy(orderBy)
      .limit(pageSize)
      .offset(offset);

    return {
      data: results,
      pagination: {
        page,
        pageSize,
        total,
        pageCount: Math.ceil(total / pageSize),
      },
    };
  } catch (error) {
    return errorHandler(error, "Failed to fetch transactions");
  }
}

// Get a transaction by ID
export async function getTransactionById(id: string) {
  try {
    const result = await db
      .select({
        transaction: getTableColumns(transactions),
        category: transactionCategories
          ? getTableColumns(transactionCategories)
          : null,
        costCenter: costCenters ? getTableColumns(costCenters) : null,
        project: projects
          ? {
              id: projects.id,
              name: projects.name,
            }
          : null,
        createdBy: users
          ? {
              id: users.id,
              name: users.name,
              lastName: users.lastName,
            }
          : null,
        approvedBy: users
          ? {
              id: users.id,
              name: users.name,
              lastName: users.lastName,
            }
          : null,
      })
      .from(transactions)
      .leftJoin(
        transactionCategories,
        eq(transactions.categoryId, transactionCategories.id)
      )
      .leftJoin(costCenters, eq(transactions.costCenterId, costCenters.id))
      .leftJoin(projects, eq(transactions.projectId, projects.id))
      .leftJoin(users, eq(transactions.createdById, users.id))
      .where(and(eq(transactions.id, id), eq(transactions.isDeleted, false)));

    if (result.length === 0) {
      return { error: "Transaction not found" };
    }

    return { data: result[0] };
  } catch (error) {
    return errorHandler(error, "Failed to fetch transaction");
  }
}

// Create a transaction
export async function createTransaction({
  type,
  amount,
  description,
  date,
  categoryId,
  costCenterId,
  projectId,
  userId,
}: {
  type: "income" | "expense" | "transfer";
  amount: number;
  description?: string;
  date: Date;
  categoryId?: string;
  costCenterId?: string;
  projectId?: string;
  userId: string;
}) {
  try {
    // Validate amount
    if (amount <= 0) {
      return { error: "Amount must be greater than zero" };
    }

    // Validate type and ensure proper category selection
    if (categoryId) {
      const category = await db.query.transactionCategories.findFirst({
        where: eq(transactionCategories.id, categoryId),
      });

      if (!category) {
        return { error: "Category not found" };
      }

      if (category.type !== type) {
        return { error: `Category type must match transaction type: ${type}` };
      }
    }

    const id = createId();
    const newTransaction = await db
      .insert(transactions)
      .values({
        id,
        type,
        amount,
        description: description || null,
        date,
        categoryId: categoryId || null,
        costCenterId: costCenterId || null,
        projectId: projectId || null,
        createdById: userId,
        createdAt: new Date(),
        updatedAt: new Date(),
        isDeleted: false,
      })
      .returning();

    revalidatePath("/dashboard/finances/transactions");
    revalidatePath("/dashboard/finances");

    return { data: newTransaction[0] };
  } catch (error) {
    return errorHandler(error, "Failed to create transaction");
  }
}

// Update a transaction
export async function updateTransaction({
  id,
  type,
  amount,
  description,
  date,
  categoryId,
  costCenterId,
  projectId,
  userId,
}: {
  id: string;
  type?: "income" | "expense" | "transfer";
  amount?: number;
  description?: string | null;
  date?: Date;
  categoryId?: string | null;
  costCenterId?: string | null;
  projectId?: string | null;
  userId: string; // For audit purposes
}) {
  try {
    // Check if transaction exists
    const existingTransaction = await db.query.transactions.findFirst({
      where: and(eq(transactions.id, id), eq(transactions.isDeleted, false)),
    });

    if (!existingTransaction) {
      return { error: "Transaction not found" };
    }

    // Validate amount if provided
    if (amount !== undefined && amount <= 0) {
      return { error: "Amount must be greater than zero" };
    }

    // Determine the transaction type (either new type or existing type)
    const transactionType = type || existingTransaction.type;

    // Validate category if provided
    if (categoryId) {
      const category = await db.query.transactionCategories.findFirst({
        where: eq(transactionCategories.id, categoryId),
      });

      if (!category) {
        return { error: "Category not found" };
      }

      if (category.type !== transactionType) {
        return {
          error: `Category type must match transaction type: ${transactionType}`,
        };
      }
    }

    const updatedTransaction = await db
      .update(transactions)
      .set({
        type: type !== undefined ? type : undefined,
        amount: amount !== undefined ? amount : undefined,
        description: description !== undefined ? description : undefined,
        date: date !== undefined ? date : undefined,
        categoryId: categoryId !== undefined ? categoryId : undefined,
        costCenterId: costCenterId !== undefined ? costCenterId : undefined,
        projectId: projectId !== undefined ? projectId : undefined,
        updatedAt: new Date(),
      })
      .where(eq(transactions.id, id))
      .returning();

    revalidatePath("/dashboard/finances/transactions");
    revalidatePath("/dashboard/finances");
    revalidatePath(`/dashboard/finances/transactions/${id}`);

    return { data: updatedTransaction[0] };
  } catch (error) {
    return errorHandler(error, "Failed to update transaction");
  }
}

// Delete a transaction (soft delete)
export async function deleteTransaction(id: string) {
  try {
    // Check if transaction exists
    const existingTransaction = await db.query.transactions.findFirst({
      where: and(eq(transactions.id, id), eq(transactions.isDeleted, false)),
    });

    if (!existingTransaction) {
      return { error: "Transaction not found" };
    }

    // Soft delete the transaction
    await db
      .update(transactions)
      .set({
        isDeleted: true,
        updatedAt: new Date(),
      })
      .where(eq(transactions.id, id));

    revalidatePath("/dashboard/finances/transactions");
    revalidatePath("/dashboard/finances");

    return { success: true };
  } catch (error) {
    return errorHandler(error, "Failed to delete transaction");
  }
}

// Approve a transaction
export async function approveTransaction({
  id,
  userId,
}: {
  id: string;
  userId: string;
}) {
  try {
    // Check if transaction exists
    const existingTransaction = await db.query.transactions.findFirst({
      where: and(eq(transactions.id, id), eq(transactions.isDeleted, false)),
    });

    if (!existingTransaction) {
      return { error: "Transaction not found" };
    }

    // Check if transaction is already approved
    if (existingTransaction.approvedById) {
      return { error: "Transaction is already approved" };
    }

    // Approve the transaction
    const updatedTransaction = await db
      .update(transactions)
      .set({
        approvedById: userId,
        approvedAt: new Date(),
        updatedAt: new Date(),
      })
      .where(eq(transactions.id, id))
      .returning();

    revalidatePath("/dashboard/finances/transactions");
    revalidatePath("/dashboard/finances");
    revalidatePath(`/dashboard/finances/transactions/${id}`);

    return { data: updatedTransaction[0] };
  } catch (error) {
    return errorHandler(error, "Failed to approve transaction");
  }
}

// Get transaction statistics for dashboard
export async function getTransactionStats() {
  try {
    const currentDate = new Date();
    const currentMonth = format(currentDate, "yyyy-MM");
    const previousMonth = format(subMonths(currentDate, 1), "yyyy-MM");

    // Get current month stats
    const currentMonthIncome = await db
      .select({ total: sql`sum(${transactions.amount})` })
      .from(transactions)
      .where(
        and(
          eq(transactions.type, "income"),
          eq(transactions.isDeleted, false),
          sql`to_char(${transactions.date}, 'YYYY-MM') = ${currentMonth}`
        )
      );

    const currentMonthExpense = await db
      .select({ total: sql`sum(${transactions.amount})` })
      .from(transactions)
      .where(
        and(
          eq(transactions.type, "expense"),
          eq(transactions.isDeleted, false),
          sql`to_char(${transactions.date}, 'YYYY-MM') = ${currentMonth}`
        )
      );

    // Get previous month stats
    const previousMonthIncome = await db
      .select({ total: sql`sum(${transactions.amount})` })
      .from(transactions)
      .where(
        and(
          eq(transactions.type, "income"),
          eq(transactions.isDeleted, false),
          sql`to_char(${transactions.date}, 'YYYY-MM') = ${previousMonth}`
        )
      );

    const previousMonthExpense = await db
      .select({ total: sql`sum(${transactions.amount})` })
      .from(transactions)
      .where(
        and(
          eq(transactions.type, "expense"),
          eq(transactions.isDeleted, false),
          sql`to_char(${transactions.date}, 'YYYY-MM') = ${previousMonth}`
        )
      );

    // Get recent transactions
    const recentTransactions = await db
      .select({
        transaction: getTableColumns(transactions),
        category: transactionCategories
          ? getTableColumns(transactionCategories)
          : null,
      })
      .from(transactions)
      .leftJoin(
        transactionCategories,
        eq(transactions.categoryId, transactionCategories.id)
      )
      .where(eq(transactions.isDeleted, false))
      .orderBy(desc(transactions.date))
      .limit(5);

    // Calculate stats
    const currentIncome = currentMonthIncome[0]?.total || 0;
    const currentExpense = currentMonthExpense[0]?.total || 0;
    const previousIncome = previousMonthIncome[0]?.total || 0;
    const previousExpense = previousMonthExpense[0]?.total || 0;

    const incomeChange =
      previousIncome > 0
        ? ((currentIncome - previousIncome) / previousIncome) * 100
        : 100;

    const expenseChange =
      previousExpense > 0
        ? ((currentExpense - previousExpense) / previousExpense) * 100
        : 100;

    return {
      data: {
        currentMonth: {
          income: currentIncome,
          expense: currentExpense,
          net: currentIncome - currentExpense,
        },
        previousMonth: {
          income: previousIncome,
          expense: previousExpense,
          net: previousIncome - previousExpense,
        },
        changes: {
          income: incomeChange,
          expense: expenseChange,
        },
        recentTransactions,
      },
    };
  } catch (error) {
    return errorHandler(error, "Failed to fetch transaction statistics");
  }
}

// Get category distribution for dashboard
export async function getCategoryDistribution(
  type: "income" | "expense",
  period: "month" | "quarter" | "year" = "month"
) {
  try {
    const currentDate = new Date();
    let dateFilter;

    // Determine date filter based on period
    switch (period) {
      case "month":
        dateFilter = sql`to_char(${transactions.date}, 'YYYY-MM') = ${format(
          currentDate,
          "yyyy-MM"
        )}`;
        break;
      case "quarter":
        // Using PostgreSQL's date_trunc function to get the current quarter
        dateFilter = sql`date_trunc('quarter', ${transactions.date}) = date_trunc('quarter', ${currentDate}::date)`;
        break;
      case "year":
        dateFilter = sql`extract(year from ${
          transactions.date
        }) = ${currentDate.getFullYear()}`;
        break;
      default:
        dateFilter = sql`to_char(${transactions.date}, 'YYYY-MM') = ${format(
          currentDate,
          "yyyy-MM"
        )}`;
    }

    // Get category distribution
    const distribution = await db
      .select({
        categoryId: transactions.categoryId,
        categoryName: transactionCategories.name,
        total: sql`sum(${transactions.amount})`,
      })
      .from(transactions)
      .leftJoin(
        transactionCategories,
        eq(transactions.categoryId, transactionCategories.id)
      )
      .where(
        and(
          eq(transactions.type, type),
          eq(transactions.isDeleted, false),
          dateFilter
        )
      )
      .groupBy(transactions.categoryId, transactionCategories.name)
      .orderBy(desc(sql`sum(${transactions.amount})`));

    return { data: distribution };
  } catch (error) {
    return errorHandler(error, "Failed to fetch category distribution");
  }
}
