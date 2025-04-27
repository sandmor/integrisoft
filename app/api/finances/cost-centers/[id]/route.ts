import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import {
  costCenters,
  departments,
  budgets,
  transactions,
  transactionCategories,
} from "@/lib/db/schema";
import { count, eq, and, not, asc, desc, sum, sql } from "drizzle-orm";
import { auth } from "@/lib/auth";
import { headers } from "next/headers";
import { revalidatePath } from "next/cache";
import { getCostCenterById } from "@/lib/actions/finances";

// GET /api/finances/cost-centers/[id] - Get a single cost center by ID
export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await auth.api.getSession({
      headers: await headers(),
    });
    if (!session || !session.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id } = await params;

    const costCenter = await getCostCenterById(id);

    if (!costCenter) {
      return NextResponse.json(
        { error: "Cost center not found" },
        { status: 404 }
      );
    } else {
      return NextResponse.json(costCenter);
    }
  } catch (error) {
    console.error("Error fetching cost center:", error);
    return NextResponse.json(
      { error: "Failed to fetch cost center" },
      { status: 500 }
    );
  }
}

// PATCH /api/finances/cost-centers/[id] - Update a cost center
export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await auth.api.getSession({
      headers: await headers(),
    });
    if (!session || !session.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id } = await params;
    const data = await req.json();

    // Validate if cost center exists
    const existingCostCenter = await db
      .select()
      .from(costCenters)
      .where(and(eq(costCenters.id, id), eq(costCenters.isDeleted, false)))
      .limit(1);

    if (!existingCostCenter || existingCostCenter.length === 0) {
      return NextResponse.json(
        { error: "Cost center not found" },
        { status: 404 }
      );
    }

    // Check if name is unique if changing
    if (data.name && data.name !== existingCostCenter[0].name) {
      const costCenterWithSameName = await db
        .select()
        .from(costCenters)
        .where(
          and(
            eq(costCenters.name, data.name),
            eq(costCenters.isDeleted, false),
            not(eq(costCenters.id, id))
          )
        )
        .limit(1);

      if (costCenterWithSameName && costCenterWithSameName.length > 0) {
        return NextResponse.json(
          { error: "Cost center with this name already exists" },
          { status: 400 }
        );
      }
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

    // Prepare update data
    const updateData: any = {
      updatedAt: new Date(),
    };

    // Only include fields that are provided in the request
    if (data.name !== undefined) updateData.name = data.name;
    if (data.description !== undefined)
      updateData.description = data.description;
    if (data.budget !== undefined) updateData.budget = data.budget;
    if (data.departmentId !== undefined)
      updateData.departmentId = data.departmentId;

    // Update the cost center
    const updatedCostCenter = await db
      .update(costCenters)
      .set(updateData)
      .where(eq(costCenters.id, id))
      .returning();

    // Get the complete updated cost center with relations
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
      .where(eq(costCenters.id, id))
      .limit(1);

    // Revalidate relevant paths
    revalidatePath("/dashboard/finances/cost-centers");
    revalidatePath("/dashboard/finances");
    revalidatePath(`/dashboard/finances/cost-centers/${id}`);

    return NextResponse.json(completeCostCenter[0]);
  } catch (error) {
    console.error("Error updating cost center:", error);
    return NextResponse.json(
      { error: "Failed to update cost center" },
      { status: 500 }
    );
  }
}

// DELETE /api/finances/cost-centers/[id] - Delete a cost center
export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await auth.api.getSession({
      headers: await headers(),
    });
    if (!session || !session.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id } = await params;

    // Validate if cost center exists
    const existingCostCenter = await db
      .select()
      .from(costCenters)
      .where(and(eq(costCenters.id, id), eq(costCenters.isDeleted, false)))
      .limit(1);

    if (!existingCostCenter || existingCostCenter.length === 0) {
      return NextResponse.json(
        { error: "Cost center not found" },
        { status: 404 }
      );
    }

    // Check if this cost center has active budgets
    const [{ value: budgetCount }] = await db
      .select({ value: count() })
      .from(budgets)
      .where(and(eq(budgets.costCenterId, id), eq(budgets.isDeleted, false)));

    if (budgetCount > 0) {
      return NextResponse.json(
        { error: "Cannot delete cost center that has active budgets" },
        { status: 400 }
      );
    }

    // Check if this cost center has transactions
    const [{ value: transactionCount }] = await db
      .select({ value: count() })
      .from(transactions)
      .where(
        and(
          eq(transactions.costCenterId, id),
          eq(transactions.isDeleted, false)
        )
      );

    if (transactionCount > 0) {
      return NextResponse.json(
        { error: "Cannot delete cost center that has transactions" },
        { status: 400 }
      );
    }

    // Soft delete the cost center
    await db
      .update(costCenters)
      .set({
        isDeleted: true,
        updatedAt: new Date(),
      })
      .where(eq(costCenters.id, id));

    // Revalidate relevant paths
    revalidatePath("/dashboard/finances/cost-centers");
    revalidatePath("/dashboard/finances");
    revalidatePath(`/dashboard/finances/cost-centers/${id}`);

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Error deleting cost center:", error);
    return NextResponse.json(
      { error: "Failed to delete cost center" },
      { status: 500 }
    );
  }
}
