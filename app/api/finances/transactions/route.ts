import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import {
  transactions,
  transactionCategories,
  costCenters,
  projects,
  users,
  transactionTypeEnum,
} from "@/lib/db/schema";
import {
  count,
  eq,
  and,
  sql,
  not,
  asc,
  desc,
  like,
  sum,
  between,
  isNotNull,
  isNull,
  gt,
  lt,
  gte,
  lte,
} from "drizzle-orm";
import { auth } from "@/lib/auth";
import { headers } from "next/headers";
import { revalidatePath } from "next/cache";
import {
  TransactionListResponse,
  TransactionCreateInput,
  TransactionListItem,
} from "@/lib/types";

// GET /api/finances/transactions - Get all transactions with filtering, sorting and pagination
export async function GET(req: NextRequest) {
  try {
    const session = await auth.api.getSession({
      headers: await headers(),
    });
    if (!session || !session.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const searchParams = req.nextUrl.searchParams;

    const page = parseInt(searchParams.get("page") || "1");
    const pageSize = parseInt(searchParams.get("pageSize") || "10");
    const sorts = searchParams.getAll("sorts");
    const filters = searchParams.getAll("filters");
    const dateFrom = searchParams.get("dateFrom");
    const dateTo = searchParams.get("dateTo");

    const offset = (page - 1) * pageSize;

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

    const response: TransactionListResponse = {
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

    return NextResponse.json(response);
  } catch (error) {
    console.error("Error fetching transactions:", error);
    return NextResponse.json(
      { error: "Failed to fetch transactions" },
      { status: 500 }
    );
  }
}

// POST /api/finances/transactions - Create a new transaction
export async function POST(req: NextRequest) {
  try {
    const session = await auth.api.getSession({
      headers: await headers(),
    });
    if (!session || !session.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const data: TransactionCreateInput = await req.json();

    // Validate required fields
    if (!data.type || !data.amount || !data.date || !data.categoryId) {
      return NextResponse.json(
        { error: "Type, amount, date, and category are required" },
        { status: 400 }
      );
    }

    // Check if the transaction type is valid
    if (!["income", "expense", "transfer"].includes(data.type)) {
      return NextResponse.json(
        { error: "Type must be one of: income, expense, transfer" },
        { status: 400 }
      );
    }

    const transaction = await db
      .insert(transactions)
      .values({
        type: data.type,
        amount: data.amount,
        description: data.description,
        date: new Date(data.date),
        categoryId: data.categoryId,
        costCenterId: data.costCenterId,
        projectId: data.projectId,
        createdById: session.user.id,
        approvedById: data.approvedById,
        approvedAt: data.approvedById ? new Date() : null,
        createdAt: new Date(),
        updatedAt: new Date(),
        isDeleted: false,
      })
      .returning();

    // Fetch the complete transaction with related data
    const completeTransaction = await db
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
      .where(eq(transactions.id, transaction[0].id))
      .limit(1);

    // Revalidate relevant paths
    revalidatePath("/dashboard/finances/transactions");
    revalidatePath("/dashboard/finances");

    return NextResponse.json(completeTransaction[0], { status: 201 });
  } catch (error) {
    console.error("Error creating transaction:", error);
    return NextResponse.json(
      { error: "Failed to create transaction" },
      { status: 500 }
    );
  }
}
