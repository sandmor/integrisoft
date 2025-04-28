import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { transactionCategories, transactions } from "@/lib/db/schema";
import { count, eq, and, not } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { TransactionCategoryDetail } from "@/lib/types";
import { validateSession } from "@/lib/permission-handler";

// GET /api/finances/categories/[id] - Get a single transaction category
export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  if (!(await validateSession("finance", "read"))) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  try {
    const { id } = await params;

    const category = await db
      .select()
      .from(transactionCategories)
      .where(
        and(
          eq(transactionCategories.id, id),
          eq(transactionCategories.isDeleted, false)
        )
      )
      .limit(1);

    if (!category || category.length === 0) {
      return NextResponse.json(
        { error: "Transaction category not found" },
        { status: 404 }
      );
    }

    // Get child categories if any
    const childCategories = await db
      .select()
      .from(transactionCategories)
      .where(
        and(
          eq(transactionCategories.parentCategoryId, id),
          eq(transactionCategories.isDeleted, false)
        )
      );

    // Get parent category if any
    let parentCategory = null;
    if (category[0].parentCategoryId) {
      const parent = await db
        .select()
        .from(transactionCategories)
        .where(
          and(
            eq(transactionCategories.id, category[0].parentCategoryId),
            eq(transactionCategories.isDeleted, false)
          )
        )
        .limit(1);

      if (parent && parent.length > 0) {
        parentCategory = parent[0];
      }
    }

    // Count transactions using this category
    const [{ value: transactionCount }] = await db
      .select({ value: count() })
      .from(transactions)
      .where(
        and(eq(transactions.categoryId, id), eq(transactions.isDeleted, false))
      );

    const response: TransactionCategoryDetail = {
      ...category[0],
      createdAt: category[0].createdAt.toISOString(),
      updatedAt: category[0].updatedAt.toISOString(),
      childCategories:
        childCategories.length > 0
          ? childCategories.map((cat) => ({
              ...cat,
              createdAt: cat.createdAt.toISOString(),
              updatedAt: cat.updatedAt.toISOString(),
            }))
          : undefined,
      parentCategory: parentCategory
        ? {
            ...parentCategory,
            createdAt: parentCategory.createdAt.toISOString(),
            updatedAt: parentCategory.updatedAt.toISOString(),
          }
        : undefined,
      transactionCount,
    };

    return NextResponse.json(response);
  } catch (error) {
    console.error("Error fetching transaction category:", error);
    return NextResponse.json(
      { error: "Failed to fetch transaction category" },
      { status: 500 }
    );
  }
}

