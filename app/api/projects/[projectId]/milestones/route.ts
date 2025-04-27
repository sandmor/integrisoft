import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { milestones } from "@/lib/db/schema";
import { Milestone, MilestoneCreateInput } from "@/lib/types";
import { revalidatePath } from "next/cache";
import { validateSession } from "@/lib/permission-handler";

// GET /api/projects/[projectId]/milestones - Get all milestones for a project
export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ projectId: string }> }
) {
  if (!(await validateSession("read_projects"))) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const { projectId } = await params;
  try {
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

    // Format the response
    const formattedMilestones: Milestone[] = projectMilestones.map(
      (milestone) => ({
        id: milestone.id,
        name: milestone.name,
        description: milestone.description,
        dueDate: milestone.dueDate ? milestone.dueDate.toISOString() : null,
        completedDate: milestone.completedDate
          ? milestone.completedDate.toISOString()
          : null,
        isCompleted: milestone.isCompleted,
      })
    );

    return NextResponse.json(formattedMilestones);
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
  if (!(await validateSession("write_projects"))) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const { projectId } = await params;
  try {
    const data: MilestoneCreateInput = await req.json();

    // Check if project exists and user has access
    const project = await db.query.projects.findFirst({
      where: (projects, { eq }) => eq(projects.id, projectId),
    });

    if (!project) {
      return NextResponse.json({ error: "Project not found" }, { status: 404 });
    }

    if (!data.name || !data.dueDate) {
      return NextResponse.json(
        { error: "Name and due date are required" },
        { status: 400 }
      );
    }

    // Create the milestone
    const [newMilestone] = await db
      .insert(milestones)
      .values({
        projectId,
        name: data.name,
        description: data.description || null,
        dueDate: new Date(data.dueDate),
        isCompleted: data.isCompleted || false,
        completedDate: data.completedDate ? new Date(data.completedDate) : null,
      })
      .returning();

    // Format the response
    const formattedMilestone: Milestone = {
      id: newMilestone.id,
      name: newMilestone.name,
      description: newMilestone.description,
      dueDate: newMilestone.dueDate ? newMilestone.dueDate.toISOString() : null,
      completedDate: newMilestone.completedDate
        ? newMilestone.completedDate.toISOString()
        : null,
      isCompleted: newMilestone.isCompleted,
    };

    // Revalidate relevant paths
    revalidatePath(`/dashboard/projects/${projectId}`);
    revalidatePath(`/dashboard/projects/${projectId}/milestones`);

    return NextResponse.json(formattedMilestone, { status: 201 });
  } catch (error) {
    console.error("Error creating milestone:", error);
    return NextResponse.json(
      { error: "Failed to create milestone" },
      { status: 500 }
    );
  }
}
