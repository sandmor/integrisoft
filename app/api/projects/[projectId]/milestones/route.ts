import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { milestones } from "@/lib/db/schema";
import { auth } from "@/lib/auth";
import { headers } from "next/headers";

// GET /api/projects/[projectId]/milestones - Get all milestones for a project
export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ projectId: string }> }
) {
  const { projectId } = await params;
  try {
    const session = await auth.api.getSession({
      headers: await headers(),
    });
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Check if project exists and user has access
    const project = await db.query.projects.findFirst({
      where: (projects, { eq }) => eq(projects.id, projectId),
    });

    if (!project) {
      return NextResponse.json({ error: "Project not found" }, { status: 404 });
    }

    // Get all milestones for this project
    const projectMilestones = await db.query.milestones.findMany({
      where: (milestone, { eq }) => eq(milestone.projectId, projectId),
      orderBy: (milestone, { asc }) => [asc(milestone.dueDate)],
    });

    return NextResponse.json(projectMilestones);
  } catch (error) {
    console.error("Error fetching milestones:", error);
    return NextResponse.json(
      { error: "Failed to fetch milestones" },
      { status: 500 }
    );
  }
}

// POST /api/projects/[projectId]/milestones - Create a new milestone for a project
export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ projectId: string }> }
) {
  const { projectId } = await params;
  try {
    const session = await auth.api.getSession({
      headers: await headers(),
    });
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const data = await req.json();

    // Check if project exists and user has access
    const project = await db.query.projects.findFirst({
      where: (projects, { eq }) => eq(projects.id, projectId),
    });

    if (!project) {
      return NextResponse.json({ error: "Project not found" }, { status: 404 });
    }

    if (!data.dueDate) {
      return NextResponse.json(
        { error: "Due date is required" },
        { status: 400 }
      );
    }

    // Create the milestone
    const newMilestone = await db
      .insert(milestones)
      .values({
        projectId,
        name: data.name,
        description: data.description || null,
        dueDate: data.dueDate,
        isCompleted: data.isCompleted || false,
        completedDate: data.completedDate ? new Date(data.completedDate) : null,
      })
      .returning();

    return NextResponse.json(newMilestone[0], { status: 201 });
  } catch (error) {
    console.error("Error creating milestone:", error);
    return NextResponse.json(
      { error: "Failed to create milestone" },
      { status: 500 }
    );
  }
}