// PATCH /api/finances/categories/[id] - Update a transaction category
export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  if (!(await validateSession("finance", "write"))) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  try {
    const { id } = await params;
    const data = await req.json();

    // Validate if category exists
    const existingCategory = await db
      .select()
      .from(transactionCategories)
      .where(
        and(
          eq(transactionCategories.id, id),
          eq(transactionCategories.isDeleted, false)
        )
      )
      .limit(1);

    if (!existingCategory || existingCategory.length === 0) {
      return NextResponse.json(
        { error: "Transaction category not found" },
        { status: 404 }
      );
    }

    // Check for type changes
    if (data.type && data.type !== existingCategory[0].type) {
      // Check if this category has transactions
      const [{ value: transactionCount }] = await db
        .select({ value: count() })
        .from(transactions)
        .where(
          and(
            eq(transactions.categoryId, id),
            eq(transactions.isDeleted, false)
          )
        );

      if (transactionCount > 0) {
        return NextResponse.json(
          { error: "Cannot change type of category that has transactions" },
          { status: 400 }
        );
      }

      // Check if this category has children
      const [{ value: childCount }] = await db
        .select({ value: count() })
        .from(transactionCategories)
        .where(
          and(
            eq(transactionCategories.parentCategoryId, id),
            eq(transactionCategories.isDeleted, false)
          )
        );

      if (childCount > 0) {
        return NextResponse.json(
          { error: "Cannot change type of category that has child categories" },
          { status: 400 }
        );
      }
    }

    // Check if parent category exists if provided
    if (data.parentCategoryId) {
      // Cannot set parent to self
      if (data.parentCategoryId === id) {
        return NextResponse.json(
          { error: "Category cannot be its own parent" },
          { status: 400 }
        );
      }

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
      const categoryType = data.type || existingCategory[0].type;
      if (parentCategory[0].type !== categoryType) {
        return NextResponse.json(
          { error: "Parent category must have same type as child category" },
          { status: 400 }
        );
      }

      // Check for circular references
      let currentParentId = parentCategory[0].parentCategoryId;
      while (currentParentId) {
        if (currentParentId === id) {
          return NextResponse.json(
            { error: "Circular reference detected in category hierarchy" },
            { status: 400 }
          );
        }

        const currentParent = await db
          .select()
          .from(transactionCategories)
          .where(eq(transactionCategories.id, currentParentId))
          .limit(1);

        if (!currentParent || currentParent.length === 0) {
          break;
        }

        currentParentId = currentParent[0].parentCategoryId;
      }
    }

    // Check if category with same name already exists
    if (data.name && data.name !== existingCategory[0].name) {
      const categoryWithSameName = await db
        .select()
        .from(transactionCategories)
        .where(
          and(
            eq(transactionCategories.name, data.name),
            eq(
              transactionCategories.type,
              data.type || existingCategory[0].type
            ),
            eq(transactionCategories.isDeleted, false),
            not(eq(transactionCategories.id, id))
          )
        )
        .limit(1);

      if (categoryWithSameName && categoryWithSameName.length > 0) {
        return NextResponse.json(
          { error: "Category with this name and type already exists" },
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
    if (data.type !== undefined) updateData.type = data.type;
    if (data.description !== undefined)
      updateData.description = data.description;
    if (data.parentCategoryId !== undefined)
      updateData.parentCategoryId = data.parentCategoryId;

    // Update the category
    const updatedCategory = await db
      .update(transactionCategories)
      .set(updateData)
      .where(eq(transactionCategories.id, id))
      .returning();

    // Revalidate relevant paths
    revalidatePath("/dashboard/finances/categories");
    revalidatePath("/dashboard/finances");
    revalidatePath(`/dashboard/finances/categories/${id}`);

    return NextResponse.json(updatedCategory[0]);
  } catch (error) {
    console.error("Error updating transaction category:", error);
    return NextResponse.json(
      { error: "Failed to update transaction category" },
      { status: 500 }
    );
  }
}

// DELETE /api/finances/categories/[id] - Delete a transaction category
export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  if (!(await validateSession("finance", "write"))) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  try {
    const { id } = await params;

    // Validate if category exists
    const existingCategory = await db
      .select()
      .from(transactionCategories)
      .where(
        and(
          eq(transactionCategories.id, id),
          eq(transactionCategories.isDeleted, false)
        )
      )
      .limit(1);

    if (!existingCategory || existingCategory.length === 0) {
      return NextResponse.json(
        { error: "Transaction category not found" },
        { status: 404 }
      );
    }

    // Check if this category has transactions
    const [{ value: transactionCount }] = await db
      .select({ value: count() })
      .from(transactions)
      .where(
        and(eq(transactions.categoryId, id), eq(transactions.isDeleted, false))
      );

    if (transactionCount > 0) {
      return NextResponse.json(
        { error: "Cannot delete category that has transactions" },
        { status: 400 }
      );
    }

    // Check if this category has children
    const [{ value: childCount }] = await db
      .select({ value: count() })
      .from(transactionCategories)
      .where(
        and(
          eq(transactionCategories.parentCategoryId, id),
          eq(transactionCategories.isDeleted, false)
        )
      );

    if (childCount > 0) {
      return NextResponse.json(
        { error: "Cannot delete category that has child categories" },
        { status: 400 }
      );
    }

    // Soft delete the category
    await db
      .update(transactionCategories)
      .set({
        isDeleted: true,
        updatedAt: new Date(),
      })
      .where(eq(transactionCategories.id, id));

    // Revalidate relevant paths
    revalidatePath("/dashboard/finances/categories");
    revalidatePath("/dashboard/finances");
    revalidatePath(`/dashboard/finances/categories/${id}`);

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Error deleting transaction category:", error);
    return NextResponse.json(
      { error: "Failed to delete transaction category" },
      { status: 500 }
    );
  }
}
