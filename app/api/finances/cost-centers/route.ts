import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import {
  costCenters,
  departments,
  budgets,
  transactions,
} from "@/lib/db/schema";
import { eq, and } from "drizzle-orm";
import { auth } from "@/lib/auth";
import { headers } from "next/headers";
import { revalidatePath } from "next/cache";
import { getCostCentersList } from "@/lib/actions/finances";

// GET /api/finances/cost-centers - Get all cost centers
export async function GET(req: NextRequest) {
  try {
    const session = await auth.api.getSession({
      headers: await headers(),
    });
    if (!session || !session.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const searchParams = req.nextUrl.searchParams;
    const departmentIdParam = searchParams.get("departmentId");
    const departmentId =
      departmentIdParam === null ? undefined : departmentIdParam;
    const withStats = searchParams.get("withStats") === "true";

    return NextResponse.json(
      await getCostCentersList({ departmentId, withStats }),
      {
        status: 200,
      }
    );
  } catch (error) {
    console.error("Error fetching cost centers:", error);
    return NextResponse.json(
      { error: "Failed to fetch cost centers" },
      { status: 500 }
    );
  }
}

// POST /api/finances/cost-centers - Create a new cost center
export async function POST(req: NextRequest) {
  try {
    const session = await auth.api.getSession({
      headers: await headers(),
    });
    if (!session || !session.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const data = await req.json();

    // Validate required fields
    if (!data.name) {
      return NextResponse.json({ error: "Name is required" }, { status: 400 });
    }

    // Check if cost center with same name already exists
    const existingCostCenter = await db
      .select()
      .from(costCenters)
      .where(
        and(eq(costCenters.name, data.name), eq(costCenters.isDeleted, false))
      )
      .limit(1);

    if (existingCostCenter && existingCostCenter.length > 0) {
      return NextResponse.json(
        { error: "Cost center with this name already exists" },
        { status: 400 }
      );
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

    // Create new cost center
    const newCostCenter = await db
      .insert(costCenters)
      .values({
        name: data.name,
        description: data.description,
        budget: data.budget,
        departmentId: data.departmentId,
        createdAt: new Date(),
        updatedAt: new Date(),
        isDeleted: false,
      })
      .returning();

    // Get the complete cost center with relations
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
      .where(eq(costCenters.id, newCostCenter[0].id))
      .limit(1);

    // Format dates for the created cost center
    const formattedCostCenter = {
      ...completeCostCenter[0],
      createdAt: completeCostCenter[0].createdAt.toISOString(),
      updatedAt: completeCostCenter[0].updatedAt.toISOString(),
    };

    // Revalidate relevant paths
    revalidatePath("/dashboard/finances/cost-centers");
    revalidatePath("/dashboard/finances");

    return NextResponse.json(formattedCostCenter, { status: 201 });
  } catch (error) {
    console.error("Error creating cost center:", error);
    return NextResponse.json(
      { error: "Failed to create cost center" },
      { status: 500 }
    );
  }
}
