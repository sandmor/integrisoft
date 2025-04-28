import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { transactionCategories } from "@/lib/db/schema";
import { eq, and } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import {
  TransactionCategoryItem,
  TransactionCategoryCreateInput,
} from "@/lib/types";
import { getTransactionCategories } from "@/lib/actions/finances";
import { validateSession } from "@/lib/permission-handler";

// GET /api/finances/categories - Get all transaction categories with optional filtering by type
export async function GET(req: NextRequest) {
  if (!(await validateSession("finance", "read"))) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  try {
    const searchParams = req.nextUrl.searchParams;
    const type = searchParams.get("type");
    const flat = searchParams.get("flat") === "true";

    return NextResponse.json(
      await getTransactionCategories({
        type: type as any,
        flat,
      }),
      { status: 200 }
    );
  } catch (error) {
    console.error("Error fetching transaction categories:", error);
    return NextResponse.json(
      { error: "Failed to fetch transaction categories" },
      { status: 500 }
    );
  }
}

// POST /api/finances/categories - Create a new transaction category
export async function POST(req: NextRequest) {
  if (!(await validateSession("finance", "write"))) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  try {
    const data: TransactionCategoryCreateInput = await req.json();

    // Validate required fields
    if (!data.name || !data.type) {
      return NextResponse.json(
        { error: "Name and type are required" },
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

    // Check if parent category exists if provided
    if (data.parentCategoryId) {
      const parentCategory = await db
        .select()
        .from(transactionCategories)
        .where(
          and(
            eq(transactionCategories.id, data.parentCategoryId),
            eq(transactionCategories.isDeleted, false)
          )
        )
        .limit(1);

      if (!parentCategory || parentCategory.length === 0) {
        return NextResponse.json(
          { error: "Parent category not found" },
          { status: 400 }
        );
      }

      // Ensure parent category has same type as child
      if (parentCategory[0].type !== data.type) {
        return NextResponse.json(
          { error: "Parent category must have same type as child category" },
          { status: 400 }
        );
      }
    }

    // Check if category with same name already exists
    const existingCategory = await db
      .select()
      .from(transactionCategories)
      .where(
        and(
          eq(transactionCategories.name, data.name),
          eq(transactionCategories.type, data.type),
          eq(transactionCategories.isDeleted, false)
        )
      )
      .limit(1);

    if (existingCategory && existingCategory.length > 0) {
      return NextResponse.json(
        { error: "Category with this name and type already exists" },
        { status: 400 }
      );
    }

    // Create new category
    const newCategory = await db
      .insert(transactionCategories)
      .values({
        name: data.name,
        type: data.type,
        description: data.description,
        parentCategoryId: data.parentCategoryId,
        createdAt: new Date(),
        updatedAt: new Date(),
        isDeleted: false,
      })
      .returning();

    const formattedCategory = {
      ...newCategory[0],
      createdAt: newCategory[0].createdAt.toISOString(),
      updatedAt: newCategory[0].updatedAt.toISOString(),
    };

    // Revalidate relevant paths
    revalidatePath("/dashboard/finances/categories");
    revalidatePath("/dashboard/finances");

    return NextResponse.json(formattedCategory as TransactionCategoryItem, {
      status: 201,
    });
  } catch (error) {
    console.error("Error creating transaction category:", error);
    return NextResponse.json(
      { error: "Failed to create transaction category" },
      { status: 500 }
    );
  }
}
