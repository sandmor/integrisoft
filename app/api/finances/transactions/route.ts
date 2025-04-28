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
import { getTransactionList } from "@/lib/actions/finances";
import { validateSession } from "@/lib/permission-handler";

// GET /api/finances/transactions - Get all transactions with filtering, sorting, and pagination
export async function GET(req: NextRequest) {
  if (!(await validateSession("finance", "read"))) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  try {
    const searchParams = req.nextUrl.searchParams;

    const page = parseInt(searchParams.get("page") || "1");
    const pageSize = parseInt(searchParams.get("pageSize") || "10");
    const sorts = searchParams.getAll("sorts");
    const filters = searchParams.getAll("filters");
    const dateFrom = searchParams.get("dateFrom");
    const dateTo = searchParams.get("dateTo");

    return NextResponse.json(
      await getTransactionList({
        page,
        pageSize,
        sorts,
        filters,
        dateFrom: dateFrom ?? undefined,
        dateTo: dateTo ?? undefined,
      })
    );
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
  const userId = await validateSession("finance", "write");
  if (!userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  try {
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
        createdById: userId,
        approvedById: data.approvedById,
        approvedAt: data.approvedById ? new Date() : null,
        createdAt: new Date(),
        updatedAt: new Date(),
        isDeleted: false,
      })
      .returning();

    console.log("Transaction created:", transaction);

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
