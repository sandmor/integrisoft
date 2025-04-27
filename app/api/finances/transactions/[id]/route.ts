import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import {
  transactions,
  transactionCategories,
  costCenters,
  projects,
  users,
} from "@/lib/db/schema";
import { eq, and } from "drizzle-orm";
import { TransactionDetail, TransactionUpdateInput } from "@/lib/types";
import { revalidatePath } from "next/cache";
import { getTransactionById } from "@/lib/actions/finances";
import { validateSession } from "@/lib/permission-handler";

// GET /api/finances/transactions/[id] - Get a single transaction by ID
export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  if (!(await validateSession("read_transactions"))) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  try {
    const { id } = await params;

    const transaction = await getTransactionById(id);

    if (!transaction) {
      return NextResponse.json(
        { error: "Transaction not found" },
        { status: 404 }
      );
    } else {
      return NextResponse.json(transaction);
    }
  } catch (error) {
    console.error("Error fetching transaction:", error);
    return NextResponse.json(
      { error: "Failed to fetch transaction" },
      { status: 500 }
    );
  }
}

// PATCH /api/finances/transactions/[id] - Update a transaction
export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  if (!(await validateSession("write_transactions"))) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  try {
    const { id } = await params;
    const data: TransactionUpdateInput = await req.json();

    // Validate if transaction exists
    const existingTransaction = await db
      .select()
      .from(transactions)
      .where(and(eq(transactions.id, id), eq(transactions.isDeleted, false)))
      .limit(1);

    if (!existingTransaction || existingTransaction.length === 0) {
      return NextResponse.json(
        { error: "Transaction not found" },
        { status: 404 }
      );
    }

    // Check if the transaction type is valid
    if (data.type && !["income", "expense", "transfer"].includes(data.type)) {
      return NextResponse.json(
        { error: "Type must be one of: income, expense, transfer" },
        { status: 400 }
      );
    }

    // Prepare update data
    const updateData: any = {
      updatedAt: new Date(),
    };

    // Only include fields that are provided in the request
    if (data.type !== undefined) updateData.type = data.type;
    if (data.amount !== undefined) updateData.amount = data.amount;
    if (data.description !== undefined)
      updateData.description = data.description;
    if (data.date !== undefined) updateData.date = new Date(data.date);
    if (data.categoryId !== undefined) updateData.categoryId = data.categoryId;
    if (data.costCenterId !== undefined)
      updateData.costCenterId = data.costCenterId;
    if (data.projectId !== undefined) updateData.projectId = data.projectId;

    // Handle approval
    if (data.approvedById !== undefined) {
      updateData.approvedById = data.approvedById;
      updateData.approvedAt = data.approvedById ? new Date() : null;
    }

    // Update the transaction
    await db
      .update(transactions)
      .set(updateData)
      .where(eq(transactions.id, id));

    // Fetch the updated transaction
    const updatedTransaction = await db
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
      .where(eq(transactions.id, id))
      .limit(1);

    const result = updatedTransaction[0];
    const transactionWithStringDate = result
      ? {
          ...result,
          date: result.date.toISOString(),
          approvedAt: result.approvedAt
            ? result.approvedAt.toISOString()
            : null,
          createdAt: result.createdAt.toISOString(),
          updatedAt: result.updatedAt.toISOString(),
        }
      : null;

    revalidatePath("/dashboard/finances/transactions");
    revalidatePath("/dashboard/finances");
    revalidatePath(`/dashboard/finances/transactions/${id}`);

    return NextResponse.json(transactionWithStringDate as TransactionDetail);
  } catch (error) {
    console.error("Error updating transaction:", error);
    return NextResponse.json(
      { error: "Failed to update transaction" },
      { status: 500 }
    );
  }
}

// DELETE /api/finances/transactions/[id] - Delete a transaction (soft delete)
export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  if (!(await validateSession("write_transactions"))) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  try {
    const { id } = await params;

    // Validate if transaction exists
    const existingTransaction = await db
      .select()
      .from(transactions)
      .where(and(eq(transactions.id, id), eq(transactions.isDeleted, false)))
      .limit(1);

    if (!existingTransaction || existingTransaction.length === 0) {
      return NextResponse.json(
        { error: "Transaction not found" },
        { status: 404 }
      );
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
    revalidatePath(`/dashboard/finances/transactions/${id}`);

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Error deleting transaction:", error);
    return NextResponse.json(
      { error: "Failed to delete transaction" },
      { status: 500 }
    );
  }
}
