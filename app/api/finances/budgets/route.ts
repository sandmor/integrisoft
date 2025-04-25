import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import {
  budgets,
  costCenters,
  projects,
  users,
  transactions,
} from "@/lib/db/schema";
import {
  count,
  eq,
  and,
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
  or,
} from "drizzle-orm";
import { auth } from "@/lib/auth";
import { sql } from "drizzle-orm";
import { headers } from "next/headers";
import { revalidatePath } from "next/cache";

// GET /api/finances/budgets - Get all budgets with filtering, sorting and pagination
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
    let whereConditions = [eq(budgets.isDeleted, false)];

    filters.forEach((filter) => {
      const [field, value] = filter.split(":");

      if (field === "projectId") {
        whereConditions.push(eq(budgets.projectId, value));
      } else if (field === "costCenterId") {
        whereConditions.push(eq(budgets.costCenterId, value));
      } else if (field === "createdById") {
        whereConditions.push(eq(budgets.createdById, value));
      } else if (field === "amount" && value.includes("-")) {
        const [min, max] = value.split("-");
        if (min) whereConditions.push(gte(budgets.amount, min));
        if (max) whereConditions.push(lte(budgets.amount, max));
      } else if (field === "name") {
        whereConditions.push(like(budgets.name, `%${value}%`));
      } else if (field === "description") {
        whereConditions.push(like(budgets.description, `%${value}%`));
      }
    });

    // Add date range filter if provided
    if (dateFrom) {
      whereConditions.push(gte(budgets.startDate, new Date(dateFrom)));
    }
    if (dateTo) {
      whereConditions.push(lte(budgets.endDate, new Date(dateTo)));
    }

    // Build sort conditions
    const sortFields: Record<string, any> = {
      amount: budgets.amount,
      name: budgets.name,
      startDate: budgets.startDate,
      endDate: budgets.endDate,
      createdAt: budgets.createdAt,
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

    // Default sort by startDate desc if no sort specified
    if (orderBy.length === 0) {
      orderBy.push(desc(budgets.startDate));
    }

    // Get total count for pagination
    const [{ value: totalCount }] = await db
      .select({ value: count() })
      .from(budgets)
      .where(and(...whereConditions));

    // Get paginated budgets with relations
    const budgetsData = await db
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
      .where(and(...whereConditions))
      .orderBy(...orderBy)
      .limit(pageSize)
      .offset(offset);

    // Get spent amount for each budget
    const budgetsWithSpent = await Promise.all(
      budgetsData.map(async (budget) => {
        // Query to get the sum of transaction amounts for this budget's project or cost center
        let whereCondition = and(
          eq(transactions.type, "expense"),
          eq(transactions.isDeleted, false),
          gte(transactions.date, budget.startDate),
          lte(transactions.date, budget.endDate)
        );

        // Add condition for either project or cost center
        if (budget.projectId) {
          whereCondition = and(
            whereCondition,
            eq(transactions.projectId, budget.projectId)
          );
        } else if (budget.costCenterId) {
          whereCondition = and(
            whereCondition,
            eq(transactions.costCenterId, budget.costCenterId)
          );
        }

        const [result] = await db
          .select({
            spentAmount: sql<number>`sum(${transactions.amount})`,
          })
          .from(transactions)
          .where(whereCondition);

        const spentAmount = result?.spentAmount || 0;
        const remainingAmount = Number(budget.amount) - spentAmount;
        const utilizationPercentage =
          (spentAmount / Number(budget.amount)) * 100;

        return {
          ...budget,
          spentAmount,
          remainingAmount,
          utilizationPercentage: parseFloat(utilizationPercentage.toFixed(2)),
        };
      })
    );

    // Calculate page count
    const pageCount = Math.ceil(totalCount / pageSize);

    return NextResponse.json({
      data: budgetsWithSpent,
      totalCount,
      pageCount,
      page,
      pageSize,
    });
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
  try {
    const session = await auth.api.getSession({
      headers: await headers(),
    });
    if (!session || !session.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

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
        createdById: session.user.id,
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
