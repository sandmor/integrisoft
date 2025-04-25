import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { transactionCategories, transactionTypeEnum } from "@/lib/db/schema";
import { count, eq, and, not, asc, desc, like, isNull } from "drizzle-orm";
import { auth } from "@/lib/auth";
import { headers } from "next/headers";
import { revalidatePath } from "next/cache";
import {
  TransactionCategoryWithChildren,
  TransactionCategoryItem,
  TransactionCategoryCreateInput,
} from "@/lib/types";

// GET /api/finances/categories - Get all transaction categories with optional filtering by type
export async function GET(req: NextRequest) {
  try {
    const session = await auth.api.getSession({
      headers: await headers(),
    });
    if (!session || !session.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const searchParams = req.nextUrl.searchParams;
    const type = searchParams.get("type");

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

    // If flat=true query param is provided, return flat structure
    if (searchParams.get("flat") === "true") {
      const formattedCategories = categories.map((cat) => ({
        ...cat,
        createdAt: cat.createdAt.toISOString(),
        updatedAt: cat.updatedAt.toISOString(),
      }));
      return NextResponse.json(
        formattedCategories as TransactionCategoryItem[]
      );
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

    return NextResponse.json(
      rootCategories.map((cat) =>
        categoriesMap.get(cat.id)
      ) as TransactionCategoryWithChildren[]
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
  try {
    const session = await auth.api.getSession({
      headers: await headers(),
    });
    if (!session || !session.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

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
