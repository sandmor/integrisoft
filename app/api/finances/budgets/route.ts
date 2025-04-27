import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { budgets, costCenters, projects, users } from "@/lib/db/schema";
import { eq, and, gte, lte, or } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { getBudgetList } from "@/lib/actions/finances";
import { validateSession } from "@/lib/permission-handler";

// GET /api/finances/budgets - Get all budgets with filtering, sorting and pagination
export async function GET(req: NextRequest) {
  if (!(await validateSession("read_budgets"))) {
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
      await getBudgetList({
        page,
        pageSize,
        sorts,
        filters,
        dateFrom: dateFrom ?? undefined,
        dateTo: dateTo ?? undefined,
      }),
      {
        status: 200,
      }
    );
  } catch (error) {
    console.error("Error fetching budgets:", error);
    return NextResponse.json(
      { error: "Failed to fetch budgets" },
      { status: 500 }
    );
  }
}

// POST /api/finances/budgets - Create a new budget
export async function POST(req: NextRequest) {
  if (!(await validateSession("write_budgets"))) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  try {
    const data = await req.json();

    // Validate required fields
    if (!data.name || !data.amount || !data.startDate || !data.endDate) {
      return NextResponse.json(
        { error: "Name, amount, start date, and end date are required" },
        { status: 400 }
      );
    }

    // Validate amount
    if (typeof data.amount !== "number" || data.amount <= 0) {
      return NextResponse.json(
        { error: "Amount must be a positive number" },
        { status: 400 }
      );
    }

    // Validate dates
    const startDate = new Date(data.startDate);
    const endDate = new Date(data.endDate);
    if (isNaN(startDate.getTime()) || isNaN(endDate.getTime())) {
      return NextResponse.json(
        { error: "Invalid date format" },
        { status: 400 }
      );
    }

    if (endDate <= startDate) {
      return NextResponse.json(
        { error: "End date must be after start date" },
        { status: 400 }
      );
    }

    // Validate that either projectId or costCenterId is provided
    if (!data.projectId && !data.costCenterId) {
      return NextResponse.json(
        { error: "Either project or cost center must be specified" },
        { status: 400 }
      );
    }

    // Validate project exists if provided
    if (data.projectId) {
      const project = await db
        .select()
        .from(projects)
        .where(
          and(eq(projects.id, data.projectId), eq(projects.isDeleted, false))
        )
        .limit(1);

      if (!project || project.length === 0) {
        return NextResponse.json(
          { error: "Project not found" },
          { status: 400 }
        );
      }
    }

    // Validate cost center exists if provided
    if (data.costCenterId) {
      const costCenter = await db
        .select()
        .from(costCenters)
        .where(
          and(
            eq(costCenters.id, data.costCenterId),
            eq(costCenters.isDeleted, false)
          )
        )
        .limit(1);

      if (!costCenter || costCenter.length === 0) {
        return NextResponse.json(
          { error: "Cost center not found" },
          { status: 400 }
        );
      }
    }

    // Check for overlapping budgets for same project or cost center
    let overlapConditions = and(
      eq(budgets.isDeleted, false),
      or(
        and(lte(budgets.startDate, startDate), gte(budgets.endDate, startDate)),
        and(lte(budgets.startDate, endDate), gte(budgets.endDate, endDate)),
        and(gte(budgets.startDate, startDate), lte(budgets.endDate, endDate))
      )
    );

    // Add project or cost center specific conditions
    if (data.projectId) {
      overlapConditions = and(
        overlapConditions,
        eq(budgets.projectId, data.projectId)
      );
    }

    if (data.costCenterId) {
      overlapConditions = and(
        overlapConditions,
        eq(budgets.costCenterId, data.costCenterId)
      );
    }

    const overlappingBudgets = await db
      .select({
        id: budgets.id,
        name: budgets.name,
        startDate: budgets.startDate,
        endDate: budgets.endDate,
      })
      .from(budgets)
      .where(overlapConditions);

    // If there are overlapping budgets, return a warning but still create the budget
    const hasOverlapping = overlappingBudgets.length > 0;

    // Create new budget
    const newBudget = await db
      .insert(budgets)
      .values({
        name: data.name,
        amount: data.amount,
        description: data.description,
        startDate: new Date(data.startDate),
        endDate: new Date(data.endDate),
        costCenterId: data.costCenterId,
        projectId: data.projectId,
        createdById: data.createdById,
        createdAt: new Date(),
        updatedAt: new Date(),
        isDeleted: false,
      })
      .returning();

    // Fetch the complete budget data with relations
    const completeBudget = await db
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
      .where(eq(budgets.id, newBudget[0].id))
      .limit(1);

    // Add calculated fields
    const budget = {
      ...completeBudget[0],
      spentAmount: 0,
      remainingAmount: completeBudget[0].amount,
      utilizationPercentage: 0,
    };

    // Include warning about overlapping budgets if any
    if (hasOverlapping) {
      // Revalidate relevant paths
      revalidatePath("/dashboard/finances/budgets");
      revalidatePath("/dashboard/finances");

      return NextResponse.json(
        {
          ...budget,
          warning: "This budget overlaps with existing budgets",
          overlappingBudgets: overlappingBudgets,
        },
        { status: 201 }
      );
    }

    // Revalidate relevant paths
    revalidatePath("/dashboard/finances/budgets");
    revalidatePath("/dashboard/finances");

    return NextResponse.json(budget, { status: 201 });
  } catch (error) {
    console.error("Error creating budget:", error);
    return NextResponse.json(
      { error: "Failed to create budget" },
      { status: 500 }
    );
  }
}
