import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { milestones } from "@/lib/db/schema";
import { eq, and, not } from "drizzle-orm";
import { auth } from "@/lib/auth";
import { headers } from "next/headers";

// GET /api/projects/[projectId]/milestones/[milestoneId] - Get a single milestone by ID
export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ projectId: string; milestoneId: string }> }
) {
  const { projectId, milestoneId } = await params;
  try {
    const session = await auth.api.getSession({
      headers: await headers(),
    });
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Check if milestone exists and belongs to the project
    const milestone = await db.query.milestones.findFirst({
      where: (milestone, { eq, and, not }) =>
        and(
          eq(milestone.id, milestoneId),
          eq(milestone.projectId, projectId),
          not(eq(milestone.isDeleted, true))
        ),
    });

    if (!milestone) {
      return NextResponse.json(
        { error: "Milestone not found or does not belong to this project" },
        { status: 404 }
      );
    }

    return NextResponse.json(milestone);
  } catch (error) {
    console.error("Error fetching milestone:", error);
    return NextResponse.json(
      { error: "Failed to fetch milestone" },
      { status: 500 }
    );
  }
}

// PATCH /api/projects/[projectId]/milestones/[milestoneId] - Update a milestone
export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ projectId: string; milestoneId: string }> }
) {
  const { projectId, milestoneId } = await params;
  try {
    const session = await auth.api.getSession({
      headers: await headers(),
    });
    if (!session || !session.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const data = await req.json();

    // Check if milestone exists
    const [existingMilestone] = await db
      .select({ id: milestones.id })
      .from(milestones)
      .where(
        and(
          eq(milestones.projectId, projectId),
          eq(milestones.id, milestoneId),
          not(eq(milestones.isDeleted, true))
        )
      );

    if (!existingMilestone) {
      return NextResponse.json(
        { error: "Milestone not found" },
        { status: 404 }
      );
    }

    // Update milestone
    const [updatedMilestone] = await db
      .update(milestones)
      .set({
        name: data.name,
        description: data.description,
        dueDate: data.dueDate ? new Date(data.dueDate) : undefined,
        completedDate: data.completedDate
          ? new Date(data.completedDate)
          : data.isCompleted === false
          ? null
          : undefined,
        isCompleted: data.isCompleted,
        updatedAt: new Date(),
      })
      .where(eq(milestones.id, milestoneId))
      .returning();

    return NextResponse.json(updatedMilestone);
  } catch (error) {
    console.error("Error updating milestone:", error);
    return NextResponse.json(
      { error: "Failed to update milestone" },
      { status: 500 }
    );
  }
}

// DELETE /api/projects/[projectId]/milestones/[milestoneId] - Delete a milestone (soft delete)
export async function DELETE(
  req: NextRequest,
  { params }: { params: { projectId: string; milestoneId: string } }
) {
  try {
    const session = await auth.api.getSession({
      headers: await headers(),
    });
    if (!session || !session.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const projectId = params.projectId;
    const milestoneId = params.milestoneId;

    // Check if milestone exists
    const [existingMilestone] = await db
      .select({ id: milestones.id })
      .from(milestones)
      .where(
        and(
          eq(milestones.projectId, projectId),
          eq(milestones.id, milestoneId),
          not(eq(milestones.isDeleted, true))
        )
      );

    if (!existingMilestone) {
      return NextResponse.json(
        { error: "Milestone not found" },
        { status: 404 }
      );
    }

    // Soft delete milestone
    await db
      .update(milestones)
      .set({
        isDeleted: true,
        updatedAt: new Date(),
      })
      .where(eq(milestones.id, milestoneId));

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Error deleting milestone:", error);
    return NextResponse.json(
      { error: "Failed to delete milestone" },
      { status: 500 }
    );
  }
}
